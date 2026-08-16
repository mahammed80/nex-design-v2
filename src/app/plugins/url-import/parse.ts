/**
 * parse.ts — DOM-to-TreeNode walker using a live sandboxed iframe.
 *
 * Mounts the fetched HTML into a hidden attached iframe with injected <base href="...">
 * and desktop viewport (1440px) so that all external stylesheets, Google Fonts,
 * desktop media queries, and flexbox/grid layouts are computed natively by the browser.
 */

import type { TreeNode } from '@nex-design/core/design-jsx'

import { shouldSkipElement } from './filter'
import { extractBgImageUrl, getImgAlt, getImgSrc, isImageElement, resolveImageUrl } from './image'
import { extractLayout } from './layout'
import { extractStyles, parsePx, rgbToHex } from './styles'
import { cleanPageTitle, extractTextContent, isArabicText, isTextLeafElement, semanticName } from './text'

export interface ParseOptions {
  selector?: string
  maxDepth?: number
  baseUrl?: string
  viewportWidth?: number
}

function injectBaseTag(html: string, baseUrl: string, viewportWidth: number): string {
  const baseTag = baseUrl ? `<base href="${baseUrl}">` : ''
  const metaTag = `<meta name="viewport" content="width=${viewportWidth}, initial-scale=1">`
  const injected = `${baseTag}${metaTag}`
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${injected}`)
  }
  if (html.includes('<html>')) {
    return html.replace('<html>', `<html><head>${injected}</head>`)
  }
  return `<head>${injected}</head>${html}`
}

function createHiddenIframe(viewportWidth: number): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.width = String(viewportWidth)
  iframe.height = '3000'
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: -99999px;
    width: ${viewportWidth}px !important;
    min-width: ${viewportWidth}px !important;
    max-width: ${viewportWidth}px !important;
    height: 3000px !important;
    opacity: 0.01;
    pointer-events: none;
    border: 0;
    z-index: -9999;
  `
  document.body.appendChild(iframe)
  return iframe
}

export async function parseHtmlToTree(
  html: string,
  options: ParseOptions = {}
): Promise<TreeNode> {
  const {
    selector = 'body',
    maxDepth = 15,
    baseUrl = '',
    viewportWidth = 1440
  } = options

  const iframe = createHiddenIframe(viewportWidth)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Could not access iframe document')

    const injectedHtml = injectBaseTag(html, baseUrl, viewportWidth)
    doc.open()
    doc.write(injectedHtml)
    doc.close()

    // Wait for remote stylesheets, Google Fonts, and layout computation
    await new Promise((resolve) => setTimeout(resolve, 1200))

    const targetEl = selector && selector !== 'body' ? doc.querySelector(selector) : doc.body
    const root = targetEl ?? doc.body
    if (!root) throw new Error(`Selector "${selector}" matched no elements`)

    const win = iframe.contentWindow ?? window
    const bodyStyle = win.getComputedStyle(doc.body)
    const docStyle = win.getComputedStyle(doc.documentElement)
    const rawBodyBg = rgbToHex(bodyStyle.backgroundColor)
    const rawDocBg = rgbToHex(docStyle.backgroundColor)
    const pageBg = rawBodyBg ?? rawDocBg ?? '#FFFFFF'
    const defaultTextColor = rgbToHex(bodyStyle.color) ?? rgbToHex(docStyle.color) ?? '#111827'

    const tree = walkElement(root, 0, maxDepth, baseUrl, win, viewportWidth, false, defaultTextColor)
    if (!tree) return createFallbackNode(viewportWidth)

    tree.props.name = cleanPageTitle(doc.title, 'Imported Page')
    tree.props.w = viewportWidth
    if (!tree.props.bg) tree.props.bg = pageBg
    tree.props.flex = 'col'
    tree.props.gap = 0

    return tree
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }
}

function createFallbackNode(w = 1440): TreeNode {
  return {
    type: 'frame',
    props: { name: 'Imported Page', w, bg: '#0A1F44', flex: 'col' },
    children: [{ type: 'text', props: { color: '#FFFFFF', size: 14 }, children: ['Empty page'] }]
  }
}

function buildImageNode(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
  baseUrl: string
): TreeNode {
  const src = getImgSrc(el)
  const resolvedSrc = src ? resolveImageUrl(src, baseUrl) : null
  const alt = getImgAlt(el)
  const w = Math.round(rect.width) || Math.round(parsePx(style.width)) || 200
  const h = Math.round(rect.height) || Math.round(parsePx(style.height)) || 200

  return {
    type: 'rectangle',
    props: {
      name: `Image / ${alt}`,
      w: w > 0 ? w : 200,
      h: h > 0 ? h : 200,
      ...(resolvedSrc ? { imageSrc: resolvedSrc } : { bg: '#E5E7EB' })
    },
    children: []
  }
}

function buildSvgNode(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect
): TreeNode {
  const w = Math.round(rect.width) || Math.round(parsePx(style.width)) || 24
  const h = Math.round(rect.height) || Math.round(parsePx(style.height)) || 24
  const color = style.color || '#FFFFFF'

  return {
    type: 'frame',
    props: {
      name: `Icon / ${el.id || el.getAttribute('aria-label') || 'svg'}`,
      w: w > 0 ? w : 24,
      h: h > 0 ? h : 24,
      bg: color
    },
    children: []
  }
}

function resolveTextAlign(
  styleProps: ReturnType<typeof extractStyles>,
  isArabic: boolean
): ExtractedStyle['textAlign'] | undefined {
  if (styleProps.textAlign && styleProps.textAlign !== 'left') {
    return styleProps.textAlign
  }
  if (isArabic) return 'right'
  return undefined
}

function buildTextNode(
  text: string,
  style: CSSStyleDeclaration,
  name: string,
  defaultTextColor = '#111827'
): TreeNode {
  const styleProps = extractStyles(style)
  const isArabic = isArabicText(text)
  const defaultFont = isArabic ? 'Cairo' : 'Inter'
  const fontFamily = styleProps.fontFamily ?? defaultFont
  const textAlign = resolveTextAlign(styleProps, isArabic)
  const color = styleProps.color ?? rgbToHex(style.color) ?? defaultTextColor

  return {
    type: 'text',
    props: {
      name,
      color,
      ...(styleProps.fontSize ? { size: styleProps.fontSize } : { size: 16 }),
      fontFamily,
      autoResize: 'width',
      ...(styleProps.fontWeight ? { weight: styleProps.fontWeight } : {}),
      ...(textAlign ? { textAlign } : {}),
      ...(styleProps.opacity !== undefined ? { opacity: styleProps.opacity } : {})
    },
    children: [text]
  }
}

function assignBorderAndCornerProps(
  props: Record<string, unknown>,
  styleProps: ReturnType<typeof extractStyles>
): void {
  if (styleProps.rounded) props.rounded = styleProps.rounded
  if (styleProps.roundedTL) props.roundedTL = styleProps.roundedTL
  if (styleProps.roundedTR) props.roundedTR = styleProps.roundedTR
  if (styleProps.roundedBL) props.roundedBL = styleProps.roundedBL
  if (styleProps.roundedBR) props.roundedBR = styleProps.roundedBR
  if (styleProps.stroke) props.stroke = styleProps.stroke
  if (styleProps.strokeWidth) props.strokeWidth = styleProps.strokeWidth
  if (styleProps.shadow) props.shadow = styleProps.shadow
}

function assignVisualProps(
  props: Record<string, unknown>,
  styleProps: ReturnType<typeof extractStyles>,
  rect: DOMRect,
  parentWidth: number,
  isParentRowOrGrid: boolean,
  resolvedBgImage: string | null
): void {
  const rw = Math.round(rect.width)
  const isButtonOrBadge =
    props.name &&
    typeof props.name === 'string' &&
    (props.name.includes('Button') || props.name.includes('Link') || props.name.includes('Badge'))

  if (isButtonOrBadge) {
    if (rw > 0) props.w = rw
  } else if (isParentRowOrGrid && rw > 0 && rw < parentWidth * 0.9) {
    props.w = rw
  } else if (!isParentRowOrGrid && (rw >= parentWidth * 0.85 || parentWidth <= 0)) {
    props.w = 'fill'
  } else if (rw > 0) {
    props.w = rw
  }

  if (styleProps.bg) props.bg = styleProps.bg
  if (resolvedBgImage) props.imageSrc = resolvedBgImage
  if (styleProps.opacity !== undefined) props.opacity = styleProps.opacity
  if (styleProps.overflow === 'hidden') props.overflow = 'hidden'

  assignBorderAndCornerProps(props, styleProps)
}

function assignFlexGridProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>
): void {
  props.flex = layoutProps.flex ?? 'row'
  if (layoutProps.wrap) props.wrap = true
  props.gap = layoutProps.gap ?? 24
  if (layoutProps.rowGap) props.rowGap = layoutProps.rowGap
  if (layoutProps.justify && layoutProps.justify !== 'start') props.justify = layoutProps.justify
  if (layoutProps.items && layoutProps.items !== 'start') props.items = layoutProps.items
}

function assignBlockProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>,
  tag: string
): void {
  props.flex = 'col'
  const isSection =
    tag === 'section' || tag === 'main' || tag === 'article' || tag === 'header' || tag === 'footer'
  props.gap = layoutProps.gap ?? (isSection ? 32 : 16)
  props.items = 'center'
}

function assignLayoutProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>,
  style: CSSStyleDeclaration,
  tag: string
): void {
  if (style.position === 'absolute') {
    props.position = 'absolute'
  }

  const display = style.display
  const isFlexOrGrid =
    display === 'flex' || display === 'inline-flex' || display === 'grid' || display === 'inline-grid'

  if (isFlexOrGrid) {
    assignFlexGridProps(props, layoutProps)
  } else {
    assignBlockProps(props, layoutProps, tag)
  }

  if (layoutProps.dir) props.dir = layoutProps.dir
  if (layoutProps.pt) props.pt = layoutProps.pt
  if (layoutProps.pr) props.pr = layoutProps.pr
  if (layoutProps.pb) props.pb = layoutProps.pb
  if (layoutProps.pl) props.pl = layoutProps.pl
}

function buildContainerProps(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
  name: string,
  parentWidth: number,
  isParentRowOrGrid: boolean,
  baseUrl: string
): Record<string, unknown> {
  const styleProps = extractStyles(style)
  const layoutProps = extractLayout(style)
  const bgImageUrl = extractBgImageUrl(style.backgroundImage ?? '')
  const resolvedBgImage = bgImageUrl ? resolveImageUrl(bgImageUrl, baseUrl) : null

  const props: Record<string, unknown> = { name }
  assignVisualProps(props, styleProps, rect, parentWidth, isParentRowOrGrid, resolvedBgImage)
  assignLayoutProps(props, layoutProps, style, el.tagName.toLowerCase())
  return props
}

function walkChildNodes(
  el: Element,
  depth: number,
  maxDepth: number,
  baseUrl: string,
  win: Window,
  currentWidth: number,
  isRowOrGrid: boolean,
  style: CSSStyleDeclaration,
  defaultTextColor: string
): TreeNode[] {
  const children: TreeNode[] = []

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const childTree = walkElement(
        node as Element,
        depth + 1,
        maxDepth,
        baseUrl,
        win,
        currentWidth,
        isRowOrGrid,
        defaultTextColor
      )
      if (childTree) children.push(childTree)
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').trim()
      if (text.length > 0) {
        children.push(buildTextNode(text, style, `Text / ${text.slice(0, 16)}`, defaultTextColor))
      }
    }
  }

  return children
}

function walkElement(
  el: Element,
  depth: number,
  maxDepth: number,
  baseUrl: string,
  win: Window,
  parentWidth: number,
  isParentRowOrGrid: boolean,
  defaultTextColor = '#111827'
): TreeNode | null {
  if (depth > maxDepth) return null

  const style = win.getComputedStyle(el)
  if (shouldSkipElement(el, style)) return null

  const rect = el.getBoundingClientRect()
  const name = semanticName(el)
  const tag = el.tagName.toLowerCase()

  if (isImageElement(el)) return buildImageNode(el, style, rect, baseUrl)
  if (tag === 'svg') return buildSvgNode(el, style, rect)

  if (isTextLeafElement(el)) {
    const text = extractTextContent(el)
    if (!text) return null
    return buildTextNode(text, style, name, defaultTextColor)
  }

  const currentWidth = Math.round(rect.width) || parentWidth
  const display = style.display
  const isRowOrGrid =
    display === 'grid' ||
    display === 'inline-grid' ||
    ((display === 'flex' || display === 'inline-flex') && !style.flexDirection.startsWith('column'))

  const props = buildContainerProps(
    el,
    style,
    rect,
    name,
    parentWidth,
    isParentRowOrGrid,
    baseUrl
  )

  const children = walkChildNodes(
    el,
    depth,
    maxDepth,
    baseUrl,
    win,
    currentWidth,
    isRowOrGrid,
    style,
    defaultTextColor
  )

  if (children.length === 0 && !props.bg && !props.stroke && !props.imageSrc) {
    return null
  }

  return { type: 'frame', props, children }
}
