import type { Canvas } from 'canvaskit-wasm'

import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

function applyMaskClipping(
  r: SkiaRenderer,
  canvas: Canvas,
  maskNode: SceneNode
): void {
  const rect = r.ck.LTRBRect(
    maskNode.x,
    maskNode.y,
    maskNode.x + maskNode.width,
    maskNode.y + maskNode.height
  )

  if (maskNode.type === 'ELLIPSE') {
    const rx = maskNode.width / 2
    const ry = maskNode.height / 2
    const rrect = r.ck.RRectXY(rect, rx, ry)
    canvas.clipRRect(rrect, r.ck.ClipOp.Intersect, true)
  } else if (maskNode.cornerRadius > 0) {
    const rrect = r.ck.RRectXY(rect, maskNode.cornerRadius, maskNode.cornerRadius)
    canvas.clipRRect(rrect, r.ck.ClipOp.Intersect, true)
  } else {
    canvas.clipRect(rect, r.ck.ClipOp.Intersect, true)
  }
}

export function renderChildrenWithMasks(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  childIds: string[],
  overlays: RenderOverlays
): void {
  let maskIndex = -1
  for (let i = 0; i < childIds.length; i++) {
    const child = graph.getNode(childIds[i])
    if (child && child.visible && child.isMask) {
      maskIndex = i
      break
    }
  }

  // No masks present
  if (maskIndex === -1 || r.outlineMode) {
    for (const childId of childIds) {
      r.renderNode(canvas, graph, childId, overlays)
    }
    return
  }

  // Render children before the mask normally
  for (let i = 0; i < maskIndex; i++) {
    r.renderNode(canvas, graph, childIds[i], overlays)
  }

  // Render mask and its target siblings within a clipped layer
  const maskNode = graph.getNode(childIds[maskIndex])
  if (maskNode) {
    canvas.save()
    applyMaskClipping(r, canvas, maskNode)

    // Render masked sibling layers above the mask
    for (let i = maskIndex + 1; i < childIds.length; i++) {
      r.renderNode(canvas, graph, childIds[i], overlays)
    }
    canvas.restore()
  }
}
