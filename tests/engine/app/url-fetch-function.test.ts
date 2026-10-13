import { afterEach, describe, expect, test } from 'bun:test'

import { onRequestPost } from '#functions/api/url-fetch'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function requestContext(body: Record<string, unknown>) {
  return {
    env: {},
    request: new Request('https://nexdesign.dev/api/url-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  }
}

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : input.toString()
}

describe('production URL fetch function', () => {
  test('inlines external CSS and rewrites its relative assets', async () => {
    globalThis.fetch = (async (input) => {
      const url = requestUrl(input)
      if (url.endsWith('/styles/main.css')) {
        return new Response('.hero{background:url(../img/hero.png)}', {
          headers: { 'Content-Type': 'text/css' }
        })
      }
      return new Response(
        '<html><head><link rel="stylesheet" href="/styles/main.css"></head><body>OK</body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    }) as typeof fetch

    const response = await onRequestPost(requestContext({ url: 'https://example.com/page' }))
    const result = (await response.json()) as { html: string; baseUrl: string }

    expect(response.status).toBe(200)
    expect(result.baseUrl).toBe('https://example.com/page')
    expect(result.html).toContain('data-inlined-from="https://example.com/styles/main.css"')
    expect(result.html).toContain('url(https://example.com/img/hero.png)')
  })

  test('returns proxied image bytes in raw mode', async () => {
    globalThis.fetch = (async () =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { 'Content-Type': 'image/png' }
      })) as typeof fetch

    const response = await onRequestPost(
      requestContext({ url: 'https://images.example.com/photo.png', raw: true })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([137, 80, 78, 71])
  })

  test('rejects private-network targets before fetching', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('unexpected')
    }) as typeof fetch

    const response = await onRequestPost(requestContext({ url: 'http://127.0.0.1/admin' }))

    expect(response.status).toBe(400)
    expect(called).toBe(false)
  })
})
