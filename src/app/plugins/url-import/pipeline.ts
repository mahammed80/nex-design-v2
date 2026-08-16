/**
 * pipeline.ts — Image processing and font loading pipeline for URL Import.
 */

import type { SceneGraph } from '@nex-design/core/scene-graph'

import { fetchImageBytes } from './image'

export interface TreeLikeNode {
  props?: Record<string, unknown>
  children?: unknown[]
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
