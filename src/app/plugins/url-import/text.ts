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
  nav: 'Nav',
  header: 'Header',
  footer: 'Footer',
  main: 'Main',
  section: 'Section',
  article: 'Article',
  aside: 'Aside',
  button: 'Button',
  a: 'Link'
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

export function semanticName(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const text = extractTextContent(el)
  const snippet = text.slice(0, 28).replace(/[^\p{L}\p{N}\s_-]/gu, '').trim()

  const knownName = TAG_NAME_MAP[tag]
  if (knownName) {
    return snippet ? `${knownName} / ${snippet}` : knownName
  }

  const id = el.id ? `#${el.id}` : ''
  const cls = el.classList[0] ? `.${el.classList[0]}` : ''
  const hint = id || cls
  return hint ? `${tag}${hint}` : tag
}
