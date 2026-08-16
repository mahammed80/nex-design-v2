import { colorToHex } from '#core/color'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

function hexToFlutterColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 6) return `Color(0xFF${clean.toUpperCase()})`
  if (clean.length === 8) return `Color(0x${clean.toUpperCase()})`
  return 'Colors.transparent'
}

function resolveFlutterFontWeight(weight?: number): string {
  if (weight && weight >= 700) return 'FontWeight.bold'
  if (weight && weight >= 600) return 'FontWeight.w600'
  return 'FontWeight.normal'
}

function resolveFlutterMainAlign(align?: string): string {
  if (align === 'CENTER') return 'MainAxisAlignment.center'
  if (align === 'SPACE_BETWEEN') return 'MainAxisAlignment.spaceBetween'
  if (align === 'MAX') return 'MainAxisAlignment.end'
  return 'MainAxisAlignment.start'
}

function generateFlutterText(node: SceneNode, indent: string): string {
  const tFill = node.fills?.find((f) => f.visible !== false)
  const colorStr = tFill?.type === 'SOLID' ? hexToFlutterColor(colorToHex(tFill.color)) : 'Colors.black'
  const fontWeight = resolveFlutterFontWeight(node.fontWeight)
  const escaped = (node.text || '').replace(/'/g, "\\'")

  return `${indent}Text(\n${indent}  '${escaped}',\n${indent}  style: TextStyle(\n${indent}    fontSize: ${node.fontSize || 14},\n${indent}    fontWeight: ${fontWeight},\n${indent}    color: ${colorStr},\n${indent}  ),\n${indent})`
}

export function generateFlutterSnippet(node: SceneNode, graph: SceneGraph, depth = 0): string {
  const indent = '  '.repeat(depth)
  if (node.type === 'TEXT') return generateFlutterText(node, indent)

  const isRow = node.layoutMode === 'HORIZONTAL'
  const isCol = node.layoutMode === 'VERTICAL'

  const childSnippets = node.childIds
    .map((cid) => {
      const c = graph.getNode(cid)
      return c ? generateFlutterSnippet(c, graph, depth + 2) : ''
    })
    .filter(Boolean)

  const childrenBlock = childSnippets.length > 0
    ? `\n${indent}  children: [\n${childSnippets.join(',\n')},\n${indent}  ],\n`
    : ''

  if (isRow || isCol) {
    const widget = isRow ? 'Row' : 'Column'
    const mainAlign = resolveFlutterMainAlign(node.primaryAxisAlign)
    const crossAlign = node.counterAxisAlign === 'CENTER' ? 'CrossAxisAlignment.center' : 'CrossAxisAlignment.start'

    return `${indent}${widget}(\n${indent}  mainAxisAlignment: ${mainAlign},\n${indent}  crossAxisAlignment: ${crossAlign},${childrenBlock}${indent})`
  }

  const fill = node.fills?.find((f) => f.visible !== false)
  const bgStr = fill?.type === 'SOLID' ? `color: ${hexToFlutterColor(colorToHex(fill.color))}, ` : ''
  const radStr = node.cornerRadius ? `borderRadius: BorderRadius.circular(${node.cornerRadius}), ` : ''
  const decoration = bgStr || radStr ? `decoration: BoxDecoration(${bgStr}${radStr}),\n` : ''
  const childProp = childSnippets[0] ? `${indent}  child: ${childSnippets[0]},\n` : ''

  return `${indent}Container(\n${indent}  width: ${Math.round(node.width)},\n${indent}  height: ${Math.round(node.height)},\n${indent}  ${decoration}${childProp}${indent})`
}
