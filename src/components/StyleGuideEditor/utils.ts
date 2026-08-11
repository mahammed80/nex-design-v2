import { colorToCSS, parseColor } from '@nex-design/core/color'
import type { Fill } from '@nex-design/core/scene-graph'
import type { Color } from '@nex-design/core/types'

export interface VariableItem {
  id: string
  name: string
  type: string
  resolvedType?: string
  valuesByMode: Record<string, unknown>
}

export function randomHex(length = 8): string {
  const arr = new Uint8Array(length / 2)
  crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, '0')).join('')
}

export function parseLinearGradient(css: unknown): {
  angle: number
  color1: string
  color2: string
} {
  if (typeof css !== 'string') return { angle: 135, color1: '#12B07A', color2: '#76C693' }
  const regex =
    /linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\)/i
  const match = css.match(regex)
  if (match) {
    return {
      angle: parseInt(match[1], 10),
      color1: match[2],
      color2: match[3]
    }
  }
  return { angle: 135, color1: '#12B07A', color2: '#76C693' }
}

export function fillToGradientString(fill: Fill): string {
  if (fill.type !== 'GRADIENT_LINEAR' || !fill.gradientStops) {
    return 'linear-gradient(135deg, #12B07A 0%, #76C693 100%)'
  }

  let angle = 135
  if (fill.gradientTransform) {
    const t = fill.gradientTransform
    angle = Math.round(Math.atan2(t.m10, t.m00) * (180 / Math.PI)) + 90
    if (angle < 0) angle += 360
  }

  const stopsStr = fill.gradientStops
    .map((s) => `${colorToCSS(s.color)} ${Math.round(s.position * 100)}%`)
    .join(', ')

  return `linear-gradient(${angle}deg, ${stopsStr})`
}

export function gradientStringToFill(css: string): Fill {
  const fallbackFill: Fill = {
    type: 'GRADIENT_LINEAR',
    color: { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: [
      { position: 0, color: { r: 0.07, g: 0.69, b: 0.48, a: 1 } },
      { position: 1, color: { r: 0.46, g: 0.78, b: 0.58, a: 1 } }
    ],
    gradientTransform: {
      m00: 0.707,
      m01: -0.707,
      m02: 0.15,
      m10: 0.707,
      m11: 0.707,
      m12: 0.15
    }
  }

  if (typeof css !== 'string') return fallbackFill

  const mainRegex = /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(.*)\s*\)/i
  const match = css.match(mainRegex)
  if (!match) return fallbackFill

  const angle = parseInt(match[1], 10)
  const stopsText = match[2]

  const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)\s+(\d+)%/g
  const stops: Array<{ position: number; color: Color }> = []

  let stopMatch
  while ((stopMatch = stopRegex.exec(stopsText)) !== null) {
    const colorStr = stopMatch[1]
    const pos = parseInt(stopMatch[2], 10) / 100
    const parsed = parseColor(colorStr)
    stops.push({ position: pos, color: parsed })
  }

  if (stops.length < 2) return fallbackFill

  const rad = ((angle - 90) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return {
    type: 'GRADIENT_LINEAR',
    color: { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: stops,
    gradientTransform: {
      m00: Number(cos.toFixed(3)),
      m01: Number((-sin).toFixed(3)),
      m02: 0.15,
      m10: Number(sin.toFixed(3)),
      m11: Number(cos.toFixed(3)),
      m12: 0.15
    }
  }
}

export function getFillFromVariable(v: VariableItem): Fill {
  if (v.type === 'COLOR') {
    return {
      type: 'SOLID',
      visible: true,
      opacity: 1,
      color: v.valuesByMode.default as Color
    }
  } else if (
    v.type === 'STRING' &&
    typeof v.valuesByMode.default === 'string' &&
    v.valuesByMode.default.startsWith('linear-gradient')
  ) {
    return gradientStringToFill(v.valuesByMode.default)
  }
  return {
    type: 'SOLID',
    visible: true,
    opacity: 1,
    color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
  }
}
