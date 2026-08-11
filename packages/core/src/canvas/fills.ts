import type { Canvas, Paint, Shader, BlendMode } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph, Fill } from '#core/scene-graph'

import { IMAGE_FILTERS_SHADER } from './image-filter-shader'
import type { SkiaRenderer } from './renderer'

export function drawNodeFill(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  rect: Float32Array,
  hasRadius: boolean,
  fill?: Fill
): void {
  switch (node.type) {
    case 'VECTOR': {
      const fg = r.getFillGeometry(node)
      if (fg) {
        for (const p of fg) canvas.drawPath(p, r.fillPaint)
      } else {
        const vps = r.getVectorPaths(node)
        if (vps) {
          for (const vp of vps) canvas.drawPath(vp, r.fillPaint)
        }
      }
      break
    }
    case 'ELLIPSE':
      if (node.arcData) {
        r.drawArc(canvas, node, r.fillPaint)
      } else {
        canvas.drawOval(rect, r.fillPaint)
      }
      break
    case 'TEXT':
      r.renderText(canvas, node, fill)
      break
    case 'LINE':
      canvas.drawLine(0, 0, node.width, node.height, r.fillPaint)
      break
    case 'POLYGON':
    case 'STAR': {
      const path = r.makePolygonPath(node)
      canvas.drawPath(path, r.fillPaint)
      path.delete()
      break
    }
    default:
      if (hasRadius) {
        canvas.drawRRect(r.makeRRect(node), r.fillPaint)
      } else {
        canvas.drawRect(rect, r.fillPaint)
      }
  }
}

export function applyFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph,
  fillIndex = 0
): boolean {
  r.fillPaint.setShader(null)
  r.fillPaint.setBlendMode(r.ck.BlendMode.SrcOver)

  if (fill.type === 'SOLID') {
    const c = r.resolveFillColor(fill, fillIndex, node, graph)
    r.fillPaint.setColor(r.ck.Color4f(c.r, c.g, c.b, c.a))
    return true
  }

  if (fill.type.startsWith('GRADIENT') && fill.gradientStops && fill.gradientTransform) {
    r.applyGradientFill(fill, node, graph)
    return true
  }

  if (fill.type === 'IMAGE' && fill.imageHash) {
    return r.applyImageFill(fill, node, graph)
  }

  return false
}

function makeGradientLocalMatrix(
  r: SkiaRenderer,
  width: number,
  height: number,
  transform: NonNullable<Fill['gradientTransform']>
) {
  return r.ck.Matrix.multiply(r.ck.Matrix.scaled(width, height), [
    transform.m00,
    transform.m01,
    transform.m02,
    transform.m10,
    transform.m11,
    transform.m12,
    0,
    0,
    1
  ])
}

export function applyGradientFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph
): void {
  const stops = fill.gradientStops
  const t = fill.gradientTransform
  if (!stops || !t) return
  const colors = stops.map((s, index) => {
    const resolved = r.resolveFillColorInfo(
      {
        ...fill,
        type: 'SOLID',
        color: s.color,
        opacity: s.color.a,
        visible: true
      },
      index,
      node,
      graph
    )
    const c = resolved.color
    return r.ck.Color4f(c.r, c.g, c.b, c.a)
  })
  const positions = stops.map((s) => s.position)

  const w = node.width
  const h = node.height

  if (fill.type === 'GRADIENT_LINEAR') {
    const startX = t.m02 * w
    const startY = t.m12 * h
    const endX = (t.m00 + t.m02) * w
    const endY = (t.m10 + t.m12) * h
    const shader = r.ck.Shader.MakeLinearGradient(
      [startX, startY],
      [endX, endY],
      colors,
      positions,
      r.ck.TileMode.Clamp
    )
    r.fillPaint.setShader(shader)
  } else if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_DIAMOND') {
    // Figma's gradientTransform maps gradient space (center 0.5,0.5, radius 0.5)
    // to the node's normalized [0,1] coordinate space. The full local matrix
    // converts to pixel coordinates: scale(w, h) * gradientTransform.
    const localMatrix = makeGradientLocalMatrix(r, w, h, t)
    const shader = r.ck.Shader.MakeRadialGradient(
      [0.5, 0.5],
      0.5,
      colors,
      positions,
      r.ck.TileMode.Clamp,
      localMatrix
    )
    r.fillPaint.setShader(shader)
  } else if (fill.type === 'GRADIENT_ANGULAR') {
    const localMatrix = makeGradientLocalMatrix(r, w, h, t)
    const shader = r.ck.Shader.MakeSweepGradient(
      0.5,
      0.5,
      colors,
      positions,
      r.ck.TileMode.Clamp,
      localMatrix
    )
    r.fillPaint.setShader(shader)
  }
}

function calculateImageScaleBounds(
  fill: Fill,
  node: SceneNode,
  imgW: number,
  imgH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const scaleMode = fill.imageScaleMode ?? 'FILL'
  if (scaleMode === 'CROP' && fill.imageTransform) {
    const t = fill.imageTransform
    return { sx: t.m02 * imgW, sy: t.m12 * imgH, sw: t.m00 * imgW, sh: t.m11 * imgH }
  }
  if (scaleMode === 'FIT') {
    const scale = Math.min(node.width / imgW, node.height / imgH)
    return {
      sx: -(node.width / scale - imgW) / 2,
      sy: -(node.height / scale - imgH) / 2,
      sw: imgW,
      sh: imgH
    }
  }
  const scale = Math.max(node.width / imgW, node.height / imgH)
  const sw = node.width / scale
  const sh = node.height / scale
  return { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh }
}

function buildFilterUniforms(f: Record<string, unknown>): number[] {
  const num = (k: string, d = 0) => {
    const val = f[k]
    return typeof val === 'number' ? val : d
  }
  const bg = f.bgRemoval as
    | { enabled?: boolean; targetColor?: [number, number, number] }
    | undefined
  const bgTarget = bg?.targetColor ?? [0.0, 1.0, 0.0]
  const blend = f.blend as
    | { enabled?: boolean; mode?: string; color?: [number, number, number]; opacity?: number }
    | undefined
  const blendMode = BLEND_MODES_MAP[blend?.mode ?? 'multiply'] ?? 2.0
  const blendColor = blend?.color ?? [1.0, 1.0, 1.0]

  return [
    num('brightness'),
    num('contrast'),
    num('exposure'),
    num('highlights'),
    num('shadows'),
    num('whites'),
    num('blacks'),
    num('gamma'),
    num('hue'),
    num('saturation'),
    num('vibrance'),
    num('temperature'),
    num('tint'),
    num('cyan'),
    num('magenta'),
    num('yellow'),
    num('key'),
    bg?.enabled ? 1.0 : 0.0,
    bgTarget[0],
    bgTarget[1],
    bgTarget[2],
    f.lumaThresholdEnabled ? 1.0 : 0.0,
    num('lumaThreshold', 0.1),
    num('lumaTolerance', 0.05),
    blend?.enabled ? 1.0 : 0.0,
    blendMode,
    blendColor[0],
    blendColor[1],
    blendColor[2],
    num('opacity', 1.0),
    ...getFlatPoints(f.pointsR as [number, number][] | undefined),
    ...getFlatPoints(f.pointsG as [number, number][] | undefined),
    ...getFlatPoints(f.pointsB as [number, number][] | undefined)
  ]
}

export function applyImageFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph
): boolean {
  const hash = fill.imageHash
  if (!hash) return false
  let img = r.imageCache.get(hash)
  if (!img) {
    const data = graph.images.get(hash)
    if (!data) return false
    img = r.ck.MakeImageFromEncoded(data) ?? undefined
    if (img) {
      r.evictLru(r.imageCache, (old) => old.delete())
      r.imageCache.set(hash, img)
    } else return false
  }

  const imgW = img.width()
  const imgH = img.height()
  const scaleMode = fill.imageScaleMode ?? 'FILL'

  if (scaleMode === 'TILE') {
    const shader = img.makeShaderCubic(r.ck.TileMode.Repeat, r.ck.TileMode.Repeat, 1 / 3, 1 / 3)
    r.fillPaint.setShader(shader)
    return true
  }

  const { sx, sy, sw, sh } = calculateImageScaleBounds(fill, node, imgW, imgH)
  const shader = img.makeShaderCubic(
    r.ck.TileMode.Clamp,
    r.ck.TileMode.Clamp,
    1 / 3,
    1 / 3,
    r.ck.Matrix.multiply(
      r.ck.Matrix.scaled(node.width / sw, node.height / sh),
      r.ck.Matrix.translated(-sx, -sy)
    )
  )

  const f = fill.filters
  if (hasActiveFilters(f as Record<string, unknown> | undefined)) {
    const effect = getImageFiltersEffect(r.ck) as {
      makeShaderWithChildren: (u: number[], c: unknown[]) => unknown
    } | null
    if (effect) {
      const uniforms = buildFilterUniforms(f as Record<string, unknown>)
      const filteredShader = effect.makeShaderWithChildren(uniforms, [shader])
      if (filteredShader) {
        r.fillPaint.setShader(filteredShader as Shader)
        const blend = f?.blend
        if (blend?.enabled && blend.mode) {
          const skBlend = getSkiaBlendMode(r, blend.mode)
          r.fillPaint.setBlendMode(skBlend)
        }
        return true
      }
    }
  }

  r.fillPaint.setShader(shader)
  return true
}

const BLEND_MODES_MAP: Record<string, number> = {
  darken: 1.0,
  multiply: 2.0,
  'color-burn': 3.0,
  'linear-burn': 4.0,
  lighten: 5.0,
  screen: 6.0,
  'color-dodge': 7.0,
  'linear-dodge': 8.0,
  overlay: 9.0,
  'soft-light': 10.0,
  'hard-light': 11.0,
  'vivid-light': 12.0,
  difference: 13.0,
  exclusion: 14.0,
  subtract: 15.0,
  divide: 16.0,
  hue: 17.0,
  saturation: 18.0,
  color: 19.0,
  luminosity: 20.0
}

export function getSkiaBlendMode(r: SkiaRenderer, mode?: string): BlendMode {
  if (!mode) return r.ck.BlendMode.SrcOver
  switch (mode.toLowerCase()) {
    case 'darken':
      return r.ck.BlendMode.Darken
    case 'multiply':
      return r.ck.BlendMode.Multiply
    case 'color-burn':
      return r.ck.BlendMode.ColorBurn
    case 'linear-burn':
      return r.ck.BlendMode.ColorBurn // fallback
    case 'lighten':
      return r.ck.BlendMode.Lighten
    case 'screen':
      return r.ck.BlendMode.Screen
    case 'color-dodge':
      return r.ck.BlendMode.ColorDodge
    case 'linear-dodge':
      return r.ck.BlendMode.Plus
    case 'overlay':
      return r.ck.BlendMode.Overlay
    case 'soft-light':
      return r.ck.BlendMode.SoftLight
    case 'hard-light':
      return r.ck.BlendMode.HardLight
    case 'vivid-light':
      return r.ck.BlendMode.HardLight // fallback
    case 'difference':
      return r.ck.BlendMode.Difference
    case 'exclusion':
      return r.ck.BlendMode.Exclusion
    case 'hue':
      return r.ck.BlendMode.Hue
    case 'saturation':
      return r.ck.BlendMode.Saturation
    case 'color':
      return r.ck.BlendMode.Color
    case 'luminosity':
      return r.ck.BlendMode.Luminosity
    default:
      return r.ck.BlendMode.SrcOver
  }
}

export function drawArc(r: SkiaRenderer, canvas: Canvas, node: SceneNode, paint: Paint): void {
  const arc = node.arcData
  if (!arc) return
  const cx = node.width / 2
  const cy = node.height / 2
  const rx = node.width / 2
  const ry = node.height / 2
  const innerRx = rx * arc.innerRadius
  const innerRy = ry * arc.innerRadius

  const startDeg = arc.startingAngle * (180 / Math.PI)
  const endDeg = arc.endingAngle * (180 / Math.PI)
  const sweepDeg = endDeg - startDeg

  const path = new r.ck.Path()
  const oval = r.ck.LTRBRect(0, 0, node.width, node.height)

  if (arc.innerRadius > 0) {
    path.addArc(oval, startDeg, sweepDeg)
    const innerOval = r.ck.LTRBRect(cx - innerRx, cy - innerRy, cx + innerRx, cy + innerRy)
    const innerPath = new r.ck.Path()
    innerPath.addArc(innerOval, startDeg + sweepDeg, -sweepDeg)
    path.addPath(innerPath)
    path.close()
    innerPath.delete()
  } else {
    const isFullCircle = Math.abs(sweepDeg) >= 359.99
    if (isFullCircle) {
      path.addOval(oval)
    } else {
      path.moveTo(cx, cy)
      path.addArc(oval, startDeg, sweepDeg)
      path.close()
    }
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Image Filters Shader & Helpers (AGSL Runtime Shader) imported from ./image-filter-shader

let cachedImageFiltersEffect: unknown = null

function getImageFiltersEffect(ck: unknown) {
  if (!cachedImageFiltersEffect) {
    const ckObj = ck as { RuntimeEffect: { Make: (shader: string) => unknown } }
    cachedImageFiltersEffect = ckObj.RuntimeEffect.Make(IMAGE_FILTERS_SHADER)
    if (!cachedImageFiltersEffect) {
      console.error('Failed to compile image adjustments runtime effect')
    }
  }
  return cachedImageFiltersEffect
}

const NUMERIC_FILTER_KEYS = [
  'brightness',
  'contrast',
  'exposure',
  'highlights',
  'shadows',
  'whites',
  'blacks',
  'gamma',
  'hue',
  'saturation',
  'vibrance',
  'temperature',
  'tint',
  'cyan',
  'magenta',
  'yellow',
  'key'
]

function hasActiveFilters(f?: Record<string, unknown>): boolean {
  if (!f) return false
  if (NUMERIC_FILTER_KEYS.some((k) => (f[k] ?? 0) !== 0)) return true
  const bg = f.bgRemoval as { enabled?: boolean } | undefined
  const blend = f.blend as { enabled?: boolean } | undefined
  return (
    f.pointsR !== undefined ||
    f.pointsG !== undefined ||
    f.pointsB !== undefined ||
    bg?.enabled === true ||
    blend?.enabled === true ||
    f.lumaThresholdEnabled === true
  )
}

function getFlatPoints(pts?: [number, number][]): number[] {
  const result: number[] = []
  const list =
    pts && pts.length > 0
      ? pts
      : [
          [0, 0],
          [1, 1]
        ]
  for (let i = 0; i < 8; i++) {
    if (i < list.length) {
      result.push(list[i][0], list[i][1])
    } else {
      result.push(2.0, 2.0) // unused point sentinel
    }
  }
  return result
}
