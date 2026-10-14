import type { CanvasKit, Canvas } from 'canvaskit-wasm'

import type { SkiaRenderer } from '#core/canvas'
import type { RenderColorSpace } from '#core/color/management'
import { computeDescendantVisualBounds } from '#core/geometry'
import { extractExportGraph, findPageId } from '#core/io/subgraph'
import type { SceneGraph } from '#core/scene-graph'

export type RasterExportFormat = 'PNG' | 'JPG' | 'WEBP'
export type ExportFormat = RasterExportFormat | 'SVG'

interface RenderOptions {
  scale: number
  format: ExportFormat
  quality?: number
  colorSpace?: RenderColorSpace
}

function ensureSinglePageSelection(graph: SceneGraph, pageId: string, nodeIds: string[]): boolean {
  return nodeIds.every((nodeId) => findPageId(graph, nodeId) === pageId)
}

function nodeNeedsSceneBackdrop(graph: SceneGraph, nodeId: string): boolean {
  const node = graph.getNode(nodeId)
  if (!node) return false
  if (node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') return true
  if (node.effects.some((effect) => effect.visible && effect.type === 'BACKGROUND_BLUR')) {
    return true
  }
  return node.childIds.some((childId) => nodeNeedsSceneBackdrop(graph, childId))
}

export function computeContentBounds(graph: SceneGraph, nodeIds: string[]) {
  return computeDescendantVisualBounds(
    nodeIds,
    (id) => graph.getNode(id),
    (id) => graph.getAbsolutePosition(id)
  )
}

function ckImageFormat(ck: CanvasKit, format: ExportFormat) {
  switch (format) {
    case 'JPG':
      return ck.ImageFormat.JPEG
    case 'WEBP':
      return ck.ImageFormat.WEBP
    default:
      return ck.ImageFormat.PNG
  }
}

function renderToSurface(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  renderGraph: SceneGraph,
  pageId: string,
  width: number,
  height: number,
  format: ExportFormat,
  quality: number,
  setup: (canvas: Canvas) => void
): Uint8Array | null {
  const surface = ck.MakeSurface(width, height)
  if (!surface) return null

  try {
    const canvas = surface.getCanvas()
    setup(canvas)
    renderer.renderSceneToCanvas(canvas, renderGraph, pageId)
    surface.flush()
    const image = surface.makeImageSnapshot()
    const encoded = image.encodeToBytes(ckImageFormat(ck, format), quality)
    image.delete()
    return encoded ? new Uint8Array(encoded) : null
  } finally {
    surface.delete()
  }
}

export interface NodePixels {
  width: number
  height: number
  /** Unpremultiplied sRGB RGBA, row-major — ready for `new ImageData(...)`. */
  pixels: Uint8Array
}

/**
 * Rasterize one node's frame rectangle (its own width × height, content outside is clipped)
 * to raw pixels. Used by the prototype player, which renders a session copy of the graph:
 * the renderer's per-node picture cache is swapped out for the call so session state never
 * draws the editor's cached pictures (and the editor's cache is left untouched).
 */
export function renderNodeToPixels(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  nodeId: string,
  scale: number
): NodePixels | null {
  const node = graph.getNode(nodeId)
  if (!node || node.width <= 0 || node.height <= 0) return null
  const width = Math.max(1, Math.ceil(node.width * scale))
  const height = Math.max(1, Math.ceil(node.height * scale))
  const surface = ck.MakeSurface(width, height)
  if (!surface) return null

  const editorCache = renderer.nodePictureCache
  const prevViewport = renderer.worldViewport
  renderer.nodePictureCache = new Map()
  renderer.worldViewport = { x: -1e9, y: -1e9, w: 2e9, h: 2e9 }
  try {
    const canvas = surface.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    canvas.scale(scale, scale)
    const parent = node.parentId ? graph.getAbsolutePosition(node.parentId) : { x: 0, y: 0 }
    canvas.translate(-(parent.x + node.x), -(parent.y + node.y))
    renderer.renderNode(canvas, graph, nodeId, {})
    surface.flush()
    const image = surface.makeImageSnapshot()
    const pixels = image.readPixels(0, 0, {
      width,
      height,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: ck.ColorSpace.SRGB
    })
    image.delete()
    return pixels ? { width, height, pixels: new Uint8Array(pixels) } : null
  } finally {
    for (const picture of renderer.nodePictureCache.values()) picture?.delete()
    renderer.nodePictureCache = editorCache
    renderer.worldViewport = prevViewport
    surface.delete()
  }
}

export function renderNodesToImage(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[],
  options: RenderOptions
): Uint8Array | null {
  if (!ensureSinglePageSelection(graph, pageId, nodeIds)) {
    throw new Error('Raster export selection must stay on a single page')
  }

  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const pixelW = Math.ceil(contentW * options.scale)
  const pixelH = Math.ceil(contentH * options.scale)
  if (pixelW <= 0 || pixelH <= 0) return null

  const extracted = extractExportGraph(graph, { scope: 'selection', nodeIds })
  if (!extracted.pageId) return null

  const renderGraph = nodeIds.some((nodeId) => nodeNeedsSceneBackdrop(graph, nodeId))
    ? graph
    : extracted.graph
  const renderPageId = renderGraph === graph ? pageId : extracted.pageId

  const quality = options.quality ?? (options.format === 'PNG' ? 100 : 90)
  return renderToSurface(
    ck,
    renderer,
    renderGraph,
    renderPageId,
    pixelW,
    pixelH,
    options.format,
    quality,
    (canvas) => {
      canvas.clear(ck.TRANSPARENT)
      canvas.scale(options.scale, options.scale)
      canvas.translate(-bounds.minX, -bounds.minY)
    }
  )
}

export function renderThumbnail(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  width: number,
  height: number
): Uint8Array | null {
  const page = graph.getNode(pageId)
  if (!page || page.childIds.length === 0) return null

  let targetChildIds = page.childIds
  const thumbnailNode = page.childIds
    .map((id) => graph.getNode(id))
    .find((n) => n?.isThumbnail === true)
  if (thumbnailNode) {
    targetChildIds = [thumbnailNode.id]
  }

  const bounds = computeContentBounds(graph, targetChildIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const scale = Math.min(width / contentW, height / contentH, 2)

  return renderToSurface(ck, renderer, graph, pageId, width, height, 'PNG', 100, (canvas) => {
    canvas.clear(ck.Color4f(renderer.pageColor.r, renderer.pageColor.g, renderer.pageColor.b, 1))
    const offsetX = (width - contentW * scale) / 2 - bounds.minX * scale
    const offsetY = (height - contentH * scale) / 2 - bounds.minY * scale
    canvas.translate(offsetX, offsetY)
    canvas.scale(scale, scale)
  })
}
