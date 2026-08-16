import type { Canvas } from 'canvaskit-wasm'

import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import { getAbsolutePosition } from '#core/canvas/coordinate'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

const DEV_RED = [0.95, 0.31, 0.12, 1.0] // #F24E1E Figma red
const DEV_TEXT_BG = [0.95, 0.31, 0.12, 1.0]

interface NodeBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  cx: number
  cy: number
}

function getNodeBounds(graph: SceneGraph, node: SceneNode): NodeBounds {
  const abs = getAbsolutePosition(node, graph)
  return {
    left: abs.x,
    top: abs.y,
    right: abs.x + node.width,
    bottom: abs.y + node.height,
    width: node.width,
    height: node.height,
    cx: abs.x + node.width / 2,
    cy: abs.y + node.height / 2
  }
}

function drawBadge(
  r: SkiaRenderer,
  canvas: Canvas,
  text: string,
  x: number,
  y: number
): void {
  if (!r.sizeFont) return

  const font = r.sizeFont
  const glyphs = font.getGlyphIDs(text)
  const widths = font.getGlyphWidths(glyphs)
  let textWidth = 0
  for (const w of widths) textWidth += w

  const padX = 4
  const badgeW = textWidth + padX * 2
  const badgeH = 14

  const rx = x - badgeW / 2
  const ry = y - badgeH / 2

  // Draw background pill
  r.auxFill.setColor(r.ck.Color4f(DEV_TEXT_BG[0], DEV_TEXT_BG[1], DEV_TEXT_BG[2], 1))
  const rect = r.ck.RRectXY(r.ck.LTRBRect(rx, ry, rx + badgeW, ry + badgeH), 3, 3)
  canvas.drawRRect(rect, r.auxFill)

  // Draw text
  r.auxStroke.setColor(r.ck.Color4f(1, 1, 1, 1))
  r.auxFill.setColor(r.ck.Color4f(1, 1, 1, 1))
  canvas.drawText(text, rx + padX, ry + badgeH - 3, r.auxFill, font)
}

function drawMeasureLine(
  r: SkiaRenderer,
  canvas: Canvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  distPx: number
): void {
  const sx1 = x1 * r.zoom + r.panX
  const sy1 = y1 * r.zoom + r.panY
  const sx2 = x2 * r.zoom + r.panX
  const sy2 = y2 * r.zoom + r.panY

  r.auxStroke.setColor(r.ck.Color4f(DEV_RED[0], DEV_RED[1], DEV_RED[2], 1))
  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setPathEffect(null)

  canvas.drawLine(sx1, sy1, sx2, sy2, r.auxStroke)

  // Tick caps at line ends
  const isHoriz = Math.abs(y2 - y1) < 0.1
  const tickLen = 4
  if (isHoriz) {
    canvas.drawLine(sx1, sy1 - tickLen, sx1, sy1 + tickLen, r.auxStroke)
    canvas.drawLine(sx2, sy2 - tickLen, sx2, sy2 + tickLen, r.auxStroke)
  } else {
    canvas.drawLine(sx1 - tickLen, sy1, sx1 + tickLen, sy1, r.auxStroke)
    canvas.drawLine(sx2 - tickLen, sy2, sx2 + tickLen, sy2, r.auxStroke)
  }

  const mx = (sx1 + sx2) / 2
  const my = (sy1 + sy2) / 2
  drawBadge(r, canvas, `${Math.round(distPx)}`, mx, my)
}

export function drawDevModeMeasurements(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: string[],
  overlays: RenderOverlays
): void {
  if (overlays.mode !== 'DEVELOPER' || selectedIds.length === 0) return

  const selectedNode = graph.getNode(selectedIds[0])
  if (!selectedNode) return

  const hoveredId = overlays.hoveredNodeId
  if (!hoveredId || hoveredId === selectedNode.id) return

  const hoveredNode = graph.getNode(hoveredId)
  if (!hoveredNode) return

  const bA = getNodeBounds(graph, selectedNode)
  const bB = getNodeBounds(graph, hoveredNode)

  // Horizontal measurement
  if (bB.left >= bA.right) {
    const dist = bB.left - bA.right
    const y = Math.max(Math.min(bA.cy, bB.bottom), bB.top)
    drawMeasureLine(r, canvas, bA.right, y, bB.left, y, dist)
  } else if (bA.left >= bB.right) {
    const dist = bA.left - bB.right
    const y = Math.max(Math.min(bA.cy, bB.bottom), bB.top)
    drawMeasureLine(r, canvas, bB.right, y, bA.left, y, dist)
  }

  // Vertical measurement
  if (bB.top >= bA.bottom) {
    const dist = bB.top - bA.bottom
    const x = Math.max(Math.min(bA.cx, bB.right), bB.left)
    drawMeasureLine(r, canvas, x, bA.bottom, x, bB.top, dist)
  } else if (bA.top >= bB.bottom) {
    const dist = bA.top - bB.bottom
    const x = Math.max(Math.min(bA.cx, bB.right), bB.left)
    drawMeasureLine(r, canvas, x, bB.bottom, x, bA.top, dist)
  }
}
