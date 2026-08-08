import type { SceneNode } from '#core/scene-graph'

import { createLayoutModeActions } from './layout-mode'
import { createNudgeActions } from './nudge'
import type { EditorContext } from './types'
import { createVariableBindingActions } from './variable-bindings'

export function createNodeActions(ctx: EditorContext) {
  const layoutModeActions = createLayoutModeActions(ctx)
  const nudgeActions = createNudgeActions(ctx)
  const variableBindingActions = createVariableBindingActions(ctx)

  function updateNode(id: string, changes: Partial<SceneNode>) {
    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const node = ctx.graph.getNode(id)
      if (node) te.rebuildParagraph(node)
    }
  }

  function updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label = 'Update') {
    const node = ctx.graph.getNode(id)
    if (!node) return
    const previous = Object.fromEntries(
      (Object.keys(changes) as (keyof SceneNode)[]).map((key) => [key, node[key]])
    ) as Partial<SceneNode>
    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const n = ctx.graph.getNode(id)
      if (n) te.rebuildParagraph(n)
    }

    ctx.undo.push({
      label,
      forward: () => {
        ctx.graph.updateNode(id, changes)
        ctx.runLayoutForNode(id)
        if (te && te.nodeId === id) {
          const n = ctx.graph.getNode(id)
          if (n) te.rebuildParagraph(n)
        }
      },
      inverse: () => {
        ctx.graph.updateNode(id, previous)
        ctx.runLayoutForNode(id)
        if (te && te.nodeId === id) {
          const n = ctx.graph.getNode(id)
          if (n) te.rebuildParagraph(n)
        }
      }
    })
    ctx.requestRender()
  }

  return {
    updateNode,
    updateNodeWithUndo,
    ...layoutModeActions,
    ...variableBindingActions,
    ...nudgeActions
  }
}
