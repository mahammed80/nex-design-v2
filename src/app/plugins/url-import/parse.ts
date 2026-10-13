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
import { extractStyles, parsePx, rgbToHex, type ExtractedStyle } from './styles'
import {
  cleanPageTitle,
  extractTextContent,
  isArabicText,
  isTextLeafElement,
  semanticName
} from './text'

export interface ParseOptions {
  selector?: string
  maxDepth?: number
  baseUrl?: string
  viewportWidth?: number
}

function injectBaseTag(html: string, baseUrl: string, viewportWidth: number): string {
  const escapedBaseUrl = baseUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  const baseTag = escapedBaseUrl ? `<base href="${escapedBaseUrl}">` : ''
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
  iframe.setAttribute('sandbox', 'allow-same-origin')
  iframe.setAttribute('aria-hidden', 'true')
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

async function waitForDocumentStyles(doc: Document): Promise<void> {
  const stylesheetLoads = Array.from(
    doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  )
    .slice(0, 16)
    .map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) {
            resolve()
            return
          }
          link.addEventListener('load', () => resolve(), { once: true })
          link.addEventListener('error', () => resolve(), { once: true })
        })
    )
  const fontsReady = 'fonts' in doc ? doc.fonts.ready.then(() => undefined) : Promise.resolve()
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500))
  await Promise.race([Promise.all([...stylesheetLoads, fontsReady]).then(() => undefined), timeout])
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export async function parseHtmlToTree(html: string, options: ParseOptions = {}): Promise<TreeNode> {
  const { selector = 'body', maxDepth = 15, baseUrl = '', viewportWidth = 1440 } = options

  const iframe = createHiddenIframe(viewportWidth)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Could not access iframe document')

    const injectedHtml = injectBaseTag(html, baseUrl, viewportWidth)
    doc.open()
    doc.write(injectedHtml)
    doc.close()

    // Scripts stay disabled in the sandbox. Wait only for declarative styles, fonts, and layout.
    await waitForDocumentStyles(doc)

    const targetEl = selector && selector !== 'body' ? doc.querySelector(selector) : doc.body
    if (!targetEl) throw new Error(`Selector "${selector}" matched no elements`)
    const root = targetEl

    const win = iframe.contentWindow ?? window
    const bodyStyle = win.getComputedStyle(doc.body)
    const docStyle = win.getComputedStyle(doc.documentElement)
    const rawBodyBg = rgbToHex(bodyStyle.backgroundColor)
    const rawDocBg = rgbToHex(docStyle.backgroundColor)
    const pageBg = rawBodyBg ?? rawDocBg ?? '#FFFFFF'
    const defaultTextColor = rgbToHex(bodyStyle.color) ?? rgbToHex(docStyle.color) ?? '#111827'

    const tree = walkElement(
      root,
      0,
      maxDepth,
      baseUrl,
      win,
      viewportWidth,
      false,
      defaultTextColor
    )
    if (!tree) return createFallbackNode(viewportWidth)

    // Set the root frame to fixed full-page width and strip accidental HUG sizing
    tree.props.name = cleanPageTitle(doc.title, 'Imported Page')
    tree.props.w = viewportWidth
    tree.props.h = undefined // let height be determined by content
    if (!tree.props.bg) tree.props.bg = pageBg
    tree.props.flex = 'col'
    tree.props.gap = 0
    tree.props.items = 'start'
    // Explicitly tell layout engine: this root frame has FIXED width (1440) and HUG height
    tree.props._counterAxisSizing = 'FIXED'
    tree.props._primaryAxisSizing = 'HUG'

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
      ...absolutePositionProps(el, style, rect),
      ...(resolvedSrc ? { imageSrc: resolvedSrc } : { bg: '#E5E7EB' })
    },
    children: []
  }
}

function buildSvgNode(el: Element, style: CSSStyleDeclaration, rect: DOMRect): TreeNode {
  const w = Math.round(rect.width) || Math.round(parsePx(style.width)) || 24
  const h = Math.round(rect.height) || Math.round(parsePx(style.height)) || 24
  const color = style.color || '#FFFFFF'

  return {
    type: 'frame',
    props: {
      name: `Icon / ${el.id || el.getAttribute('aria-label') || 'svg'}`,
      w: w > 0 ? w : 24,
      h: h > 0 ? h : 24,
      ...absolutePositionProps(el, style, rect),
      bg: color
    },
    children: []
  }
}

function absolutePositionProps(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect
): Record<string, unknown> {
  if (style.position !== 'absolute' && style.position !== 'fixed') return {}
  const parentRect = el.parentElement?.getBoundingClientRect()
  return {
    position: 'absolute',
    x: Math.round(rect.left - (parentRect?.left ?? 0)),
    y: Math.round(rect.top - (parentRect?.top ?? 0))
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
  defaultTextColor = '#111827',
  extraProps: Record<string, unknown> = {}
): TreeNode {
  const styleProps = extractStyles(style)
  const isArabic = isArabicText(text)
  const defaultFont = isArabic ? 'Cairo' : 'Inter'
  const fontFamily = styleProps.fontFamily ?? defaultFont
  const textAlign = resolveTextAlign(styleProps, isArabic)
  const color = styleProps.color ?? rgbToHex(style.color) ?? defaultTextColor
  const isSingleLine = text.length < 40 && !text.includes('\n')

  return {
    type: 'text',
    props: {
      name,
      color,
      ...(styleProps.fontSize ? { size: styleProps.fontSize } : { size: 16 }),
      fontFamily,
      textAutoResize: isSingleLine ? 'width' : 'height',
      ...(isSingleLine ? {} : { w: 'fill' }),
      ...(styleProps.fontWeight ? { weight: styleProps.fontWeight } : {}),
      ...(textAlign ? { textAlign } : {}),
      ...(styleProps.opacity !== undefined ? { opacity: styleProps.opacity } : {}),
      ...extraProps
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
  _parentWidth: number,
  isParentRowOrGrid: boolean,
  resolvedBgImage: string | null
): void {
  const rw = Math.round(rect.width)
  const rh = Math.round(rect.height)
  const isButtonOrBadge = hasNamePart(props, ['Button', 'Link', 'Badge', 'Chip'])
  const isMediaOrAvatar = hasNamePart(props, ['Avatar', 'Icon', 'Image'])

  if (styleProps.position === 'absolute') {
    props.w = rw > 0 ? rw : 1
    props.h = rh > 0 ? rh : 1
  } else if (isButtonOrBadge) {
    // Buttons and badges hug their contents + padding for fluid text editing
    props._counterAxisSizing = 'HUG'
    props._primaryAxisSizing = 'HUG'
  } else if (isMediaOrAvatar && rw > 0) {
    props.w = rw
  } else if (isParentRowOrGrid) {
    // Multi-column cards and items fill and grow proportionally
    props.w = 'fill'
  } else {
    // Block sections and containers fill parent width for 100% fluid responsive resizing
    props.w = 'fill'
  }

  if (styleProps.bg) props.bg = styleProps.bg
  if (resolvedBgImage) props.imageSrc = resolvedBgImage
  if (styleProps.opacity !== undefined) props.opacity = styleProps.opacity
  if (styleProps.overflow === 'hidden') props.overflow = 'hidden'

  assignBorderAndCornerProps(props, styleProps)
}

function hasNamePart(props: Record<string, unknown>, parts: string[]): boolean {
  const name = props.name
  return typeof name === 'string' && parts.some((part) => name.includes(part))
}

function assignFlexGridProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>
): void {
  props.flex = layoutProps.flex ?? 'row'
  if (layoutProps.wrap) props.wrap = true
  props.gap = layoutProps.gap ?? 0
  if (layoutProps.rowGap) props.rowGap = layoutProps.rowGap
  if (layoutProps.justify && layoutProps.justify !== 'start') props.justify = layoutProps.justify
  if (layoutProps.items && layoutProps.items !== 'start') props.items = layoutProps.items
}

function assignBlockProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>,
  inferredGap: number
): void {
  props.flex = 'col'
  props.gap = layoutProps.gap ?? inferredGap
  props.items = layoutProps.items ?? 'stretch'
}

function inferBlockGap(el: Element, win: Window): number {
  const rects = Array.from(el.children)
    .filter((child) => {
      const childStyle = win.getComputedStyle(child)
      return (
        childStyle.display !== 'none' &&
        childStyle.position !== 'absolute' &&
        childStyle.position !== 'fixed'
      )
    })
    .map((child) => child.getBoundingClientRect())
    .filter((rect) => rect.width > 0 || rect.height > 0)
  const gaps: number[] = []
  for (let index = 1; index < rects.length; index++) {
    const gap = Math.round(rects[index].top - rects[index - 1].bottom)
    if (gap >= 0 && gap <= 256) gaps.push(gap)
  }
  if (gaps.length === 0) return 0
  gaps.sort((left, right) => left - right)
  return gaps[Math.floor(gaps.length / 2)]
}

function assignLayoutProps(
  props: Record<string, unknown>,
  layoutProps: ReturnType<typeof extractLayout>,
  style: CSSStyleDeclaration,
  el: Element,
  win: Window
): void {
  if (style.position === 'absolute' || style.position === 'fixed') {
    props.position = 'absolute'
    const rect = el.getBoundingClientRect()
    Object.assign(props, absolutePositionProps(el, style, rect))
  }

  const display = style.display
  const isFlexOrGrid =
    display === 'flex' ||
    display === 'inline-flex' ||
    display === 'grid' ||
    display === 'inline-grid'

  if (isFlexOrGrid) {
    assignFlexGridProps(props, layoutProps)
  } else {
    assignBlockProps(props, layoutProps, inferBlockGap(el, win))
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
  baseUrl: string,
  win: Window
): Record<string, unknown> {
  const styleProps = extractStyles(style)
  const layoutProps = extractLayout(style)
  const bgImageUrl = extractBgImageUrl(style.backgroundImage ?? '')
  const resolvedBgImage = bgImageUrl ? resolveImageUrl(bgImageUrl, baseUrl) : null

  const props: Record<string, unknown> = { name }
  if (style.position === 'absolute' || style.position === 'fixed') {
    styleProps.position = 'absolute'
  }
  assignVisualProps(props, styleProps, rect, parentWidth, isParentRowOrGrid, resolvedBgImage)
  assignLayoutProps(props, layoutProps, style, el, win)
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

function isDarkColor(hex: string): boolean {
  if (!hex.startsWith('#')) return false
  const raw = hex.replace('#', '')
  if (raw.length < 6) return false
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.5
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

  const leaf = buildLeafElement(el, style, rect, baseUrl, name, tag, defaultTextColor)
  if (leaf !== undefined) return leaf

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
    baseUrl,
    win
  )

  let currentTextColor = defaultTextColor
  if (typeof props.bg === 'string' && props.bg) {
    currentTextColor = isDarkColor(props.bg) ? '#FFFFFF' : '#111827'
  }

  const children = walkChildNodes(
    el,
    depth,
    maxDepth,
    baseUrl,
    win,
    currentWidth,
    isRowOrGrid,
    style,
    currentTextColor
  )

  if (children.length === 0 && !props.bg && !props.stroke && !props.imageSrc) {
    return null
  }

  return { type: 'frame', props, children }
}

function buildLeafElement(
  el: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
  baseUrl: string,
  name: string,
  tag: string,
  defaultTextColor: string
): TreeNode | null | undefined {
  if (isImageElement(el)) return buildImageNode(el, style, rect, baseUrl)
  if (tag === 'svg') return buildSvgNode(el, style, rect)
  if (!isTextLeafElement(el)) return undefined

  const text = extractTextContent(el)
  if (!text) return null
  const positionProps = absolutePositionProps(el, style, rect)
  if (positionProps.position === 'absolute' && rect.width > 0) {
    positionProps.w = Math.round(rect.width)
    positionProps.textAutoResize = 'height'
  }
  return buildTextNode(text, style, name, defaultTextColor, positionProps)
}
