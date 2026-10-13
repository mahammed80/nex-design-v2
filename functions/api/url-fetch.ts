/**
 * Cloudflare Pages function: /api/url-fetch
 *
 * Proxies public HTML, stylesheets, and images for URL-to-design imports.
 */

import { rewriteCssUrls, validateRemoteUrl } from '@nex-design/core/url-policy'

interface Env {
  AI_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

interface PagesContext {
  request: Request
  env: Env
}

const MAX_HTML_BYTES = 5_000_000
const MAX_RAW_BYTES = 5_000_000
const MAX_CSS_BYTES = 3_000_000
const MAX_CSS_PER_FILE = 600_000
const MAX_STYLESHEETS = 12
const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 20_000

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function requestHeaders(raw: boolean): HeadersInit {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; NexDesignBot/1.0; +https://nexdesign.dev)',
    Accept: raw
      ? 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*'
      : 'text/html,application/xhtml+xml,text/css,*/*'
  }
}

function requestUrl(body: Record<string, unknown>): URL {
  if (typeof body.url !== 'string') throw new Error('url must be a valid HTTP(S) URL')
  return validateRemoteUrl(body.url)
}

function fetchErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Fetch failed'
  return error.name === 'AbortError' ? 'Request timed out after 20s' : error.message
}

async function fetchPublicUrl(
  initialUrl: URL,
  options: { raw: boolean; signal: AbortSignal }
): Promise<Response> {
  let currentUrl = initialUrl
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      headers: requestHeaders(options.raw),
      redirect: 'manual',
      signal: options.signal
    })
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get('location')
    if (!location) return response
    currentUrl = validateRemoteUrl(location, currentUrl.toString())
  }
  throw new Error(`URL redirected more than ${MAX_REDIRECTS} times.`)
}

async function readLimitedBytes(response: Response, limit: number): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > limit) {
    throw new Error(`Response exceeds ${Math.round(limit / 1_000_000)} MB limit`)
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > limit) {
    throw new Error(`Response exceeds ${Math.round(limit / 1_000_000)} MB limit`)
  }
  return buffer
}

async function fetchCss(cssUrl: URL, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetchPublicUrl(cssUrl, { raw: false, signal })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('css') && !contentType.includes('text')) return null
    const buffer = await readLimitedBytes(response, MAX_CSS_PER_FILE)
    const css = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    return rewriteCssUrls(css, response.url || cssUrl.toString())
  } catch {
    return null
  }
}

function stylesheetLinks(html: string): Array<{ tag: string; href: string }> {
  const links: Array<{ tag: string; href: string }> = []
  const pattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null && links.length < MAX_STYLESHEETS) {
    const href = /\bhref=["']([^"']+)["']/.exec(match[0])?.[1]
    if (href) links.push({ tag: match[0], href })
  }
  return links
}

async function inlineExternalCss(html: string, baseUrl: URL, signal: AbortSignal): Promise<string> {
  let totalBytes = 0
  let result = html
  for (const { tag, href } of stylesheetLinks(html)) {
    if (totalBytes >= MAX_CSS_BYTES) break
    let cssUrl: URL
    try {
      cssUrl = validateRemoteUrl(href, baseUrl.toString())
    } catch {
      continue
    }
    const css = await fetchCss(cssUrl, signal)
    if (!css || totalBytes + css.length > MAX_CSS_BYTES) continue
    totalBytes += css.length
    const escapedCss = css.replace(/<\/style>/gi, '<\\/style>')
    result = result.replace(
      tag,
      `<style data-inlined-from="${cssUrl.toString()}">\n${escapedCss}\n</style>`
    )
  }
  return result
}

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  if (context.env.AI_RATE_LIMITER) {
    const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const result = await context.env.AI_RATE_LIMITER.limit({ key: `url-fetch:${ip}` })
    if (!result.success) {
      return json({ error: 'Rate limit exceeded. Please wait before retrying.' }, 429)
    }
  }

  let body: Record<string, unknown>
  try {
    body = (await context.request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  let url: URL
  try {
    url = requestUrl(body)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid URL' }, 400)
  }

  const raw = body.raw === true
  const noInline = body.noInline === true
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetchPublicUrl(url, { raw, signal: controller.signal })
    const contentType = upstream.headers.get('content-type') ?? ''

    if (raw) {
      if (!contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
        return json({ error: `URL did not return an image (content-type: ${contentType})` }, 422)
      }
      const buffer = await readLimitedBytes(upstream, MAX_RAW_BYTES)
      return new Response(buffer, {
        status: upstream.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    if (!contentType.includes('html') && !contentType.includes('text')) {
      return json({ error: `URL did not return HTML (content-type: ${contentType})` }, 422)
    }

    const buffer = await readLimitedBytes(upstream, MAX_HTML_BYTES)
    let html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    const finalUrl = validateRemoteUrl(upstream.url || url.toString())
    if (!noInline) html = await inlineExternalCss(html, finalUrl, controller.signal)

    return json({ html, baseUrl: finalUrl.toString(), statusCode: upstream.status })
  } catch (error) {
    return json({ error: fetchErrorMessage(error) }, 502)
  } finally {
    clearTimeout(timeoutId)
  }
}
