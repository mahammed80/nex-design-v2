/**
 * pipeline.ts — Image processing, font loading, and viewport rendering pipeline for URL Import.
 */

import type { SceneGraph } from '@nex-design/core/scene-graph'

import { fetchImageBytes } from './image'

const URL_FETCH_PROXY = '/api/url-fetch'

export interface TreeLikeNode {
  props?: Record<string, unknown>
  children?: unknown[]
}

export async function fetchPageHtml(normalizedUrl: string): Promise<{
  html: string
  baseUrl: string
  statusCode: number
}> {
  const proxyResp = await fetch(URL_FETCH_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: normalizedUrl })
  })

  if (!proxyResp.ok) {
    const err = (await proxyResp.json().catch(() => ({ error: `HTTP ${proxyResp.status}` }))) as {
      error?: string
    }
    throw new Error(err.error ?? `HTTP ${proxyResp.status}`)
  }

  return proxyResp.json() as Promise<{
    html: string
    baseUrl: string
    statusCode: number
  }>
}

/**
 * Traverses TreeNode, downloads images through the CORS proxy,
 * computes hashes, and registers them in editor.graph.images.
 */
export async function downloadAndStoreTreeImages(
  tree: TreeLikeNode,
  graph: SceneGraph
): Promise<void> {
  try {
    const { computeImageHash } = (await import('@nex-design/core/figma-api')) as {
      computeImageHash: (data: Uint8Array) => string
    }

    const imagePromises: Promise<void>[] = []

    const process = (n: TreeLikeNode) => {
      const imgSrc = n.props?.imageSrc
      if (typeof imgSrc === 'string' && imgSrc) {
        imagePromises.push(
          (async () => {
            const bytes = await fetchImageBytes(imgSrc)
            if (bytes && bytes.length > 0) {
              const hash = computeImageHash(bytes)
              graph.images.set(hash, bytes)
              if (n.props) {
                n.props.imageHash = hash
              }
            }
          })()
        )
      }
      if (Array.isArray(n.children)) {
        for (const c of n.children) {
          if (c && typeof c === 'object') {
            process(c as TreeLikeNode)
          }
        }
      }
    }

    process(tree)
    await Promise.allSettled(imagePromises)
  } catch (err) {
    console.warn('[url-import] Image processing error:', err)
  }
}

/**
 * Loads all font families used by the imported tree into CanvasKit,
 * ensures Arabic fallbacks, clears textPicture caches, and repaints.
 */
export async function finalizeImportedTreeFonts(
  graph: SceneGraph,
  rootId: string,
  loadFontFn?: (family: string, style?: string) => Promise<unknown>,
  requestRepaintFn?: () => void
): Promise<void> {
  try {
    const { fontManager } = (await import('@nex-design/core/text')) as {
      fontManager: {
        collectFontKeys: (g: object, ids: string[]) => [string, string][]
        loadFont: (family: string, style?: string) => Promise<unknown>
      }
    }
    const { computeAllLayouts } = (await import('@nex-design/core/layout')) as {
      computeAllLayouts: (g: object) => void
    }

    const fontKeys = fontManager.collectFontKeys(graph, [rootId])
    if (fontKeys.length > 0) {
      await Promise.all(
        fontKeys.map(([family, style]) =>
          loadFontFn ? loadFontFn(family, style) : fontManager.loadFont(family, style)
        )
      )
    }

    await fontManager.loadFont('Cairo', 'Regular')
    await fontManager.loadFont('Cairo', 'Bold')
    await fontManager.loadFont('Tajawal', 'Regular')
    await fontManager.loadFont('Tajawal', 'Bold')

    // Invalidate all Skia picture caches on text nodes so they re-render with the loaded fonts
    const clearPics = (id: string) => {
      const node = graph.getNode(id)
      if (!node) return
      if (node.type === 'TEXT') {
        node.textPicture = null
      }
      for (const cid of node.childIds) clearPics(cid)
    }
    clearPics(rootId)

    computeAllLayouts(graph)
    requestRepaintFn?.()
  } catch (fontErr) {
    console.warn('[url-import] Font loading error:', fontErr)
  }
}

export interface ImportOptions {
  selector?: string
  baseUrl?: string
  viewportWidth: number
  offsetX?: number
  pageId: string
  loadFont?: (family: string, style?: string) => Promise<unknown>
  requestRepaint?: () => void
}

export async function executeSingleViewportImport(
  html: string,
  graph: SceneGraph,
  opts: ImportOptions
): Promise<{ id: string; name: string }> {
  const { parseHtmlToTree } = (await import('./parse')) as {
    parseHtmlToTree: (h: string, options?: object) => Promise<object>
  }

  const tree = (await parseHtmlToTree(html, {
    selector: opts.selector || 'body',
    maxDepth: 15,
    baseUrl: opts.baseUrl,
    viewportWidth: opts.viewportWidth
  })) as TreeLikeNode

  await downloadAndStoreTreeImages(tree, graph)

  const { renderTree } = (await import('@nex-design/core/design-jsx')) as {
    renderTree: (
      g: object,
      t: object,
      options?: { parentId?: string; x?: number; y?: number }
    ) => Promise<{ id: string; name: string; type: string; childIds: string[] }>
  }

  const rendered = await renderTree(graph, tree, {
    parentId: opts.pageId,
    x: opts.offsetX ?? 0,
    y: 0
  })

  await finalizeImportedTreeFonts(graph, rendered.id, opts.loadFont, opts.requestRepaint)
  return rendered
}
