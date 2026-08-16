/**
 * filter.ts — Prune invisible, script, preloader, or non-visual DOM elements.
 */

const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'meta',
  'link',
  'head',
  'template',
  'iframe'
])

export function shouldSkipElement(el: Element, style: CSSStyleDeclaration): boolean {
  const tag = el.tagName.toLowerCase()

  if (SKIP_TAGS.has(tag)) return true

  // Allow images, svg, and canvas
  if (tag === 'img' || tag === 'svg' || tag === 'picture' || tag === 'canvas') {
    return false
  }

  // Skip preloaders, loading splashes, and decorative background particle systems
  const id = el.id.toLowerCase()
  const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase()
  if (
    id.includes('preloader') ||
    cls.includes('preloader') ||
    id.includes('splash') ||
    cls.includes('splash') ||
    cls.includes('particles') ||
    id.includes('particles') ||
    cls.includes('cookie-consent')
  ) {
    return true
  }

  if (style.display === 'none') return true
  if (style.visibility === 'hidden') return true
  if (parseFloat(style.opacity) === 0) return true

  // Skip fixed full-screen backdrop overlays
  if (style.position === 'fixed' && parseFloat(style.zIndex) > 1000) return true

  return false
}
