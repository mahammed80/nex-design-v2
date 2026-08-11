import { PrototypeGraph } from '@nex-design/core/prototype'
import type { Action, SceneNode, VariableValue } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

import type { NavigationController } from './navigation-controller'
import type { TransitionDirection } from './types'

export interface InteractionResult {
  handled: boolean
  actionType?: string
  overlayId?: string
  overlaySettings?: unknown
  scrollTargetId?: string
}

export class InteractionEngine {
  constructor(
    private editor: EditorStore,
    private navigationController: NavigationController
  ) {}

  private processNavigationConnection(nodeId: string, triggerType: string): boolean {
    const pageId = this.editor.state.currentPageId
    const protoGraph = new PrototypeGraph(this.editor.graph, pageId)
    const outgoing = protoGraph.outgoing(nodeId)
    const conn = outgoing.find((c) => c.triggerType === triggerType)
    if (!conn) return false

    const sourceNode = this.editor.graph.getNode(nodeId)
    const reaction = sourceNode?.reactions?.find((r) => r.trigger.type === triggerType)
    const action = reaction?.actions.find((a) => a.type === 'NAVIGATE')
    if (!action) return false

    const transitionType = action.transition?.type ?? 'INSTANT'
    const transitionDirection = (
      action.transition as { direction?: TransitionDirection } | undefined
    )?.direction
    const duration = action.transition?.duration ?? 300
    this.navigationController.navigate(
      conn.targetNodeId,
      transitionType,
      transitionDirection,
      duration
    )
    return true
  }

  private processDirectReactionAction(
    nodeId: string,
    triggerType: string
  ): boolean | 'CLOSE' | InteractionResult {
    const node = this.editor.graph.getNode(nodeId)
    if (!node) return false
    const reaction = node.reactions?.find((r) => r.trigger.type === triggerType)
    if (!reaction) return false

    for (const action of reaction.actions) {
      const result = this.executeAction(action, node)
      if (result) return result
    }
    return false
  }

  private executeAction(
    action: Action,
    node: SceneNode
  ): boolean | 'CLOSE' | InteractionResult | undefined {
    switch (action.type) {
      case 'BACK':
        this.navigationController.goBack()
        return true
      case 'CLOSE':
        return 'CLOSE'
      case 'OPEN_OVERLAY':
      case 'SWAP_OVERLAY':
        return {
          handled: true,
          actionType: action.type,
          overlayId: action.destinationId,
          overlaySettings: action.overlay
        }
      case 'CHANGE_TO':
        return this.changeInstanceVariant(node, action)
      case 'SET_VARIABLE':
        return this.setVariable(action)
      case 'SCROLL_TO':
        return action.destinationId
          ? { handled: true, actionType: action.type, scrollTargetId: action.destinationId }
          : undefined
      default:
        return undefined
    }
  }

  private changeInstanceVariant(node: SceneNode, action: Action): boolean | undefined {
    if (node.type !== 'INSTANCE' || !action.variantProperties) return undefined
    for (const [propertyName, value] of Object.entries(action.variantProperties)) {
      this.editor.switchInstanceVariant(node.id, propertyName, value)
    }
    return true
  }

  private setVariable(action: Action): boolean | undefined {
    if (!action.variableId || !isVariableValue(action.variableValue)) return undefined
    const variable = this.editor.graph.variables.get(action.variableId)
    if (!variable) return undefined
    const collection = this.editor.graph.variableCollections.get(variable.collectionId)
    const modeId =
      this.editor.graph.activeMode.get(variable.collectionId) ?? collection?.defaultModeId
    if (!modeId) return undefined
    variable.valuesByMode[modeId] = structuredClone(action.variableValue)
    this.editor.requestRender()
    return true
  }

  handleInteraction(nodeId: string, triggerType: string): boolean | 'CLOSE' | InteractionResult {
    const navHandled = this.processNavigationConnection(nodeId, triggerType)
    if (navHandled) return true
    return this.processDirectReactionAction(nodeId, triggerType)
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
