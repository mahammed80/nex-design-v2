/**
 * image.ts — Handle <img>, <picture>, and background-image CSS fills.
 */

const URL_FETCH_PROXY = '/api/url-fetch'

export function resolveImageUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href
  } catch {
    return src
  }
}

export function extractBgImageUrl(bgImage: string): string | null {
  const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
  return match ? match[1] : null
}

export async function fetchImageBytes(imageUrl: string): Promise<Uint8Array | null> {
  if (typeof fetch === 'undefined') return null

  try {
    const resp = await fetch(URL_FETCH_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, raw: true })
    })
    if (!resp.ok) return null

    const buf = await resp.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

export function isImageElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  return tag === 'img' || tag === 'picture' || tag === 'video'
}

export function getImgSrc(el: Element): string | null {
  const tag = el.tagName.toLowerCase()
  if (tag === 'img') {
    return el.getAttribute('src') ?? el.getAttribute('data-src') ?? null
  }
  if (tag === 'picture') {
    const img = el.querySelector('img')
    return img?.getAttribute('src') ?? img?.getAttribute('data-src') ?? null
  }
  return null
}

export function getImgAlt(el: Element): string {
  return (el as HTMLImageElement).alt || el.querySelector('img')?.alt || 'Image'
}
