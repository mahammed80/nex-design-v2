/**
 * styles.ts — Convert CSS computed style values → NexDesign style props.
 */

export interface ExtractedStyle {
  w?: number
  h?: number
  bg?: string
  stroke?: string
  strokeWidth?: number
  rounded?: number
  roundedTL?: number
  roundedTR?: number
  roundedBL?: number
  roundedBR?: number
  opacity?: number
  shadow?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justified'
  overflow?: 'hidden' | 'visible'
}

export function parsePx(val: string): number {
  return parseFloat(val) || 0
}

export function rgbToHex(rgb: string): string | null {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match) return null
  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1
  if (a === 0) return null
  const hex = [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
  if (a < 1) {
    const alpha = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${hex}${alpha}`
  }
  return `#${hex}`
}

function parseFontWeight(val: string): number {
  if (val === 'bold') return 700
  if (val === 'normal') return 400
  return parseInt(val, 10) || 400
}

function parseTextAlign(val: string): ExtractedStyle['textAlign'] {
  if (val === 'center') return 'center'
  if (val === 'right') return 'right'
  if (val === 'justify') return 'justified'
  return 'left'
}

function parseShadow(val: string): string | undefined {
  if (!val || val === 'none') return undefined
  const first = val.split(/,(?![^(]*\))/)[0].trim()
  return first || undefined
}

function extractBorderRadius(style: CSSStyleDeclaration, result: ExtractedStyle): void {
  const tl = parsePx(style.borderTopLeftRadius)
  const tr = parsePx(style.borderTopRightRadius)
  const bl = parsePx(style.borderBottomLeftRadius)
  const br = parsePx(style.borderBottomRightRadius)
  if (tl === tr && tr === bl && bl === br) {
    if (tl > 0) result.rounded = Math.round(tl)
  } else {
    if (tl > 0) result.roundedTL = Math.round(tl)
    if (tr > 0) result.roundedTR = Math.round(tr)
    if (bl > 0) result.roundedBL = Math.round(bl)
    if (br > 0) result.roundedBR = Math.round(br)
  }
}

function extractBorder(style: CSSStyleDeclaration, result: ExtractedStyle): void {
  const borderColor = rgbToHex(style.borderColor || style.borderTopColor)
  const borderWidth = parsePx(style.borderWidth || style.borderTopWidth)
  if (borderColor && borderWidth > 0) {
    result.stroke = borderColor
    result.strokeWidth = Math.round(borderWidth)
  }
}

function extractTextProps(style: CSSStyleDeclaration, result: ExtractedStyle): void {
  const color = rgbToHex(style.color)
  if (color) result.color = color

  const fontSize = parsePx(style.fontSize)
  if (fontSize > 0) result.fontSize = Math.round(fontSize)

  if (style.fontFamily) {
    const firstFont = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
    if (
      firstFont &&
      firstFont !== 'inherit' &&
      firstFont !== 'system-ui' &&
      firstFont !== 'sans-serif' &&
      firstFont !== 'serif'
    ) {
      result.fontFamily = firstFont
    }
  }

  result.fontWeight = parseFontWeight(style.fontWeight)
  result.textAlign = parseTextAlign(style.textAlign)
}

export function extractStyles(style: CSSStyleDeclaration): ExtractedStyle {
  const result: ExtractedStyle = {}

  const bg = rgbToHex(style.backgroundColor)
  if (bg) result.bg = bg

  extractBorder(style, result)
  extractBorderRadius(style, result)

  const opacity = parseFloat(style.opacity)
  if (!isNaN(opacity) && opacity < 1) result.opacity = opacity

  const shadow = parseShadow(style.boxShadow)
  if (shadow) result.shadow = shadow

  extractTextProps(style, result)

  if (
    style.overflow === 'hidden' ||
    style.overflowX === 'hidden' ||
    style.overflowY === 'hidden'
  ) {
    result.overflow = 'hidden'
  }

  return result
}
