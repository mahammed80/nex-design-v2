/**
 * text.ts — Text element detection, Arabic support, and semantic naming.
 */

const TAG_NAME_MAP: Record<string, string> = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  p: 'Paragraph',
  li: 'List Item',
  nav: 'Navigation',
  header: 'Header',
  footer: 'Footer',
  main: 'Main',
  section: 'Section',
  article: 'Article',
  aside: 'Aside',
  button: 'Button',
  a: 'Link',
  form: 'Form',
  input: 'Input',
  img: 'Image',
  svg: 'Icon'
}

export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

export function isTextLeafElement(el: Element): boolean {
  if (el.children.length === 0 && (el.textContent ?? '').trim().length > 0) {
    return true
  }
  return false
}

export function extractTextContent(el: Element | Node): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function cleanPageTitle(rawTitle: string, defaultName = 'Imported Page'): string {
  if (!rawTitle) return defaultName
  // Split on pipe or dash to get concise name (e.g. "منصة Mr. Reda التعليمية | فيزياء..." -> "منصة Mr. Reda التعليمية")
  const parts = rawTitle.split(/[|•–—]/)
  const mainPart = (parts[0] ?? '').trim()
  return mainPart.length > 0 ? mainPart.slice(0, 40) : defaultName
}

export function semanticName(el: Element): string {
  const tag = el.tagName.toLowerCase()

  // Section with ID
  if (tag === 'section' && el.id) {
    const capitalizedId = el.id.charAt(0).toUpperCase() + el.id.slice(1)
    return `Section / ${capitalizedId}`
  }

  // Cards & containers with distinctive classes
  const cls = typeof el.className === 'string' ? el.className.toLowerCase() : ''
  if (cls.includes('card')) {
    const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
    const headingText = heading ? extractTextContent(heading).slice(0, 24) : ''
    return headingText ? `Card / ${headingText}` : 'Card'
  }
  if (cls.includes('hero')) {
    return 'Section / Hero'
  }
  if (cls.includes('grid')) {
    return 'Grid / Layout'
  }

  const text = extractTextContent(el)
  const snippet = text.slice(0, 24).trim()

  const knownName = TAG_NAME_MAP[tag]
  if (knownName) {
    return snippet ? `${knownName} / ${snippet}` : knownName
  }

  if (el.id) return `#${el.id}`
  const firstClass = el.classList[0]
  if (firstClass) return `.${firstClass}`
  return tag
}
