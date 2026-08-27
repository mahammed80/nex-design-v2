import type { Canvas } from 'canvaskit-wasm'

import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import { getAbsolutePosition } from '#core/canvas/coordinate'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

const MEASURE_RED = [0.95, 0.31, 0.12, 1.0] // #F24E1E Figma red
const MEASURE_TEXT_BG = [0.95, 0.31, 0.12, 1.0]
const MEASURE_PROJECTION = [0.95, 0.31, 0.12, 0.35]

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

  r.auxFill.setColor(r.ck.Color4f(MEASURE_TEXT_BG[0], MEASURE_TEXT_BG[1], MEASURE_TEXT_BG[2], 1))
  const rect = r.ck.RRectXY(r.ck.LTRBRect(rx, ry, rx + badgeW, ry + badgeH), 3, 3)
  canvas.drawRRect(rect, r.auxFill)

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
  if (Math.abs(distPx) < 0.5) return

  const sx1 = x1 * r.zoom + r.panX
  const sy1 = y1 * r.zoom + r.panY
  const sx2 = x2 * r.zoom + r.panX
  const sy2 = y2 * r.zoom + r.panY

  r.auxStroke.setColor(r.ck.Color4f(MEASURE_RED[0], MEASURE_RED[1], MEASURE_RED[2], 1))
  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setPathEffect(null)

  canvas.drawLine(sx1, sy1, sx2, sy2, r.auxStroke)

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
  drawBadge(r, canvas, `${Math.round(Math.abs(distPx))}`, mx, my)
}

function drawProjectionLine(
  r: SkiaRenderer,
  canvas: Canvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const sx1 = x1 * r.zoom + r.panX
  const sy1 = y1 * r.zoom + r.panY
  const sx2 = x2 * r.zoom + r.panX
  const sy2 = y2 * r.zoom + r.panY

  r.auxStroke.setColor(
    r.ck.Color4f(MEASURE_PROJECTION[0], MEASURE_PROJECTION[1], MEASURE_PROJECTION[2], MEASURE_PROJECTION[3])
  )
  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setPathEffect(null)
  canvas.drawLine(sx1, sy1, sx2, sy2, r.auxStroke)
}

function drawContainerPadding(
  r: SkiaRenderer,
  canvas: Canvas,
  bA: NodeBounds,
  bB: NodeBounds
): void {
  if (bA.top > bB.top) {
    drawMeasureLine(r, canvas, bA.cx, bB.top, bA.cx, bA.top, bA.top - bB.top)
  }
  if (bB.bottom > bA.bottom) {
    drawMeasureLine(r, canvas, bA.cx, bA.bottom, bA.cx, bB.bottom, bB.bottom - bA.bottom)
  }
  if (bA.left > bB.left) {
    drawMeasureLine(r, canvas, bB.left, bA.cy, bA.left, bA.cy, bA.left - bB.left)
  }
  if (bB.right > bA.right) {
    drawMeasureLine(r, canvas, bA.right, bA.cy, bB.right, bA.cy, bB.right - bA.right)
  }
}

function drawHorizontalDistance(
  r: SkiaRenderer,
  canvas: Canvas,
  bA: NodeBounds,
  bB: NodeBounds
): void {
  if (bB.left >= bA.right) {
    const dist = bB.left - bA.right
    const y = Math.max(Math.min(bA.cy, bB.bottom), bB.top)
    if (y < bA.top || y > bA.bottom) drawProjectionLine(r, canvas, bA.right, bA.top, bA.right, y)
    if (y < bB.top || y > bB.bottom) drawProjectionLine(r, canvas, bB.left, bB.top, bB.left, y)
    drawMeasureLine(r, canvas, bA.right, y, bB.left, y, dist)
  } else if (bA.left >= bB.right) {
    const dist = bA.left - bB.right
    const y = Math.max(Math.min(bA.cy, bB.bottom), bB.top)
    if (y < bA.top || y > bA.bottom) drawProjectionLine(r, canvas, bA.left, bA.top, bA.left, y)
    if (y < bB.top || y > bB.bottom) drawProjectionLine(r, canvas, bB.right, bB.top, bB.right, y)
    drawMeasureLine(r, canvas, bB.right, y, bA.left, y, dist)
  }
}

function drawVerticalDistance(
  r: SkiaRenderer,
  canvas: Canvas,
  bA: NodeBounds,
  bB: NodeBounds
): void {
  if (bB.top >= bA.bottom) {
    const dist = bB.top - bA.bottom
    const x = Math.max(Math.min(bA.cx, bB.right), bB.left)
    if (x < bA.left || x > bA.right) drawProjectionLine(r, canvas, bA.left, bA.bottom, x, bA.bottom)
    if (x < bB.left || x > bB.right) drawProjectionLine(r, canvas, bB.left, bB.top, x, bB.top)
    drawMeasureLine(r, canvas, x, bA.bottom, x, bB.top, dist)
  } else if (bA.top >= bB.bottom) {
    const dist = bA.top - bB.bottom
    const x = Math.max(Math.min(bA.cx, bB.right), bB.left)
    if (x < bA.left || x > bA.right) drawProjectionLine(r, canvas, bA.left, bA.top, x, bA.top)
    if (x < bB.left || x > bB.right) drawProjectionLine(r, canvas, bB.left, bB.bottom, x, bB.bottom)
    drawMeasureLine(r, canvas, x, bB.bottom, x, bA.top, dist)
  }
}

export function drawDevModeMeasurements(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: string[],
  overlays: RenderOverlays
): void {
  const isMeasureActive = overlays.mode === 'DEVELOPER' || overlays.altMeasurement === true
  if (!isMeasureActive || selectedIds.length === 0) return

  const selectedNode = graph.getNode(selectedIds[0])
  if (!selectedNode) return

  const hoveredId = overlays.hoveredNodeId
  let targetNode: SceneNode | null = null
  if (hoveredId && hoveredId !== selectedNode.id) {
    targetNode = graph.getNode(hoveredId) ?? null
  } else if (selectedNode.parentId) {
    targetNode = graph.getNode(selectedNode.parentId) ?? null
  }

  if (!targetNode || targetNode.type === 'CANVAS') return

  const bA = getNodeBounds(graph, selectedNode)
  const bB = getNodeBounds(graph, targetNode)
  const isContainer =
    targetNode.id === selectedNode.parentId ||
    (bB.left <= bA.left && bB.right >= bA.right && bB.top <= bA.top && bB.bottom >= bA.bottom)

  if (isContainer) {
    drawContainerPadding(r, canvas, bA, bB)
    return
  }

  drawHorizontalDistance(r, canvas, bA, bB)
  drawVerticalDistance(r, canvas, bA, bB)
}
