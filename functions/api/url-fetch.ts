/**
 * Cloudflare Pages function: /api/url-fetch
 *
 * Proxies HTML page fetches from the browser to bypass CORS restrictions.
 * Runs server-side on Cloudflare Workers — zero cold-start overhead.
 */

interface Env {
  AI_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

const MAX_RESPONSE_BYTES = 2_000_000
const FETCH_TIMEOUT_MS = 15_000

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Rate-limit via AI_RATE_LIMITER binding if available
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

  const url = body.url
  if (typeof url !== 'string' || !url.startsWith('http')) {
    return json({ error: 'url must be a valid http(s) URL' }, 400)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexDesignBot/1.0; +https://nexdesign.dev)',
        Accept: 'text/html,application/xhtml+xml,*/*'
      },
      redirect: 'follow',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.includes('html') && !contentType.includes('text')) {
      return json(
        { error: `URL did not return HTML (content-type: ${contentType})` },
        422
      )
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      return json({ error: 'Response exceeds 2 MB limit' }, 422)
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

    return json({ html, baseUrl: upstream.url, statusCode: upstream.status })
  } catch (error) {
    clearTimeout(timeoutId)
    const message =
      error instanceof Error
        ? error.name === 'AbortError'
          ? 'Request timed out after 15s'
          : error.message
        : 'Fetch failed'
    return json({ error: message }, 502)
  }
}
