import { PrototypeGraph } from '@nex-design/core/prototype'

import type { EditorStore } from '@/app/editor/active-store'

import type { NavigationController } from './navigation-controller'

export class InteractionEngine {
  constructor(
    private editor: EditorStore,
    private navigationController: NavigationController
  ) {}

  handleInteraction(nodeId: string, triggerType: string): boolean | 'CLOSE' {
    const pageId = this.editor.state.currentPageId
    const protoGraph = new PrototypeGraph(this.editor.graph, pageId)
    const outgoing = protoGraph.outgoing(nodeId)
    const conn = outgoing.find((c) => c.triggerType === triggerType)

    if (conn) {
      const sourceNode = this.editor.graph.getNode(nodeId)
      const reaction = sourceNode?.reactions?.find((r) => r.trigger.type === triggerType)
      const action = reaction?.actions.find((a) => a.type === 'NAVIGATE')

      if (action) {
        const transitionType = action.transition?.type ?? 'INSTANT'
        const transitionDirection = (action.transition as any)?.direction
        const duration = action.transition?.duration ?? 300
        this.navigationController.navigate(
          conn.targetNodeId,
          transitionType,
          transitionDirection,
          duration
        )
        return true
      }
    }

    // Fallback for special actions defined directly in node reactions (e.g. BACK or CLOSE)
    const node = this.editor.graph.getNode(nodeId)
    if (node?.reactions) {
      const reaction = node.reactions.find((r) => r.trigger.type === triggerType)
      if (reaction) {
        for (const action of reaction.actions) {
          if (action.type === 'BACK') {
            this.navigationController.goBack()
            return true
          } else if (action.type === 'CLOSE') {
            return 'CLOSE'
          }
        }
      }
    }

    return false
  }
}
