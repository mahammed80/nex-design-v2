/**
 * layout.ts — Convert CSS flexbox / grid / block layout → NexDesign Auto Layout props.
 */

export interface ExtractedLayout {
  flex?: 'row' | 'col'
  wrap?: boolean
  gap?: number
  rowGap?: number
  justify?: 'start' | 'end' | 'center' | 'between'
  items?: 'start' | 'end' | 'center' | 'stretch'
  dir?: 'ltr' | 'rtl' | 'auto'
  pt?: number
  pr?: number
  pb?: number
  pl?: number
}

function parsePx(val: string): number {
  return parseFloat(val) || 0
}

function mapJustifyContent(val: string): ExtractedLayout['justify'] {
  if (val === 'flex-end' || val === 'end') return 'end'
  if (val === 'center') return 'center'
  if (val === 'space-between') return 'between'
  return 'start'
}

function mapAlignItems(val: string): ExtractedLayout['items'] {
  if (val === 'flex-end' || val === 'end') return 'end'
  if (val === 'center') return 'center'
  if (val === 'stretch') return 'stretch'
  return 'start'
}

function extractFlexLayout(style: CSSStyleDeclaration, result: ExtractedLayout): void {
  const dir = style.flexDirection
  result.flex = dir === 'column' || dir === 'column-reverse' ? 'col' : 'row'

  const wrap = style.flexWrap
  if (wrap === 'wrap' || wrap === 'wrap-reverse') result.wrap = true

  const gap = parsePx(style.gap || style.columnGap)
  if (gap > 0) result.gap = Math.round(gap)

  const rowGap = parsePx(style.rowGap)
  if (rowGap > 0 && rowGap !== result.gap) result.rowGap = Math.round(rowGap)

  result.justify = mapJustifyContent(style.justifyContent)
  result.items = mapAlignItems(style.alignItems)
}

function extractGridLayout(style: CSSStyleDeclaration, result: ExtractedLayout): void {
  result.flex = 'row'
  result.wrap = true

  const gap = parsePx(style.gap || style.columnGap)
  if (gap > 0) result.gap = Math.round(gap)

  const rowGap = parsePx(style.rowGap)
  if (rowGap > 0 && rowGap !== result.gap) result.rowGap = Math.round(rowGap)
  result.items = mapAlignItems(style.alignItems)
}

function extractPadding(style: CSSStyleDeclaration, result: ExtractedLayout): void {
  const pt = parsePx(style.paddingTop)
  const pr = parsePx(style.paddingRight)
  const pb = parsePx(style.paddingBottom)
  const pl = parsePx(style.paddingLeft)
  if (pt > 0) result.pt = Math.round(pt)
  if (pr > 0) result.pr = Math.round(pr)
  if (pb > 0) result.pb = Math.round(pb)
  if (pl > 0) result.pl = Math.round(pl)
}

export function extractLayout(style: CSSStyleDeclaration): ExtractedLayout {
  const result: ExtractedLayout = {}
  const display = style.display

  if (display === 'flex' || display === 'inline-flex') {
    extractFlexLayout(style, result)
  } else if (display === 'grid' || display === 'inline-grid') {
    extractGridLayout(style, result)
  }

  if (style.direction === 'rtl') {
    result.dir = 'rtl'
  } else if (style.direction === 'ltr') {
    result.dir = 'ltr'
  }

  extractPadding(style, result)
  return result
}
