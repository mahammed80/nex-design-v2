import { colorToHex } from '#core/color'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

function collectFlexRules(node: SceneNode, rules: Record<string, string>): void {
  if (node.layoutMode === 'HORIZONTAL') {
    rules['display'] = 'flex'
    rules['flex-direction'] = 'row'
    if (node.layoutWrap === 'WRAP') rules['flex-wrap'] = 'wrap'
    if (node.primaryAxisAlign === 'CENTER') rules['justify-content'] = 'center'
    else if (node.primaryAxisAlign === 'MAX') rules['justify-content'] = 'flex-end'
    else if (node.primaryAxisAlign === 'SPACE_BETWEEN') rules['justify-content'] = 'space-between'

    if (node.counterAxisAlign === 'CENTER') rules['align-items'] = 'center'
    else if (node.counterAxisAlign === 'MAX') rules['align-items'] = 'flex-end'
    else if (node.counterAxisAlign === 'STRETCH') rules['align-items'] = 'stretch'
  } else if (node.layoutMode === 'VERTICAL') {
    rules['display'] = 'flex'
    rules['flex-direction'] = 'column'
    if (node.primaryAxisAlign === 'CENTER') rules['justify-content'] = 'center'
    else if (node.primaryAxisAlign === 'MAX') rules['justify-content'] = 'flex-end'
    else if (node.primaryAxisAlign === 'SPACE_BETWEEN') rules['justify-content'] = 'space-between'

    if (node.counterAxisAlign === 'CENTER') rules['align-items'] = 'center'
    else if (node.counterAxisAlign === 'MAX') rules['align-items'] = 'flex-end'
  }
}

function collectDimensionAndPaddingRules(node: SceneNode, rules: Record<string, string>): void {
  rules['width'] = `${Math.round(node.width)}px`
  rules['height'] = `${Math.round(node.height)}px`

  if (node.itemSpacing && node.itemSpacing > 0) {
    rules['gap'] = `${Math.round(node.itemSpacing)}px`
  }

  const pt = node.paddingTop || 0
  const pr = node.paddingRight || 0
  const pb = node.paddingBottom || 0
  const pl = node.paddingLeft || 0
  if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    rules['padding'] = `${pt}px ${pr}px ${pb}px ${pl}px`
  }
}

function collectVisualRules(node: SceneNode, rules: Record<string, string>): void {
  const fill = node.fills?.find((f) => f.visible !== false)
  if (fill?.type === 'SOLID') {
    rules['background-color'] = colorToHex(fill.color)
  }

  if (node.cornerRadius && node.cornerRadius > 0) {
    rules['border-radius'] = `${Math.round(node.cornerRadius)}px`
  }

  const stroke = node.strokes?.find((s) => s.visible !== false)
  if (stroke) {
    rules['border'] = `${stroke.weight || 1}px solid ${colorToHex(stroke.color)}`
  }

  if (node.opacity !== undefined && node.opacity < 1) {
    rules['opacity'] = String(node.opacity)
  }
  if (node.clipsContent) {
    rules['overflow'] = 'hidden'
  }
}

function collectTypographyRules(node: SceneNode, rules: Record<string, string>): void {
  if (node.type !== 'TEXT') return
  if (node.fontFamily) rules['font-family'] = `"${node.fontFamily}", sans-serif`
  if (node.fontSize) rules['font-size'] = `${Math.round(node.fontSize)}px`
  if (node.fontWeight) rules['font-weight'] = String(node.fontWeight)
  if (node.lineHeight) rules['line-height'] = `${Math.round(node.lineHeight)}px`
  if (node.letterSpacing) rules['letter-spacing'] = `${node.letterSpacing}px`
  if (node.textAlignHorizontal) rules['text-align'] = node.textAlignHorizontal.toLowerCase()
  const tFill = node.fills?.find((f) => f.visible !== false)
  if (tFill?.type === 'SOLID') {
    rules['color'] = colorToHex(tFill.color)
  }
}

export function generateCssRules(node: SceneNode): Record<string, string> {
  const rules: Record<string, string> = {}
  collectDimensionAndPaddingRules(node, rules)
  collectFlexRules(node, rules)
  collectVisualRules(node, rules)
  collectTypographyRules(node, rules)
  return rules
}

export function generateCssSnippet(node: SceneNode, _graph: SceneGraph): string {
  const className = (node.name || 'element')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'element'

  const rules = generateCssRules(node)
  const ruleLines = Object.entries(rules)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')

  return `.${className} {\n${ruleLines}\n}`
}
