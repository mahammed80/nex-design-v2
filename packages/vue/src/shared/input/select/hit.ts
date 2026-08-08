import type { Editor } from '@nex-design/core/editor'
import type { SceneNode } from '@nex-design/core/scene-graph'

import type { HitTestFns } from '#vue/shared/input/select'

export function resolveHit(
  cx: number,
  cy: number,
  editor: Editor,
  fns: HitTestFns
): SceneNode | null {
  const titleHit =
    fns.hitTestFrameTitle(cx, cy) ??
    fns.hitTestSectionTitle(cx, cy) ??
    fns.hitTestComponentLabel(cx, cy)
  if (titleHit) return titleHit

  if (editor.state.mode === 'PROTOTYPE') {
    const deepHit = editor.graph.hitTestDeep(cx, cy, editor.state.currentPageId)
    if (deepHit) return deepHit
  }

  const deepHit = fns.hitTestInScope(cx, cy, true)
  if (deepHit) {
    let curr: SceneNode | undefined = deepHit
    while (curr) {
      if (editor.state.selectedIds.has(curr.id)) {
        return curr
      }
      curr = curr.parentId ? editor.graph.getNode(curr.parentId) : undefined
    }
  }

  const hit = fns.hitTestInScope(cx, cy, false)
  if (hit) return hit

  const scopeId = editor.state.enteredContainerId
  if (!scopeId) return null

  if (fns.isInsideContainerBounds(cx, cy, scopeId)) {
    editor.clearSelection()
    return null
  }

  editor.exitContainer()
  const afterExit = fns.hitTestInScope(cx, cy, false)
  if (afterExit) return afterExit

  if (editor.state.enteredContainerId) {
    editor.exitContainer()
  }
  return null
}
