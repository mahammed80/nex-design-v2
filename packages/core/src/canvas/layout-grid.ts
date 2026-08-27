import type { Canvas } from 'canvaskit-wasm'

import type { SkiaRenderer } from '#core/canvas/renderer'
import type { LayoutGrid, SceneNode } from '#core/scene-graph'

function drawSquareGrid(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  grid: LayoutGrid
): void {
  const size = grid.sectionSize > 0 ? grid.sectionSize : 20
  r.auxStroke.setColor(r.ck.Color4f(grid.color.r, grid.color.g, grid.color.b, grid.color.a))
  r.auxStroke.setStrokeWidth(1)

  // Vertical lines
  for (let x = size; x < node.width; x += size) {
    canvas.drawLine(x, 0, x, node.height, r.auxStroke)
  }
  // Horizontal lines
  for (let y = size; y < node.height; y += size) {
    canvas.drawLine(0, y, node.width, y, r.auxStroke)
  }
}

function drawColumnsGrid(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  grid: LayoutGrid
): void {
  const count = grid.count && grid.count > 0 ? grid.count : 12
  const gutter = grid.gutterSize !== undefined ? grid.gutterSize : 20
  const offset = grid.offset !== undefined ? grid.offset : 0
  const alignment = grid.alignment ?? 'STRETCH'

  r.auxFill.setColor(r.ck.Color4f(grid.color.r, grid.color.g, grid.color.b, grid.color.a))

  let colWidth = grid.sectionSize > 0 ? grid.sectionSize : 60
  let startX = offset

  if (alignment === 'STRETCH') {
    const totalGutter = gutter * Math.max(0, count - 1)
    const availableWidth = node.width - offset * 2 - totalGutter
    colWidth = Math.max(1, availableWidth / count)
    startX = offset
  } else if (alignment === 'CENTER') {
    const totalW = count * colWidth + (count - 1) * gutter
    startX = (node.width - totalW) / 2
  } else if (alignment === 'MAX') {
    const totalW = count * colWidth + (count - 1) * gutter
    startX = node.width - offset - totalW
  }

  for (let i = 0; i < count; i++) {
    const x = startX + i * (colWidth + gutter)
    if (x + colWidth <= 0 || x >= node.width) continue
    const rect = r.ck.LTRBRect(
      Math.max(0, x),
      0,
      Math.min(node.width, x + colWidth),
      node.height
    )
    canvas.drawRect(rect, r.auxFill)
  }
}

function drawRowsGrid(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  grid: LayoutGrid
): void {
  const count = grid.count && grid.count > 0 ? grid.count : 12
  const gutter = grid.gutterSize !== undefined ? grid.gutterSize : 20
  const offset = grid.offset !== undefined ? grid.offset : 0
  const alignment = grid.alignment ?? 'STRETCH'

  r.auxFill.setColor(r.ck.Color4f(grid.color.r, grid.color.g, grid.color.b, grid.color.a))

  let rowHeight = grid.sectionSize > 0 ? grid.sectionSize : 40
  let startY = offset

  if (alignment === 'STRETCH') {
    const totalGutter = gutter * Math.max(0, count - 1)
    const availableHeight = node.height - offset * 2 - totalGutter
    rowHeight = Math.max(1, availableHeight / count)
    startY = offset
  } else if (alignment === 'CENTER') {
    const totalH = count * rowHeight + (count - 1) * gutter
    startY = (node.height - totalH) / 2
  } else if (alignment === 'MAX') {
    const totalH = count * rowHeight + (count - 1) * gutter
    startY = node.height - offset - totalH
  }

  for (let i = 0; i < count; i++) {
    const y = startY + i * (rowHeight + gutter)
    if (y + rowHeight <= 0 || y >= node.height) continue
    const rect = r.ck.LTRBRect(
      0,
      Math.max(0, y),
      node.width,
      Math.min(node.height, y + rowHeight)
    )
    canvas.drawRect(rect, r.auxFill)
  }
}

export function drawNodeLayoutGrids(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode
): void {
  if (!node.layoutGrids || node.layoutGrids.length === 0) return

  for (const grid of node.layoutGrids) {
    if (!grid.visible) continue
    if (grid.pattern === 'GRID') {
      drawSquareGrid(r, canvas, node, grid)
    } else if (grid.pattern === 'COLUMNS') {
      drawColumnsGrid(r, canvas, node, grid)
    } else if (grid.pattern === 'ROWS') {
      drawRowsGrid(r, canvas, node, grid)
    }
  }
}
