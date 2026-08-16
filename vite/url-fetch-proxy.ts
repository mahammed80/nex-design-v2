import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

const PROXY_PATH = '/api/url-fetch'
const MAX_RESPONSE_BYTES = 5_000_000 // 5 MB
const FETCH_TIMEOUT_MS = 15_000

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

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    const finalUrl = upstream.url

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
      message = error.name === 'AbortError' ? 'Request timed out after 15s' : error.message
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
