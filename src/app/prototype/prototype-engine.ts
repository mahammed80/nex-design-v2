import { reactive, ref, toRaw } from 'vue'

import { canConnect } from '@nex-design/core/prototype'
import type { SceneNode, Action, Reaction, VariableValue } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { openExternalLink } from '@/app/shell/ui'

import type { NavigationController } from './navigation-controller'
import type { PresentationManager } from './presentation-manager'
import { easingCss } from './transition-engine'

export class StateManager {
  public nodesMap = reactive<Map<string, SceneNode>>(new Map())

  /** Preview-session variable values; the document's variables are never mutated. */
  public variableValues = reactive<Map<string, VariableValue>>(new Map())
  /** Bumped on every session mutation so canvas-rendered screens know to redraw. */
  public version = ref(0)
  private originalVariants = new Map<string, string>()

  constructor(private engine: PrototypeEngine) {}

  initialize() {
    this.originalVariants.clear()
    this.variableValues.clear()
    this.nodesMap.clear()
    for (const [id, node] of this.engine.editor.graph.nodes) {
      this.nodesMap.set(id, structuredClone(node))
    }
    this.version.value++
  }

  /** The session nodes without the reactive proxy, for handing to the CanvasKit renderer. */
  rawNodes(): Map<string, SceneNode> {
    return toRaw(this.nodesMap) as Map<string, SceneNode>
  }

  overrideInstanceVariant(instanceId: string, targetComponentId: string) {
    this.version.value++
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

  setVariableValue(variableId: string, value: VariableValue) {
    this.variableValues.set(variableId, structuredClone(value))
    this.version.value++
  }

  /** Session value if the prototype changed it, else the document's value for the active mode. */
  getVariableValue(variableId: string): VariableValue | undefined {
    if (this.variableValues.has(variableId)) return this.variableValues.get(variableId)
    const graph = this.engine.editor.graph
    const variable = graph.variables.get(variableId)
    if (!variable) return undefined
    const modeId =
      graph.activeMode.get(variable.collectionId) ??
      graph.variableCollections.get(variable.collectionId)?.defaultModeId
    return modeId ? variable.valuesByMode[modeId] : undefined
  }
}

export class TriggerManager {
  private hoverActiveInstances = new Map<string, Set<string>>()
  private pressActiveInstances = new Map<string, Set<string>>()

  constructor(private engine: PrototypeEngine) {}

  private handleHoverStart(nodeId: string, node: SceneNode) {
    const reactions = this.findReactions(node, 'ON_HOVER')
    for (const r of reactions) {
      const changedInstances = this.engine.actionManager.executeReaction(node.id, r)
      if (changedInstances && changedInstances.size > 0) {
        this.hoverActiveInstances.set(nodeId, changedInstances)
      }
    }
  }

  private handleHoverEnd(nodeId: string) {
    const instances = this.hoverActiveInstances.get(nodeId)
    if (instances) {
      for (const instId of instances) {
        this.engine.stateManager.revertInstanceVariant(instId)
      }
      this.hoverActiveInstances.delete(nodeId)
    }
  }

  private handlePressStart(nodeId: string, node: SceneNode) {
    const reactions = this.findReactions(node, 'ON_PRESS')
    for (const r of reactions) {
      const changedInstances = this.engine.actionManager.executeReaction(node.id, r)
      if (changedInstances && changedInstances.size > 0) {
        this.pressActiveInstances.set(nodeId, changedInstances)
      }
    }
  }

  private handlePressEnd(nodeId: string) {
    const instances = this.pressActiveInstances.get(nodeId)
    if (instances) {
      for (const instId of instances) {
        this.engine.stateManager.revertInstanceVariant(instId)
      }
      this.pressActiveInstances.delete(nodeId)
    }
  }

  private fireReactions(node: SceneNode, triggerType: string) {
    const reactions = this.findReactions(node, triggerType)
    for (const r of reactions) {
      this.engine.actionManager.executeReaction(node.id, r)
    }
  }

  handleEvent(nodeId: string, eventType: string) {
    const node = this.engine.stateManager.getNode(nodeId)
    if (!node) return

    if (eventType === 'hover-start') {
      this.handleHoverStart(nodeId, node)
    } else if (eventType === 'hover-end') {
      this.handleHoverEnd(nodeId)
    } else if (eventType === 'press-start') {
      this.handlePressStart(nodeId, node)
    } else if (eventType === 'press-end') {
      this.handlePressEnd(nodeId)
    } else if (eventType === 'click') {
      this.fireReactions(node, 'ON_CLICK')
    } else if (eventType === 'mouse-enter') {
      this.fireReactions(node, 'MOUSE_ENTER')
    } else if (eventType === 'mouse-leave') {
      this.fireReactions(node, 'MOUSE_LEAVE')
    } else if (eventType === 'mouse-down') {
      this.fireReactions(node, 'MOUSE_DOWN')
    } else if (eventType === 'mouse-up') {
      this.fireReactions(node, 'MOUSE_UP')
    } else if (eventType === 'after-delay') {
      this.fireReactions(node, 'AFTER_DELAY')
    } else if (eventType.startsWith('drag-')) {
      const direction = eventType.split('-')[1]
      const reactions = this.findReactions(node, 'ON_DRAG').filter(
        (r) => (r.trigger.direction ?? 'left') === direction.toLowerCase()
      )
      for (const r of reactions) {
        this.engine.actionManager.executeReaction(node.id, r)
      }
    }
  }

  /**
   * Fire ON_KEY_DOWN reactions in the visible subtree of `frameId` that list `code`
   * (a `KeyboardEvent.code`). Returns whether anything handled the key.
   */
  handleKey(frameId: string, code: string): boolean {
    let handled = false
    const visit = (nodeId: string) => {
      const node = this.engine.stateManager.getNode(nodeId)
      if (!node?.visible) return
      for (const reaction of node.reactions ?? []) {
        if (reaction.trigger.type === 'ON_KEY_DOWN' && reaction.trigger.keys?.includes(code)) {
          this.engine.actionManager.executeReaction(node.id, reaction)
          handled = true
        }
      }
      for (const childId of node.childIds) visit(childId)
    }
    visit(frameId)
    return handled
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
        this.executeNavigate(action)
        break
      case 'BACK':
        this.engine.navigationManager.goBack()
        break
      case 'URL':
        if (action.url && isOpenableUrl(action.url)) void openExternalLink(action.url)
        break
      case 'CLOSE':
        this.executeClose()
        break
      case 'OPEN_OVERLAY':
      case 'SWAP_OVERLAY':
        this.executeOverlay(action)
        break
      case 'SCROLL_TO':
        if (action.destinationId)
          this.engine.presentation.state.scrollTargetId = action.destinationId
        break
      case 'CHANGE_TO':
        this.executeChangeTo(sourceNodeId, action, changedInstances)
        break
      case 'SET_VARIABLE':
        this.executeSetVariable(action)
        break
    }
  }

  private executeNavigate(action: Action) {
    if (!action.destinationId) return
    // Navigating replaces the screen; overlays belong to the screen they opened on.
    this.engine.presentation.overlays.splice(0)
    this.engine.navigationManager.navigate(action.destinationId, action.transition)
  }

  private executeClose() {
    if (!this.engine.presentation.closeOverlay()) this.engine.presentation.stopPresentation()
  }

  private executeOverlay(action: Action) {
    if (!action.destinationId) return
    this.engine.presentation.openOverlay(
      action.destinationId,
      action.overlay,
      action.type === 'SWAP_OVERLAY'
    )
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

    if (!instanceNode) return
    const targetId =
      action.destinationId ??
      (action.variantProperties
        ? this.resolveVariant(instanceNode, action.variantProperties)
        : undefined)
    if (targetId) {
      this.engine.stateManager.overrideInstanceVariant(instanceNode.id, targetId)
      changedInstances.add(instanceNode.id)
    }
  }

  /** Find the sibling variant whose properties equal the current ones with `changes` applied. */
  private resolveVariant(instance: SceneNode, changes: Record<string, string>): string | undefined {
    const state = this.engine.stateManager
    const current = instance.componentId ? state.getNode(instance.componentId) : undefined
    const set = current?.parentId ? state.getNode(current.parentId) : undefined
    if (!current || set?.type !== 'COMPONENT_SET') return undefined
    const wanted = { ...current.componentPropertyValues, ...changes }
    for (const childId of set.childIds) {
      const variant = state.getNode(childId)
      if (variant?.type !== 'COMPONENT') continue
      const values = variant.componentPropertyValues
      if (Object.entries(wanted).every(([key, value]) => values[key] === value)) return variant.id
    }
    return undefined
  }

  private executeSetVariable(action: Action) {
    if (!action.variableId || !isVariableValue(action.variableValue)) return
    if (!this.engine.editor.graph.variables.has(action.variableId)) return
    this.engine.stateManager.setVariableValue(action.variableId, action.variableValue)
  }
}

export class ConnectionManager {
  constructor(private engine: PrototypeEngine) {}

  canConnect(sourceId: string, targetId: string, actionType: string): boolean {
    const source = this.engine.editor.graph.getNode(sourceId)
    const target = this.engine.editor.graph.getNode(targetId)
    return canConnect(source, target, actionType)
  }

  createConnection(
    sourceId: string,
    targetId: string,
    triggerType: Reaction['trigger']['type'] = 'ON_CLICK'
  ) {
    this.engine.editor.addConnection(sourceId, targetId, triggerType)
  }
}

export class AnimationManager {
  // No constructor needed — AnimationManager is stateless and engine-independent.

  getEasingCSS(easing: string): string {
    return easingCss(easing)
  }
}

/** Prototype links are document data: only open web and mail links, never `javascript:` etc. */
export function isOpenableUrl(url: string): boolean {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function isVariableValue(value: unknown): value is VariableValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true
  if (!value || typeof value !== 'object') return false
  if ('aliasId' in value) return typeof value.aliasId === 'string'
  return (
    'r' in value &&
    'g' in value &&
    'b' in value &&
    'a' in value &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number' &&
    typeof value.a === 'number'
  )
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
    this.animationManager = new AnimationManager()
    this.stateManager = new StateManager(this)
  }
}
