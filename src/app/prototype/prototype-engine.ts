import { reactive } from 'vue'
import type { SceneNode, Action, Reaction } from '@nex-design/core/scene-graph'
import { canConnect } from '@nex-design/core/prototype'
import type { EditorStore } from '@/app/editor/active-store'
import type { PresentationManager } from './presentation-manager'
import type { NavigationController } from './navigation-controller'

export class StateManager {
  public nodesMap = reactive<Map<string, SceneNode>>(new Map())
  private originalVariants = new Map<string, string>()

  constructor(private engine: PrototypeEngine) {}

  initialize() {
    this.originalVariants.clear()
    this.nodesMap.clear()
    for (const [id, node] of this.engine.editor.graph.nodes) {
      this.nodesMap.set(id, structuredClone(node))
    }
  }

  overrideInstanceVariant(instanceId: string, targetComponentId: string) {
    const instance = this.nodesMap.get(instanceId)
    if (!instance || instance.type !== 'INSTANCE') return

    if (instance.componentId && !this.originalVariants.has(instanceId)) {
      this.originalVariants.set(instanceId, instance.componentId)
    }

    instance.componentId = targetComponentId

    const component = this.nodesMap.get(targetComponentId)
    if (component && component.type === 'COMPONENT') {
      const clearChildren = (id: string) => {
        const n = this.nodesMap.get(id)
        if (!n) return
        for (const cid of n.childIds) {
          clearChildren(cid)
          this.nodesMap.delete(cid)
        }
      }
      for (const cid of instance.childIds) {
        clearChildren(cid)
        this.nodesMap.delete(cid)
      }
      instance.childIds = []

      const cloneNode = (origId: string, parentId: string): string => {
        const orig = this.nodesMap.get(origId)
        if (!orig) return ''
        const newId = `${instanceId}:${origId}`
        const copy = {
          ...structuredClone(orig),
          id: newId,
          parentId,
          childIds: [] as string[]
        }
        this.nodesMap.set(newId, copy)
        for (const cid of orig.childIds) {
          const newCId = cloneNode(cid, newId)
          if (newCId) copy.childIds.push(newCId)
        }
        return newId
      }

      for (const cid of component.childIds) {
        const newCId = cloneNode(cid, instanceId)
        if (newCId) instance.childIds.push(newCId)
      }
    }
  }

  revertInstanceVariant(instanceId: string) {
    const originalComponentId = this.originalVariants.get(instanceId)
    if (originalComponentId) {
      this.overrideInstanceVariant(instanceId, originalComponentId)
      this.originalVariants.delete(instanceId)
    }
  }

  getNode(nodeId: string): SceneNode | undefined {
    return this.nodesMap.get(nodeId)
  }
}

export class TriggerManager {
  private hoverActiveInstances = new Map<string, Set<string>>()
  private pressActiveInstances = new Map<string, Set<string>>()

  constructor(private engine: PrototypeEngine) {}

  handleEvent(nodeId: string, eventType: string) {
    const node = this.engine.stateManager.getNode(nodeId)
    if (!node) return

    if (eventType === 'hover-start') {
      const reactions = this.findReactions(node, 'ON_HOVER')
      for (const r of reactions) {
        const changedInstances = this.engine.actionManager.executeReaction(node.id, r)
        if (changedInstances && changedInstances.size > 0) {
          this.hoverActiveInstances.set(nodeId, changedInstances)
        }
      }
    } else if (eventType === 'hover-end') {
      const instances = this.hoverActiveInstances.get(nodeId)
      if (instances) {
        for (const instId of instances) {
          this.engine.stateManager.revertInstanceVariant(instId)
        }
        this.hoverActiveInstances.delete(nodeId)
      }
    } else if (eventType === 'press-start') {
      const reactions = this.findReactions(node, 'ON_PRESS')
      for (const r of reactions) {
        const changedInstances = this.engine.actionManager.executeReaction(node.id, r)
        if (changedInstances && changedInstances.size > 0) {
          this.pressActiveInstances.set(nodeId, changedInstances)
        }
      }
    } else if (eventType === 'press-end') {
      const instances = this.pressActiveInstances.get(nodeId)
      if (instances) {
        for (const instId of instances) {
          this.engine.stateManager.revertInstanceVariant(instId)
        }
        this.pressActiveInstances.delete(nodeId)
      }
    } else if (eventType === 'click') {
      const reactions = this.findReactions(node, 'ON_CLICK')
      for (const r of reactions) {
        this.engine.actionManager.executeReaction(node.id, r)
      }
    } else if (eventType === 'mouse-enter') {
      const reactions = this.findReactions(node, 'MOUSE_ENTER')
      for (const r of reactions) {
        this.engine.actionManager.executeReaction(node.id, r)
      }
    } else if (eventType === 'mouse-leave') {
      const reactions = this.findReactions(node, 'MOUSE_LEAVE')
      for (const r of reactions) {
        this.engine.actionManager.executeReaction(node.id, r)
      }
    } else if (eventType.startsWith('drag-')) {
      const direction = eventType.split('-')[1]
      const reactions = this.findReactions(node, 'ON_DRAG').filter(
        (r) => ((r.trigger as any).direction || 'left').toLowerCase() === direction.toLowerCase()
      )
      for (const r of reactions) {
        this.engine.actionManager.executeReaction(node.id, r)
      }
    }
  }

  private findReactions(node: SceneNode, type: string): Reaction[] {
    let current: SceneNode | undefined = node
    while (current) {
      if (current.reactions && current.reactions.some((r) => r.trigger.type === type)) {
        return current.reactions.filter((r) => r.trigger.type === type)
      }
      current = current.parentId ? this.engine.stateManager.getNode(current.parentId) : undefined
    }
    return []
  }
}

export class ActionManager {
  constructor(private engine: PrototypeEngine) {}

  executeReaction(sourceNodeId: string, reaction: Reaction): Set<string> {
    const changedInstances = new Set<string>()
    for (const action of reaction.actions) {
      this.executeAction(sourceNodeId, action, changedInstances)
    }
    return changedInstances
  }

  private executeAction(sourceNodeId: string, action: Action, changedInstances: Set<string>) {
    switch (action.type) {
      case 'NAVIGATE':
        if (action.destinationId) {
          const transType = action.transition?.type ?? 'INSTANT'
          const duration = action.transition?.duration ?? 300
          const direction = action.transition?.direction as any
          this.engine.navigationManager.navigate(action.destinationId, transType, direction, duration)
          this.engine.presentation.state.transitionEasing = action.transition?.easing ?? 'EASE_IN_AND_OUT'
        }
        break

      case 'BACK':
        this.engine.navigationManager.goBack()
        break

      case 'CLOSE':
        if (this.engine.presentation.activeOverlay.isOpen) {
          this.engine.presentation.activeOverlay.isOpen = false
        } else {
          this.engine.presentation.stopPresentation()
        }
        break

      case 'OPEN_OVERLAY':
      case 'SWAP_OVERLAY':
        if (action.destinationId) {
          this.engine.presentation.activeOverlay.isOpen = true
          this.engine.presentation.activeOverlay.nodeId = action.destinationId
          this.engine.presentation.activeOverlay.settings = action.overlay
        }
        break

      case 'SCROLL_TO':
        if (action.destinationId) {
          this.engine.presentation.state.scrollTargetId = action.destinationId
        }
        break

      case 'CHANGE_TO':
        this.executeChangeTo(sourceNodeId, action, changedInstances)
        break

      case 'SET_VARIABLE':
        this.executeSetVariable(action)
        break
    }
  }

  private executeChangeTo(sourceNodeId: string, action: Action, changedInstances: Set<string>) {
    let currentId: string | null = sourceNodeId
    let instanceNode: SceneNode | undefined
    while (currentId) {
      const node = this.engine.stateManager.getNode(currentId)
      if (node?.type === 'INSTANCE') {
        instanceNode = node
        break
      }
      currentId = node?.parentId ?? null
    }

    if (instanceNode && action.destinationId) {
      this.engine.stateManager.overrideInstanceVariant(instanceNode.id, action.destinationId)
      changedInstances.add(instanceNode.id)
    }
  }

  private executeSetVariable(action: Action) {
    if (!action.variableId || action.variableValue === undefined) return
    const variable = this.engine.editor.graph.variables.get(action.variableId)
    if (!variable) return
    const collection = this.engine.editor.graph.variableCollections.get(variable.collectionId)
    const modeId =
      this.engine.editor.graph.activeMode.get(variable.collectionId) ?? collection?.defaultModeId
    if (!modeId) return
    variable.valuesByMode[modeId] = structuredClone(action.variableValue) as any
    this.engine.editor.requestRender()
  }
}

export class ConnectionManager {
  constructor(private engine: PrototypeEngine) {}

  canConnect(sourceId: string, targetId: string, actionType: string): boolean {
    const source = this.engine.editor.graph.getNode(sourceId)
    const target = this.engine.editor.graph.getNode(targetId)
    return canConnect(source, target, actionType)
  }

  createConnection(sourceId: string, targetId: string, triggerType: Reaction['trigger']['type'] = 'ON_CLICK') {
    this.engine.editor.addConnection(sourceId, targetId, triggerType)
  }
}

export class AnimationManager {
  constructor(_engine: PrototypeEngine) {}

  getEasingCSS(easing: string): string {
    switch (easing) {
      case 'LINEAR':
        return 'linear'
      case 'EASE_IN':
        return 'cubic-bezier(0.4, 0, 1, 1)'
      case 'EASE_OUT':
        return 'cubic-bezier(0, 0, 0.2, 1)'
      case 'EASE_IN_AND_OUT':
        return 'cubic-bezier(0.4, 0, 0.2, 1)'
      case 'SPRING':
        return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      default:
        return 'ease'
    }
  }
}

export class PrototypeEngine {
  public triggerManager: TriggerManager
  public actionManager: ActionManager
  public connectionManager: ConnectionManager
  public animationManager: AnimationManager
  public stateManager: StateManager
  public navigationManager: NavigationController

  constructor(
    public editor: EditorStore,
    public presentation: PresentationManager
  ) {
    this.navigationManager = presentation.navigationController
    this.triggerManager = new TriggerManager(this)
    this.actionManager = new ActionManager(this)
    this.connectionManager = new ConnectionManager(this)
    this.animationManager = new AnimationManager(this)
    this.stateManager = new StateManager(this)
  }
}
