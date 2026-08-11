import type { SceneNode } from '#core/scene-graph'

import { createLayoutModeActions } from './layout-mode'
import { createNudgeActions } from './nudge'
import type { EditorContext } from './types'
import { createVariableBindingActions } from './variable-bindings'
import { fitComponentSetBounds } from './components/variants'

export function createNodeActions(ctx: EditorContext) {
  const layoutModeActions = createLayoutModeActions(ctx)
  const nudgeActions = createNudgeActions(ctx)
  const variableBindingActions = createVariableBindingActions(ctx)

  function updateNode(id: string, changes: Partial<SceneNode>) {
    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    const node = ctx.graph.getNode(id)
    if (node?.type === 'COMPONENT' && node.parentId) {
      const parent = ctx.graph.getNode(node.parentId)
      if (parent?.type === 'COMPONENT_SET') {
        fitComponentSetBounds(ctx.graph, parent.id)
      }
    }

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const n = ctx.graph.getNode(id)
      if (n) te.rebuildParagraph(n)
    }
  }

  function updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label = 'Update') {
    const node = ctx.graph.getNode(id)
    if (!node) return

    const parentId = node.parentId
    const parent = parentId ? ctx.graph.getNode(parentId) : null
    const isVariant = node.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET'

    const affectedNodeIds: string[] = []
    if (isVariant && parent) {
      affectedNodeIds.push(parent.id)
      for (const cid of parent.childIds) {
        affectedNodeIds.push(cid)
      }
    } else {
      affectedNodeIds.push(id)
    }

    const previousStates = affectedNodeIds.map((nid) => {
      const n = ctx.graph.getNode(nid)
      return {
        id: nid,
        state: n ? { x: n.x, y: n.y, width: n.width, height: n.height } : null
      }
    })

    ctx.graph.updateNode(id, changes)
    ctx.runLayoutForNode(id)

    if (isVariant && parent) {
      fitComponentSetBounds(ctx.graph, parent.id)
    }

    const finalStates = affectedNodeIds.map((nid) => {
      const n = ctx.graph.getNode(nid)
      return {
        id: nid,
        state: n ? { x: n.x, y: n.y, width: n.width, height: n.height } : null
      }
    })

    const te = ctx.getTextEditor()
    if (te && te.nodeId === id) {
      const n = ctx.graph.getNode(id)
      if (n) te.rebuildParagraph(n)
    }

    ctx.undo.push({
      label,
      forward: () => {
        for (const fs of finalStates) {
          if (fs.state) ctx.graph.updateNode(fs.id, fs.state)
        }
        ctx.runLayoutForNode(id)
        if (te && te.nodeId === id) {
          const n = ctx.graph.getNode(id)
          if (n) te.rebuildParagraph(n)
        }
      },
      inverse: () => {
        for (const ps of previousStates) {
          if (ps.state) ctx.graph.updateNode(ps.id, ps.state)
        }
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
