import type { Editor } from '@nex-design/core/editor'
import { computeSelectionBounds, computeSnap } from '@nex-design/core/scene-graph'
import type { SceneNode } from '@nex-design/core/scene-graph'

import type { DragMove } from '#vue/shared/input/types'

export function applyMoveSnap(
  d: DragMove,
  dx: number,
  dy: number,
  editor: Editor
): { dx: number; dy: number } {
  const selectedNodes: SceneNode[] = []
  for (const [id, orig] of d.originals) {
    const node = editor.graph.getNode(id)
    if (node) {
      const abs = editor.graph.getAbsolutePosition(id)
      const parentAbs = node.parentId
        ? editor.graph.getAbsolutePosition(node.parentId)
        : { x: 0, y: 0 }
      selectedNodes.push({
        ...node,
        x: abs.x - parentAbs.x - node.x + orig.x + dx,
        y: abs.y - parentAbs.y - node.y + orig.y + dy
      })
    }
  }

  const bounds = computeSelectionBounds(selectedNodes)
  if (!bounds) return { dx, dy }

  const firstId = [...d.originals.keys()][0]
  const firstNode = editor.graph.getNode(firstId)
  const parentId = firstNode?.parentId ?? editor.state.currentPageId
  const siblings = editor.graph.getChildren(parentId)
  const parentAbs = !editor.isTopLevel(parentId)
    ? editor.graph.getAbsolutePosition(parentId)
    : { x: 0, y: 0 }
  const absTargets = siblings.map((node) => ({
    ...node,
    x: node.x + parentAbs.x,
    y: node.y + parentAbs.y
  }))
  const absBounds = {
    x: bounds.x + parentAbs.x,
    y: bounds.y + parentAbs.y,
    width: bounds.width,
    height: bounds.height
  }
  const snap = computeSnap(editor.state.selectedIds, absBounds, absTargets)
  let finalDx = dx + snap.dx
  let finalDy = dy + snap.dy
  const finalGuides = [...snap.guides]

  if (editor.state.guidesVisible && editor.state.guides.length > 0) {
    const SNAP_THRESHOLD = 5
    let bestGuideDx = Infinity
    let bestGuideDy = Infinity
    let bestGuideXPosition = 0
    let bestGuideYPosition = 0

    const m = {
      left: absBounds.x,
      right: absBounds.x + absBounds.width,
      centerX: absBounds.x + absBounds.width / 2,
      top: absBounds.y,
      bottom: absBounds.y + absBounds.height,
      centerY: absBounds.y + absBounds.height / 2
    }

    for (const g of editor.state.guides) {
      if (g.type === 'horizontal') {
        const yPairs = [m.top, m.bottom, m.centerY]
        for (const mVal of yPairs) {
          const d = g.value - (mVal + finalDy)
          if (Math.abs(d) < SNAP_THRESHOLD && Math.abs(d) < Math.abs(bestGuideDy)) {
            bestGuideDy = d
            bestGuideYPosition = g.value
          }
        }
      } else {
        const xPairs = [m.left, m.right, m.centerX]
        for (const mVal of xPairs) {
          const d = g.value - (mVal + finalDx)
          if (Math.abs(d) < SNAP_THRESHOLD && Math.abs(d) < Math.abs(bestGuideDx)) {
            bestGuideDx = d
            bestGuideXPosition = g.value
          }
        }
      }
    }

    if (Math.abs(bestGuideDx) <= SNAP_THRESHOLD) {
      finalDx += bestGuideDx
      finalGuides.push({
        axis: 'x',
        position: bestGuideXPosition,
        from: absBounds.y + finalDy,
        to: absBounds.y + finalDy + absBounds.height
      })
    }
    if (Math.abs(bestGuideDy) <= SNAP_THRESHOLD) {
      finalDy += bestGuideDy
      finalGuides.push({
        axis: 'y',
        position: bestGuideYPosition,
        from: absBounds.x + finalDx,
        to: absBounds.x + finalDx + absBounds.width
      })
    }
  }

  editor.setSnapGuides(finalGuides)
  return { dx: finalDx, dy: finalDy }
}
