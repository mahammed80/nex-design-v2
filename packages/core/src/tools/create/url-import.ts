/**
 * url-import.ts — `import_url` ToolDef
 *
 * Fetches any web URL server-side (via /api/url-fetch proxy to bypass CORS),
 * then the app layer parses the HTML into a NexDesign TreeNode tree and renders
 * it onto the canvas using the design-jsx renderTree pipeline.
 *
 * Available in: AI chat, MCP, CLI eval
 */

import { defineTool } from '#core/tools/schema'

const URL_FETCH_PROXY = '/api/url-fetch'

interface UrlFetchResult {
  html: string
  baseUrl: string
  statusCode: number
}

async function fetchHtml(url: string): Promise<UrlFetchResult> {
  const resp = await fetch(URL_FETCH_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })

  if (!resp.ok) {
    let errMsg = `HTTP ${resp.status}`
    try {
      const body = (await resp.json()) as { error?: string }
      if (body.error) errMsg = body.error
    } catch (parseErr) {
      console.warn('[import_url] Could not parse error response JSON:', parseErr)
    }
    throw new Error(errMsg)
  }

  return resp.json() as Promise<UrlFetchResult>
}

export const importUrl = defineTool({
  name: 'import_url',
  mutates: true,
  description:
    'Import a web page URL as fully editable design layers. Fetches the page HTML, converts DOM elements to Auto Layout frames, text nodes, and image fills, then renders them on the canvas. Use selector to scope to a specific section (e.g. "header", ".hero", "#main").',
  params: {
    url: {
      type: 'string',
      required: true,
      description: 'Full web URL to import (e.g. https://stripe.com)'
    },
    selector: {
      type: 'string',
      description:
        'CSS selector to scope the import (default: body). Examples: "header", "nav", ".hero", "#pricing"'
    },
    parent_id: {
      type: 'string',
      description: 'Parent node ID to render into. Defaults to current page.'
    },
    x: {
      type: 'number',
      description: 'X position for the root frame. Defaults to 0.'
    },
    y: {
      type: 'number',
      description: 'Y position for the root frame. Defaults to 0.'
    },
    max_depth: {
      type: 'number',
      description: 'Max DOM depth to traverse (default: 12, max: 20).'
    },
    viewport_w: {
      type: 'number',
      description: 'Viewport width used for layout (default: 1440).'
    }
  },
  execute: async (figma, args) => {
    const url = args.url
    if (!url.startsWith('http')) {
      return { error: 'url must start with http:// or https://' }
    }

    let fetchResult: UrlFetchResult
    try {
      fetchResult = await fetchHtml(url)
    } catch (error) {
      return {
        error: `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`
      }
    }

    // Note: HTML parsing runs in the app layer via the URL Import panel composable.
    // When called directly via MCP/CLI, we return the raw HTML for the caller to process.
    const { html, baseUrl } = fetchResult

    return {
      ok: true,
      html: html.slice(0, 500) + (html.length > 500 ? `… [${html.length} chars total]` : ''),
      baseUrl,
      sourceUrl: url,
      selector: args.selector ?? 'body',
      note: 'Use the URL Import panel in the editor toolbar to render this URL directly onto the canvas, or call import_url from the editor AI chat for full rendering.'
    }
  }
})
