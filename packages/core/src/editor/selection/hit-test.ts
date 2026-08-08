import type { EditorContext } from '#core/editor/types'
import { PrototypeGraph } from '#core/prototype'
import type { SceneNode } from '#core/scene-graph'

export function createSelectionHitTestActions(
  ctx: EditorContext,
  select: (ids: string[], additive?: boolean) => void,
  clearSelection: () => void
) {
  function hitTestAtPoint(cx: number, cy: number, deep = false): SceneNode | null {
    const renderer = ctx.getRenderer()
    if (!renderer) return null
    const scopeId = ctx.state.enteredContainerId
    if (scopeId) {
      const scopeNode = ctx.graph.getNode(scopeId)
      if (!scopeNode) {
        ctx.state.enteredContainerId = null
      } else {
        const abs = ctx.graph.getAbsolutePosition(scopeId)
        const lx = cx - abs.x
        const ly = cy - abs.y
        return deep ? ctx.graph.hitTestDeep(lx, ly, scopeId) : ctx.graph.hitTest(lx, ly, scopeId)
      }
    }
    return deep
      ? ctx.graph.hitTestDeep(cx, cy, ctx.state.currentPageId)
      : ctx.graph.hitTest(cx, cy, ctx.state.currentPageId)
  }

  function selectAtPoint(cx: number, cy: number) {
    if (ctx.state.mode === 'PROTOTYPE') {
      const protoGraph = new PrototypeGraph(ctx.graph, ctx.state.currentPageId)
      const hitConn = protoGraph.hitTestAtPoint(cx, cy, 8 / ctx.state.zoom)
      if (hitConn) {
        if (!ctx.state.selectedIds.has(hitConn.connection.id)) {
          select([hitConn.connection.id])
        }
        return
      }
    }
    const hit = hitTestAtPoint(cx, cy, ctx.state.mode === 'PROTOTYPE')
    if (hit) {
      if (!ctx.state.selectedIds.has(hit.id)) select([hit.id])
    } else {
      clearSelection()
    }
  }

  return { hitTestAtPoint, selectAtPoint }
}
