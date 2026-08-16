import { colorToHex } from '#core/color'
import {
  borderRadiusToTw,
  colorToTwClass,
  fontSizeToTw,
  fontWeightToTw,
  opacityToTw,
  pxToSpacing
} from '#core/design-jsx/tailwind'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

function collectFlexClasses(node: SceneNode, classes: string[]): void {
  if (node.layoutMode === 'HORIZONTAL') {
    classes.push('flex', 'flex-row')
    if (node.layoutWrap === 'WRAP') classes.push('flex-wrap')
    if (node.primaryAxisAlign === 'CENTER') classes.push('justify-center')
    else if (node.primaryAxisAlign === 'MAX') classes.push('justify-end')
    else if (node.primaryAxisAlign === 'SPACE_BETWEEN') classes.push('justify-between')

    if (node.counterAxisAlign === 'CENTER') classes.push('items-center')
    else if (node.counterAxisAlign === 'MAX') classes.push('items-end')
    else if (node.counterAxisAlign === 'STRETCH') classes.push('items-stretch')
  } else if (node.layoutMode === 'VERTICAL') {
    classes.push('flex', 'flex-col')
    if (node.primaryAxisAlign === 'CENTER') classes.push('justify-center')
    else if (node.primaryAxisAlign === 'MAX') classes.push('justify-end')
    else if (node.primaryAxisAlign === 'SPACE_BETWEEN') classes.push('justify-between')

    if (node.counterAxisAlign === 'CENTER') classes.push('items-center')
    else if (node.counterAxisAlign === 'MAX') classes.push('items-end')
  }
}

function collectPaddingClasses(node: SceneNode, classes: string[]): void {
  const pt = node.paddingTop || 0
  const pr = node.paddingRight || 0
  const pb = node.paddingBottom || 0
  const pl = node.paddingLeft || 0

  if (pt > 0 && pt === pr && pr === pb && pb === pl) {
    classes.push(`p-${pxToSpacing(pt)}`)
    return
  }
  if (pt > 0 && pt === pb) classes.push(`py-${pxToSpacing(pt)}`)
  else {
    if (pt > 0) classes.push(`pt-${pxToSpacing(pt)}`)
    if (pb > 0) classes.push(`pb-${pxToSpacing(pb)}`)
  }
  if (pl > 0 && pl === pr) classes.push(`px-${pxToSpacing(pl)}`)
  else {
    if (pl > 0) classes.push(`pl-${pxToSpacing(pl)}`)
    if (pr > 0) classes.push(`pr-${pxToSpacing(pr)}`)
  }
}

function collectSizeClasses(node: SceneNode, classes: string[]): void {
  if (node.layoutGrow === 1) classes.push('flex-1')
  if (node.layoutAlignSelf === 'STRETCH') classes.push('self-stretch')

  if (node.width > 0 && node.layoutGrow !== 1) {
    classes.push(`w-[${Math.round(node.width)}px]`)
  }
  if (node.height > 0 && node.layoutAlignSelf !== 'STRETCH') {
    classes.push(`h-[${Math.round(node.height)}px]`)
  }
}

function collectVisualClasses(node: SceneNode, classes: string[]): void {
  const fill = node.fills?.find((f) => f.visible !== false)
  if (fill) {
    if (fill.type === 'SOLID') {
      const hex = colorToHex(fill.color)
      classes.push(`bg-${colorToTwClass(hex)}`)
    } else if (fill.type === 'IMAGE') {
      classes.push('bg-cover', 'bg-center')
    }
  }

  if (node.cornerRadius && node.cornerRadius > 0) {
    const rad = borderRadiusToTw(node.cornerRadius)
    classes.push(rad ? `rounded-${rad}` : 'rounded')
  }

  const stroke = node.strokes?.find((s) => s.visible !== false)
  if (stroke) {
    const sHex = colorToHex(stroke.color)
    const sw = stroke.weight || 1
    classes.push(sw === 1 ? 'border' : `border-[${sw}px]`)
    classes.push(`border-${colorToTwClass(sHex)}`)
  }

  if (node.opacity !== undefined && node.opacity < 1) {
    classes.push(`opacity-${opacityToTw(node.opacity)}`)
  }
  if (node.clipsContent) {
    classes.push('overflow-hidden')
  }
}

function collectTypographyClasses(node: SceneNode, classes: string[]): void {
  if (node.type !== 'TEXT') return
  if (node.fontSize) classes.push(`text-${fontSizeToTw(node.fontSize)}`)
  if (node.fontWeight) classes.push(`font-${fontWeightToTw(node.fontWeight)}`)
  if (node.textAlignHorizontal === 'CENTER') classes.push('text-center')
  else if (node.textAlignHorizontal === 'RIGHT') classes.push('text-right')
  const tFill = node.fills?.find((f) => f.visible !== false)
  if (tFill?.type === 'SOLID') {
    classes.push(`text-${colorToTwClass(colorToHex(tFill.color))}`)
  }
}

export function nodeToTailwindClasses(node: SceneNode): string[] {
  const classes: string[] = []
  collectFlexClasses(node, classes)
  if (node.itemSpacing && node.itemSpacing > 0) {
    classes.push(`gap-${pxToSpacing(node.itemSpacing)}`)
  }
  collectPaddingClasses(node, classes)
  collectSizeClasses(node, classes)
  collectVisualClasses(node, classes)
  collectTypographyClasses(node, classes)
  return classes
}

export function generateTailwindSnippet(node: SceneNode, graph: SceneGraph, depth = 0): string {
  const indent = '  '.repeat(depth)
  const classes = nodeToTailwindClasses(node).join(' ')
  const tag = node.type === 'TEXT' ? 'p' : 'div'

  if (node.type === 'TEXT') {
    return `${indent}<${tag} class="${classes}">${node.text || ''}</${tag}>`
  }

  if (node.childIds.length === 0) {
    return `${indent}<${tag} class="${classes}" />`
  }

  const childrenMarkup = node.childIds
    .map((cid) => {
      const c = graph.getNode(cid)
      return c ? generateTailwindSnippet(c, graph, depth + 1) : ''
    })
    .filter(Boolean)
    .join('\n')

  return `${indent}<${tag} class="${classes}">\n${childrenMarkup}\n${indent}</${tag}>`
}
