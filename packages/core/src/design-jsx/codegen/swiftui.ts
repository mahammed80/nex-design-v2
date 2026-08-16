import { colorToHex } from '#core/color'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

function hexToSwiftUIColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 6) {
    const r = (parseInt(clean.slice(0, 2), 16) / 255).toFixed(2)
    const g = (parseInt(clean.slice(2, 4), 16) / 255).toFixed(2)
    const b = (parseInt(clean.slice(4, 6), 16) / 255).toFixed(2)
    return `Color(red: ${r}, green: ${g}, blue: ${b})`
  }
  return 'Color.clear'
}

function resolveSwiftUIFontWeight(weight?: number): string {
  if (weight && weight >= 700) return '.bold()'
  if (weight && weight >= 600) return '.fontWeight(.semibold)'
  return ''
}

function resolveSwiftUIStack(layoutMode?: string): string {
  if (layoutMode === 'HORIZONTAL') return 'HStack'
  if (layoutMode === 'VERTICAL') return 'VStack'
  return 'ZStack'
}

function generateSwiftUIText(node: SceneNode, indent: string): string {
  const tFill = node.fills?.find((f) => f.visible !== false)
  const colorStr = tFill?.type === 'SOLID' ? hexToSwiftUIColor(colorToHex(tFill.color)) : 'Color.primary'
  const fontWeight = resolveSwiftUIFontWeight(node.fontWeight)
  const weightModifier = fontWeight ? `${indent}  ${fontWeight}\n` : ''
  const escaped = (node.text || '').replace(/"/g, '\\"')

  return `${indent}Text("${escaped}")\n${indent}  .font(.system(size: ${node.fontSize || 14}))\n${weightModifier}${indent}  .foregroundColor(${colorStr})`
}

export function generateSwiftUISnippet(node: SceneNode, graph: SceneGraph, depth = 0): string {
  const indent = '  '.repeat(depth)
  if (node.type === 'TEXT') return generateSwiftUIText(node, indent)

  const stack = resolveSwiftUIStack(node.layoutMode)
  const spacing = node.itemSpacing ? `(spacing: ${Math.round(node.itemSpacing)})` : ''

  const childSnippets = node.childIds
    .map((cid) => {
      const c = graph.getNode(cid)
      return c ? generateSwiftUISnippet(c, graph, depth + 1) : ''
    })
    .filter(Boolean)

  const childrenBlock = childSnippets.length > 0 ? `\n${childSnippets.join('\n')}\n${indent}` : ''
  const fill = node.fills?.find((f) => f.visible !== false)
  const bgModifier = fill?.type === 'SOLID' ? `\n${indent}  .background(${hexToSwiftUIColor(colorToHex(fill.color))})` : ''
  const cornerModifier = node.cornerRadius ? `\n${indent}  .cornerRadius(${node.cornerRadius})` : ''
  const frameModifier = `\n${indent}  .frame(width: ${Math.round(node.width)}, height: ${Math.round(node.height)})`

  return `${indent}${stack}${spacing} {${childrenBlock}}${frameModifier}${bgModifier}${cornerModifier}`
}
