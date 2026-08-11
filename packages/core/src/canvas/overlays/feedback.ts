import type { Canvas } from 'canvaskit-wasm'

import { drawNodeHighlightRect } from '#core/canvas/highlight-rect'
import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import {
  FLASH_ATTACK_MS,
  FLASH_COLOR,
  FLASH_HOLD_MS,
  FLASH_OVERSHOOT,
  FLASH_RELEASE_MS,
  LAYOUT_INDICATOR_STROKE,
  MARQUEE_FILL_ALPHA
} from '#core/constants'
import type { SceneGraph } from '#core/scene-graph'
import type { SnapGuide } from '#core/scene-graph/snap'
import type { Rect } from '#core/types'

export function drawSnapGuides(r: SkiaRenderer, canvas: Canvas, guides?: SnapGuide[]): void {
  if (!guides || guides.length === 0) return

  for (const guide of guides) {
    if (guide.axis === 'x') {
      const x = guide.position * r.zoom + r.panX
      const y1 = guide.from * r.zoom + r.panY
      const y2 = guide.to * r.zoom + r.panY
      canvas.drawLine(x, y1, x, y2, r.snapPaint)
    } else {
      const y = guide.position * r.zoom + r.panY
      const x1 = guide.from * r.zoom + r.panX
      const x2 = guide.to * r.zoom + r.panX
      canvas.drawLine(x1, y, x2, y, r.snapPaint)
    }
  }
}

export function drawMarquee(r: SkiaRenderer, canvas: Canvas, marquee?: Rect | null): void {
  if (!marquee || marquee.width <= 0 || marquee.height <= 0) return

  const x1 = marquee.x * r.zoom + r.panX
  const y1 = marquee.y * r.zoom + r.panY
  const x2 = (marquee.x + marquee.width) * r.zoom + r.panX
  const y2 = (marquee.y + marquee.height) * r.zoom + r.panY
  const rect = r.ck.LTRBRect(x1, y1, x2, y2)

  r.auxFill.setColor(r.selColor(MARQUEE_FILL_ALPHA))
  canvas.drawRect(rect, r.auxFill)
  canvas.drawRect(rect, r.selectionPaint)
}

export function drawFlashes(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph): void {
  if (r._flashes.length === 0) return

  const now = performance.now()
  const totalMs = FLASH_ATTACK_MS + FLASH_HOLD_MS + FLASH_RELEASE_MS

  for (let i = r._flashes.length - 1; i >= 0; i--) {
    const flash = r._flashes[i]
    const elapsed = now - flash.startTime
    if (elapsed > totalMs) {
      r._flashes.splice(i, 1)
      continue
    }

    let opacity: number
    let extraPad: number

    if (elapsed < FLASH_ATTACK_MS) {
      const t = elapsed / FLASH_ATTACK_MS
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      opacity = ease
      extraPad = (1 - ease) * FLASH_OVERSHOOT
    } else if (elapsed < FLASH_ATTACK_MS + FLASH_HOLD_MS) {
      opacity = 1
      extraPad = 0
    } else {
      const t = (elapsed - FLASH_ATTACK_MS - FLASH_HOLD_MS) / FLASH_RELEASE_MS
      opacity = 1 - t * t
      extraPad = 0
    }

    if (!drawNodeHighlightRect(r, canvas, graph, flash.nodeId, FLASH_COLOR, opacity, extraPad)) {
      r._flashes.splice(i, 1)
    }
  }
}

export function drawLayoutInsertIndicator(
  r: SkiaRenderer,
  canvas: Canvas,
  indicator?: RenderOverlays['layoutInsertIndicator']
): void {
  if (!indicator) return

  r.auxStroke.setStrokeWidth(LAYOUT_INDICATOR_STROKE)
  r.auxStroke.setColor(r.selColor())
  r.auxStroke.setPathEffect(null)

  if (indicator.direction === 'HORIZONTAL') {
    const y = indicator.y * r.zoom + r.panY
    const x1 = indicator.x * r.zoom + r.panX
    const x2 = (indicator.x + indicator.length) * r.zoom + r.panX
    canvas.drawLine(x1, y, x2, y, r.auxStroke)
  } else {
    const x = indicator.x * r.zoom + r.panX
    const y1 = indicator.y * r.zoom + r.panY
    const y2 = (indicator.y + indicator.length) * r.zoom + r.panY
    canvas.drawLine(x, y1, x, y2, r.auxStroke)
  }
}

import type { Guide } from '#core/editor/types'

export function drawGuides(
  r: SkiaRenderer,
  canvas: Canvas,
  guides?: Guide[],
  selectedGuideId?: string | null,
  visible?: boolean
): void {
  if (visible === false || !guides || guides.length === 0) return

  const R = 24
  const vw = r.viewportWidth
  const vh = r.viewportHeight

  for (const guide of guides) {
    const isSelected = guide.id === selectedGuideId
    const color = isSelected ? r.ck.Color4f(0, 0.53, 1.0, 1.0) : r.ck.Color4f(0, 0.76, 1.0, 0.7)

    r.guidePaint.setColor(color)
    r.guidePaint.setStrokeWidth(isSelected ? 1.5 : 1)

    if (guide.type === 'horizontal') {
      const sy = guide.value * r.zoom + r.panY
      if (sy < R || sy > vh) continue
      canvas.drawLine(R, sy, vw, sy, r.guidePaint)
    } else {
      const sx = guide.value * r.zoom + r.panX
      if (sx < R || sx > vw) continue
      canvas.drawLine(sx, R, sx, vh, r.guidePaint)
    }
  }
}
