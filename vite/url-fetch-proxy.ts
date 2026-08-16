import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

const PROXY_PATH = '/api/url-fetch'
const MAX_RESPONSE_BYTES = 5_000_000 // 5 MB
const FETCH_TIMEOUT_MS = 20_000
const MAX_CSS_BYTES = 3_000_000 // 3 MB total inline CSS budget
const MAX_CSS_PER_FILE = 600_000 // 600 KB per CSS file

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      raw += chunk
      if (raw.length > 100_000) {
        reject(new Error('Request body too large'))
        request.destroy()
      }
    })
    request.on('end', () => resolve(raw))
    request.on('error', reject)
  })
}

/** Resolve a possibly-relative URL against the page base URL. */
function resolveHref(href: string, baseUrl: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

/**
 * Fetch an external stylesheet through the Node.js server side (no CORS).
 * Returns the raw CSS text or null if the fetch fails.
 */
async function fetchCss(cssUrl: string, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(cssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/css,*/*'
      },
      redirect: 'follow',
      signal
    })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_CSS_PER_FILE) return null
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  } catch {
    return null
  }
}

/**
 * Inline all <link rel="stylesheet"> CSS into <style> blocks.
 * This is necessary because the browser sandbox iframe cannot load
 * cross-origin CSS from CDNs (CORP: same-site, CORS restrictions).
 * By inlining on the server side (Node.js has no CORS), styles are
 * available immediately when the iframe renders.
 */
async function inlineExternalCss(html: string, baseUrl: string, signal: AbortSignal): Promise<string> {
  const links: Array<{ tag: string; href: string }> = []
  let m: RegExpExecArray | null

  const pattern2 = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi
  while ((m = pattern2.exec(html)) !== null) {
    const tag = m[0]
    const hrefMatch = /\bhref=["']([^"']+)["']/.exec(tag)
    if (hrefMatch) {
      links.push({ tag, href: hrefMatch[1] })
    }
  }

  if (links.length === 0) return html

  // Fetch all in parallel with a shared budget
  let totalBytes = 0
  const cssMap = new Map<string, string | null>()

  await Promise.all(
    links.map(async ({ href }) => {
      if (totalBytes > MAX_CSS_BYTES) {
        cssMap.set(href, null)
        return
      }
      const resolved = resolveHref(href, baseUrl)
      const css = await fetchCss(resolved, signal)
      if (css) {
        totalBytes += css.length
        cssMap.set(href, css)
      } else {
        cssMap.set(href, null)
      }
    })
  )

  // Replace each <link rel="stylesheet"> with an inlined <style> block
  let result = html
  for (const { tag, href } of links) {
    const css = cssMap.get(href)
    if (css) {
      const escaped = css.replace(/<\/style>/gi, '<\\/style>')
      result = result.replace(tag, `<style data-inlined-from="${href}">\n${escaped}\n</style>`)
    }
    // If css is null (failed to fetch), leave the <link> tag as-is so the browser
    // can still try to load it directly (might work for same-CDN resources).
  }

  return result
}

async function proxyUrlFetch(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: Record<string, unknown>
  try {
    const raw = await readBody(request)
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    sendJson(response, 400, { error: 'Invalid JSON body' })
    return
  }

  const url = body.url
  if (typeof url !== 'string' || !url.startsWith('http')) {
    sendJson(response, 400, { error: 'url must be a valid http(s) URL' })
    return
  }

  const isRaw = body.raw === true
  const noInline = body.noInline === true
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: isRaw
          ? 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*'
          : 'text/html,application/xhtml+xml,*/*'
      },
      redirect: 'follow',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const contentType = upstream.headers.get('content-type') ?? ''

    // If raw binary mode is requested (e.g. image fetching)
    if (isRaw) {
      const buffer = await upstream.arrayBuffer()
      if (buffer.byteLength > MAX_RESPONSE_BYTES) {
        sendJson(response, 422, { error: 'Image exceeds size limit' })
        return
      }
      response.statusCode = upstream.status
      response.setHeader('Content-Type', contentType || 'image/png')
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.end(Buffer.from(buffer))
      return
    }

    if (!contentType.includes('html') && !contentType.includes('text')) {
      sendJson(response, 422, {
        error: `URL did not return HTML (content-type: ${contentType})`
      })
      return
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      sendJson(response, 422, { error: 'Response exceeds 5 MB limit' })
      return
    }

    let html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    const finalUrl = upstream.url

    // Inline external CSS on the server side to bypass browser CORS / CORP restrictions
    // that would prevent the sandboxed iframe from loading cross-origin stylesheets.
    // This is the critical step that makes CSS-heavy sites (Stripe, GitHub, etc.) render correctly.
    if (!noInline && !isRaw) {
      const cssController = new AbortController()
      const cssTimeout = setTimeout(() => cssController.abort(), 12_000)
      try {
        html = await inlineExternalCss(html, finalUrl, cssController.signal)
      } catch (cssErr) {
        // Non-fatal: proceed with raw HTML if CSS inlining fails
        console.warn('[url-fetch-proxy] CSS inlining failed, proceeding with raw HTML:', cssErr)
      } finally {
        clearTimeout(cssTimeout)
      }
    }

    sendJson(response, 200, {
      html,
      baseUrl: finalUrl,
      statusCode: upstream.status
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined)
      return
    }
    let message = 'Fetch failed'
    if (error instanceof Error) {
      message = error.name === 'AbortError' ? 'Request timed out after 20s' : error.message
    }
    sendJson(response, 502, { error: message })
  }
}

export function urlFetchProxyPlugin(): Plugin {
  return {
    name: 'nexdesign-url-fetch-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'POST' || request.url?.split('?')[0] !== PROXY_PATH) {
          next()
          return
        }
        void proxyUrlFetch(request, response)
      })
    }
  }
}
