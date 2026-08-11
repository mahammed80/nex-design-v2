import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import type { Plugin } from 'vite'

const PROXY_PATH = '/api/poolside/v1/chat/completions'
const POOLSIDE_URL = 'https://inference.poolside.ai/v1/chat/completions'
const MAX_REQUEST_BYTES = 2_000_000
const STREAM_TIMEOUT_MS = 10 * 60 * 1000

function readBody(request: IncomingMessage): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_REQUEST_BYTES) {
        reject(new Error('AI request exceeds the 2 MB proxy limit.'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

async function proxyPoolside(
  request: IncomingMessage,
  response: ServerResponse,
  configuredApiKey: string
): Promise<void> {
  const apiKey = configuredApiKey.trim()
  if (!apiKey) {
    sendJson(response, 503, { error: { message: 'Poolside is not configured on this server.' } })
    return
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
    response.once('close', () => {
      clearTimeout(timeoutId)
      if (!response.writableEnded) controller.abort()
    })
    const upstream = await fetch(POOLSIDE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: await readBody(request),
      signal: controller.signal
    })
    response.statusCode = upstream.status
    const contentType = upstream.headers.get('content-type')
    if (contentType) response.setHeader('Content-Type', contentType)
    if (!upstream.body) {
      response.end()
      return
    }
    await pipeline(Readable.fromWeb(upstream.body as never), response)
    clearTimeout(timeoutId)
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined)
      return
    }
    sendJson(response, 502, {
      error: { message: error instanceof Error ? error.message : 'Poolside proxy failed.' }
    })
  }
}

export function poolsideProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'nexdesign-poolside-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'POST' || request.url?.split('?')[0] !== PROXY_PATH) {
          next()
          return
        }
        void proxyPoolside(request, response, apiKey)
      })
    }
  }
}
