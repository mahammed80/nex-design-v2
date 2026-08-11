import type { Canvas, Paint, CanvasKit, EmbindEnumEntity } from 'canvaskit-wasm'

import {
  PrototypeGraph,
  autoAnchors,
  anchorPoint,
  buildConnectionGeometry,
  arrowDirection,
  type PrototypeConnection,
  type ConnectionAnchor,
  type ConnectionGeometry
} from '#core/prototype'
import type { SceneGraph } from '#core/scene-graph'
import type { Vector, Rect } from '#core/types'

import type { SkiaRenderer } from './renderer'
import type { RenderOverlays } from './renderer/types'

interface OverlayPaints {
  strokePaint: Paint
  hoverStrokePaint: Paint
  selectedStrokePaint: Paint
  unselectedStrokePaint: Paint
  fillPaint: Paint
  selectedFillPaint: Paint
  handleStrokePaint: Paint
  handleSelectedOutlinePaint: Paint
  snapPaint: Paint
  controlLinePaint: Paint
}

const prototypePaintCache = new WeakMap<SkiaRenderer, OverlayPaints>()

function getPrototypePaints(r: SkiaRenderer): OverlayPaints {
  let paints = prototypePaintCache.get(r)
  if (!paints) {
    const ck = r.ck
    paints = {
      strokePaint: createPaint(ck, [56 / 255, 189 / 255, 248 / 255, 1], ck.PaintStyle.Stroke, 2.5),
      hoverStrokePaint: createPaint(
        ck,
        [56 / 255, 189 / 255, 248 / 255, 1],
        ck.PaintStyle.Stroke,
        3.0
      ),
      selectedStrokePaint: createPaint(
        ck,
        [124 / 255, 58 / 255, 237 / 255, 1],
        ck.PaintStyle.Stroke,
        3.5
      ),
      unselectedStrokePaint: createPaint(
        ck,
        [56 / 255, 189 / 255, 248 / 255, 0.5],
        ck.PaintStyle.Stroke,
        2.5
      ),
      fillPaint: createPaint(ck, [56 / 255, 189 / 255, 248 / 255, 1], ck.PaintStyle.Fill),
      selectedFillPaint: createPaint(ck, [124 / 255, 58 / 255, 237 / 255, 1], ck.PaintStyle.Fill),
      handleStrokePaint: createPaint(ck, [1, 1, 1, 1], ck.PaintStyle.Stroke, 1.5),
      handleSelectedOutlinePaint: createPaint(
        ck,
        [124 / 255, 58 / 255, 237 / 255, 1],
        ck.PaintStyle.Stroke,
        1.5
      ),
      snapPaint: createPaint(ck, [56 / 255, 189 / 255, 248 / 255, 0.8], ck.PaintStyle.Stroke, 4),
      controlLinePaint: createPaint(
        ck,
        [124 / 255, 58 / 255, 237 / 255, 0.4],
        ck.PaintStyle.Stroke,
        1.2
      )
    }
    prototypePaintCache.set(r, paints)
  }
  return paints
}

function createPaint(
  ck: CanvasKit,
  color: number[],
  style: EmbindEnumEntity,
  width?: number
): Paint {
  const p = new ck.Paint()
  p.setColor(ck.Color4f(color[0], color[1], color[2], color[3]))
  p.setStyle(style)
  if (width !== undefined) p.setStrokeWidth(width)
  p.setAntiAlias(true)
  return p
}

export function drawPrototypeOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays
): void {
  if (overlays.mode !== 'PROTOTYPE') return

  const ck = r.ck,
    zoom = r.zoom,
    panX = r.panX,
    panY = r.panY
  const toScreen = (p: Vector) => ({ x: p.x * zoom + panX, y: p.y * zoom + panY })

  const paints = getPrototypePaints(r)

  const pageId = r.pageId ?? graph.rootId
  const pageNode = graph.getNode(pageId)
  if (pageNode) {
    drawFlowConnections(r, canvas, graph, pageId, selectedIds, overlays, toScreen, paints)
    if (pageNode.prototypeStartNodeId) {
      drawStartBadge(canvas, graph, pageNode.prototypeStartNodeId, zoom, panX, panY, paints, ck)
    }
  }

  drawSelectedConnectorHandles(canvas, graph, selectedIds, zoom, panX, panY, paints, ck)
  drawCandidateTargetOutlines(r, canvas, graph, pageId, zoom, panX, panY, ck, overlays)
  if (overlays.prototypeDragLine) {
    drawActiveDraggingConnector(canvas, overlays.prototypeDragLine, paints, ck)
  }
  drawSnapIndicators(canvas, graph, overlays, toScreen, paints)
}

function resolveDragAnchors(
  graph: SceneGraph,
  drag: NonNullable<RenderOverlays['prototypeReconnectDrag']>,
  sourceBounds: Rect | null,
  targetBounds: Rect | null,
  sourceAnchor: ConnectionAnchor | null,
  targetAnchor: ConnectionAnchor | null
) {
  let sBounds = sourceBounds,
    tBounds = targetBounds
  let sAnchor = sourceAnchor,
    tAnchor = targetAnchor

  if (drag.endpoint === 'target') {
    if (drag.hoveredNodeId && drag.hoveredSide) {
      tBounds = graph.getAbsoluteBounds(drag.hoveredNodeId)
      const p = { x: drag.currentX, y: drag.currentY }
      let offset =
        drag.hoveredSide === 'LEFT' || drag.hoveredSide === 'RIGHT'
          ? (p.y - tBounds.y) / (tBounds.height || 1)
          : (p.x - tBounds.x) / (tBounds.width || 1)
      offset = Math.max(0, Math.min(1, offset))
      if (Math.abs(offset - 0.5) < 0.1) offset = 0.5
      tAnchor = { side: drag.hoveredSide, offset }
    } else {
      tAnchor = { side: 'LEFT', offset: 0.5 }
      tBounds = null
    }
  } else {
    if (drag.hoveredNodeId && drag.hoveredSide) {
      sBounds = graph.getAbsoluteBounds(drag.hoveredNodeId)
      const p = { x: drag.currentX, y: drag.currentY }
      let offset =
        drag.hoveredSide === 'LEFT' || drag.hoveredSide === 'RIGHT'
          ? (p.y - sBounds.y) / (sBounds.height || 1)
          : (p.x - sBounds.x) / (sBounds.width || 1)
      offset = Math.max(0, Math.min(1, offset))
      if (Math.abs(offset - 0.5) < 0.1) offset = 0.5
      sAnchor = { side: drag.hoveredSide, offset }
    } else {
      sAnchor = { side: 'RIGHT', offset: 0.5 }
      sBounds = null
    }
  }

  return {
    sourceBounds: sBounds,
    targetBounds: tBounds,
    sourceAnchor: sAnchor,
    targetAnchor: tAnchor
  }
}

function drawFlowConnections(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  pageId: string,
  selectedIds: Set<string>,
  overlays: RenderOverlays,
  toScreen: (p: Vector) => Vector,
  paints: OverlayPaints
): void {
  const ck = r.ck
  const protoGraph = new PrototypeGraph(graph, pageId)
  const connections = protoGraph.connections()

  for (const conn of connections) {
    drawSingleConnection(r, canvas, graph, conn, selectedIds, overlays, toScreen, paints, ck)
  }
}

function isConnectionHovered(r: SkiaRenderer, connId: string, overlays: RenderOverlays): boolean {
  if (overlays.hoveredNodeId !== null) return false
  if (overlays.enteredContainerId !== null) return false
  if (overlays.editingTextId !== null) return false
  if (overlays.marquee !== null) return false
  if (overlays.prototypeDragLine !== null) return false
  if (overlays.prototypeReconnectDrag !== null) return false
  if (overlays.snapGuides && overlays.snapGuides.length > 0) return false
  if (overlays.rotationPreview !== null) return false
  if (overlays.dropTargetId !== null) return false
  if (overlays.layoutInsertIndicator !== null) return false
  if (overlays.penState !== null) return false
  if (overlays.nodeEditState !== null) return false
  if (overlays.remoteCursors && overlays.remoteCursors.length > 0) return false

  const state = (r as SkiaRenderer & { state?: { hoveredConnectionId?: string | null } }).state
  return state?.hoveredConnectionId === connId
}

function drawSelectedConnectionHandles(
  canvas: Canvas,
  geom: ConnectionGeometry,
  paints: OverlayPaints,
  _ck: CanvasKit,
  toScreen: (p: Vector) => Vector
): void {
  const p0 = toScreen(geom.kind === 'cubic' ? geom.p0 : geom.points[0])
  const p1 = toScreen(geom.kind === 'cubic' ? geom.p1 : geom.points[geom.points.length - 1])

  canvas.drawCircle(p0.x, p0.y, 5, paints.fillPaint)
  canvas.drawCircle(p0.x, p0.y, 5, paints.handleSelectedOutlinePaint)
  canvas.drawCircle(p1.x, p1.y, 5, paints.fillPaint)
  canvas.drawCircle(p1.x, p1.y, 5, paints.handleSelectedOutlinePaint)

  if (geom.kind === 'cubic') {
    const cp1 = toScreen(geom.cp1)
    const cp2 = toScreen(geom.cp2)

    canvas.drawLine(p0.x, p0.y, cp1.x, cp1.y, paints.controlLinePaint)
    canvas.drawLine(p1.x, p1.y, cp2.x, cp2.y, paints.controlLinePaint)

    canvas.drawCircle(cp1.x, cp1.y, 4, paints.selectedFillPaint)
    canvas.drawCircle(cp1.x, cp1.y, 4, paints.handleStrokePaint)
    canvas.drawCircle(cp2.x, cp2.y, 4, paints.selectedFillPaint)
    canvas.drawCircle(cp2.x, cp2.y, 4, paints.handleStrokePaint)
  }
}

function drawConnectionPath(
  canvas: Canvas,
  geom: ConnectionGeometry,
  drawPaint: Paint,
  ck: CanvasKit,
  toScreen: (p: Vector) => Vector
): void {
  const path = new ck.Path()
  if (geom.kind === 'cubic') {
    const p0 = toScreen(geom.p0)
    const cp1 = toScreen(geom.cp1)
    const cp2 = toScreen(geom.cp2)
    const p1 = toScreen(geom.p1)
    path.moveTo(p0.x, p0.y)
    path.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y)
  } else if (geom.points.length > 0) {
    const first = toScreen(geom.points[0])
    path.moveTo(first.x, first.y)
    for (let i = 1; i < geom.points.length; i++) {
      const pt = toScreen(geom.points[i])
      path.lineTo(pt.x, pt.y)
    }
  }
  canvas.drawPath(path, drawPaint)
  path.delete()
}

function drawArrowHead(
  canvas: Canvas,
  geom: ConnectionGeometry,
  drawFill: Paint,
  ck: CanvasKit,
  toScreen: (p: Vector) => Vector,
  isSelected: boolean
): void {
  const endPoint = toScreen(geom.kind === 'cubic' ? geom.p1 : geom.points[geom.points.length - 1])
  const dir = arrowDirection(geom)
  const angle = Math.atan2(dir.y, dir.x)
  const arrowSize = isSelected ? 9 : 7
  const arrowPath = new ck.Path()
  arrowPath.moveTo(endPoint.x, endPoint.y)
  arrowPath.lineTo(
    endPoint.x - arrowSize * Math.cos(angle - Math.PI / 6),
    endPoint.y - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  arrowPath.lineTo(
    endPoint.x - arrowSize * Math.cos(angle + Math.PI / 6),
    endPoint.y - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  arrowPath.close()
  canvas.drawPath(arrowPath, drawFill)
  arrowPath.delete()
}

interface ResolvedPoints {
  finalSourceAnchor: ConnectionAnchor
  finalTargetAnchor: ConnectionAnchor
  sourcePoint: Vector
  targetPoint: Vector
}

function resolveAnchorsAndPoints(
  graph: SceneGraph,
  _conn: PrototypeConnection,
  isDraggingThis: boolean,
  drag: NonNullable<RenderOverlays['prototypeReconnectDrag']> | null | undefined,
  sourceBounds: Rect | null,
  targetBounds: Rect | null,
  sourceAnchor: ConnectionAnchor | null,
  targetAnchor: ConnectionAnchor | null
): ResolvedPoints {
  let sBounds = sourceBounds,
    tBounds = targetBounds
  let sAnchor = sourceAnchor,
    tAnchor = targetAnchor

  if (isDraggingThis && drag) {
    const resolved = resolveDragAnchors(graph, drag, sBounds, tBounds, sAnchor, tAnchor)
    sBounds = resolved.sourceBounds
    tBounds = resolved.targetBounds
    sAnchor = resolved.sourceAnchor
    tAnchor = resolved.targetAnchor
  }

  const sRect = sBounds ?? { x: 0, y: 0, width: 0, height: 0 }
  const tRect = tBounds ?? { x: 0, y: 0, width: 0, height: 0 }
  const auto = autoAnchors(sRect, tRect)

  const finalSourceAnchor = sAnchor ?? auto.sourceAnchor
  const finalTargetAnchor = tAnchor ?? auto.targetAnchor

  const dragX = drag ? drag.currentX : 0
  const dragY = drag ? drag.currentY : 0

  const sourcePoint = sBounds
    ? anchorPoint(sBounds, finalSourceAnchor.side, finalSourceAnchor.offset)
    : { x: dragX, y: dragY }

  const targetPoint = tBounds
    ? anchorPoint(tBounds, finalTargetAnchor.side, finalTargetAnchor.offset)
    : { x: dragX, y: dragY }

  return { finalSourceAnchor, finalTargetAnchor, sourcePoint, targetPoint }
}

function drawSingleConnection(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  conn: PrototypeConnection,
  selectedIds: Set<string>,
  overlays: RenderOverlays,
  toScreen: (p: Vector) => Vector,
  paints: OverlayPaints,
  ck: CanvasKit
): void {
  const drag = overlays.prototypeReconnectDrag
  const isDraggingThis = !!(drag && drag.connectionId === conn.id)

  const sourceBounds = graph.getAbsoluteBounds(conn.sourceNodeId)
  const targetBounds = graph.getAbsoluteBounds(conn.targetNodeId)

  const { finalSourceAnchor, finalTargetAnchor, sourcePoint, targetPoint } =
    resolveAnchorsAndPoints(
      graph,
      conn,
      isDraggingThis,
      drag,
      sourceBounds,
      targetBounds,
      conn.sourceAnchor,
      conn.targetAnchor
    )

  const geom = buildConnectionGeometry(
    conn,
    finalSourceAnchor,
    finalTargetAnchor,
    sourcePoint,
    targetPoint
  )

  const isSelected = selectedIds.has(conn.id)
  const isHovered = isConnectionHovered(r, conn.id, overlays)

  const drawPaint = isSelected
    ? paints.selectedStrokePaint
    : (isHovered ? paints.hoverStrokePaint : paints.unselectedStrokePaint)

  const drawFill = isSelected ? paints.selectedFillPaint : paints.fillPaint

  drawConnectionPath(canvas, geom, drawPaint, ck, toScreen)
  drawArrowHead(canvas, geom, drawFill, ck, toScreen, isSelected)

  if (isSelected && !isDraggingThis) {
    drawSelectedConnectionHandles(canvas, geom, paints, ck, toScreen)
  }
}

function drawStartBadge(
  canvas: Canvas,
  graph: SceneGraph,
  startNodeId: string,
  zoom: number,
  panX: number,
  panY: number,
  paints: OverlayPaints,
  ck: CanvasKit
): void {
  const startNode = graph.getNode(startNodeId)
  if (startNode) {
    const bounds = graph.getAbsoluteBounds(startNode.id)
    const x = bounds.x * zoom + panX,
      y = bounds.y * zoom + panY
    const badgeW = 60,
      badgeH = 20
    const rect = ck.LTRBRect(x, y - badgeH - 4, x + badgeW, y - 4)
    canvas.drawRRect(ck.RRectXY(rect, 4, 4), paints.fillPaint)

    const playPath = new ck.Path()
    const px = x + 8,
      py = y - badgeH / 2 - 4
    playPath.moveTo(px, py - 4)
    playPath.lineTo(px + 6, py)
    playPath.lineTo(px, py + 4)
    playPath.close()
    canvas.drawPath(playPath, paints.handleStrokePaint)
    playPath.delete()
  }
}

function drawSelectedConnectorHandles(
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  zoom: number,
  panX: number,
  panY: number,
  paints: OverlayPaints,
  ck: CanvasKit
): void {
  for (const selectedId of selectedIds) {
    const node = graph.getNode(selectedId)
    if (!node || node.type === 'CANVAS') continue

    const bounds = graph.getAbsoluteBounds(selectedId)
    const rx = (bounds.x + bounds.width) * zoom + panX + 8,
      ry = (bounds.y + bounds.height / 2) * zoom + panY
    canvas.drawCircle(rx, ry, 7, paints.fillPaint)

    const plusPath = new ck.Path()
    plusPath.moveTo(rx - 4, ry)
    plusPath.lineTo(rx + 4, ry)
    plusPath.moveTo(rx, ry - 4)
    plusPath.lineTo(rx, ry + 4)
    canvas.drawPath(plusPath, paints.handleStrokePaint)
    plusPath.delete()

    const lx = bounds.x * zoom + panX - 8,
      ly = (bounds.y + bounds.height / 2) * zoom + panY
    canvas.drawCircle(lx, ly, 7, paints.fillPaint)

    const plusPath2 = new ck.Path()
    plusPath2.moveTo(lx - 4, ly)
    plusPath2.lineTo(lx + 4, ly)
    plusPath2.moveTo(lx, ly - 4)
    plusPath2.lineTo(lx, ly + 4)
    canvas.drawPath(plusPath2, paints.handleStrokePaint)
    plusPath2.delete()
  }
}

function drawCandidateTargetOutlines(
  _r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  pageId: string,
  zoom: number,
  panX: number,
  panY: number,
  ck: CanvasKit,
  overlays: RenderOverlays
): void {
  const isDragging = !!overlays.prototypeDragLine || !!overlays.prototypeReconnectDrag
  if (isDragging) {
    const candidatePaint = new ck.Paint()
    candidatePaint.setColor(ck.Color4f(56 / 255, 189 / 255, 248 / 255, 0.4))
    candidatePaint.setStyle(ck.PaintStyle.Stroke)
    candidatePaint.setStrokeWidth(1.5)

    const screens = graph
      .getChildren(pageId)
      .filter((n) => n.type === 'FRAME' || n.type === 'SECTION' || n.type === 'COMPONENT')
    for (const scr of screens) {
      const bounds = graph.getAbsoluteBounds(scr.id)
      const rx = bounds.x * zoom + panX,
        ry = bounds.y * zoom + panY,
        rw = bounds.width * zoom,
        rh = bounds.height * zoom
      const rect = ck.LTRBRect(rx, ry, rx + rw, ry + rh)
      canvas.drawRect(rect, candidatePaint)
    }
    candidatePaint.delete()
  }
}

function drawActiveDraggingConnector(
  canvas: Canvas,
  dragLine: NonNullable<RenderOverlays['prototypeDragLine']>,
  paints: OverlayPaints,
  ck: CanvasKit
): void {
  const { startX, startY, endX, endY } = dragLine
  const dx = Math.abs(endX - startX)
  const cp1x = startX + dx * 0.4,
    cp1y = startY,
    cp2x = endX - dx * 0.4,
    cp2y = endY

  const path = new ck.Path()
  path.moveTo(startX, startY)
  path.cubicTo(cp1x, cp1y, cp2x, cp2y, endX, endY)
  canvas.drawPath(path, paints.strokePaint)

  const angle = Math.atan2(endY - cp2y, endX - cp2x)
  const arrowSize = 7
  const arrowPath = new ck.Path()
  arrowPath.moveTo(endX, endY)
  arrowPath.lineTo(
    endX - arrowSize * Math.cos(angle - Math.PI / 6),
    endY - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  arrowPath.lineTo(
    endX - arrowSize * Math.cos(angle + Math.PI / 6),
    endY - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  arrowPath.close()
  canvas.drawPath(arrowPath, paints.fillPaint)

  path.delete()
  arrowPath.delete()
}

function drawSnapIndicators(
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays,
  toScreen: (p: Vector) => Vector,
  paints: OverlayPaints
): void {
  const drag = overlays.prototypeReconnectDrag ?? overlays.prototypeDragLine
  if (!drag?.hoveredNodeId || !drag.hoveredSide) return
  const b = graph.getAbsoluteBounds(drag.hoveredNodeId)
  const s = drag.hoveredSide
  const p1 = toScreen({
    x: s === 'RIGHT' ? b.x + b.width : b.x,
    y: s === 'BOTTOM' ? b.y + b.height : b.y
  })
  const p2 = toScreen({
    x: s === 'LEFT' ? b.x : b.x + b.width,
    y: s === 'TOP' ? b.y : b.y + b.height
  })
  canvas.drawLine(p1.x, p1.y, p2.x, p2.y, paints.snapPaint)
}
