import { defineTool } from '@nex-design/core/tools'
import { validateRemoteUrl } from '@nex-design/core/url-policy'

import type { EditorStore } from '@/app/editor/active-store'
import { executeSingleViewportImport, fetchPageHtml } from '@/app/plugins/url-import/pipeline'

const MULTI_VIEWPORT_WIDTHS = [1440, 768, 390] as const
const VIEWPORT_GAP = 80

function countNodes(store: EditorStore, rootId: string): number {
  const root = store.graph.getNode(rootId)
  if (!root) return 0
  return 1 + root.childIds.reduce((total, id) => total + countNodes(store, id), 0)
}

function normalizePublicUrl(value: string): string {
  const normalized = value.match(/^https?:\/\//i) ? value : `https://${value}`
  return validateRemoteUrl(normalized).toString()
}

export function createUrlImportTool(store: EditorStore) {
  return defineTool({
    name: 'import_url',
    mutates: true,
    description:
      'Turn a public web URL into editable design layers on the current canvas. Preserves page hierarchy as Auto Layout frames, text, fills, images, and responsive viewport frames. Use this when the user asks for URL-to-design, not study_reference_url.',
    params: {
      url: {
        type: 'string',
        required: true,
        description: 'Public HTTP(S) page URL to convert into editable layers'
      },
      selector: {
        type: 'string',
        description:
          'Optional CSS selector to import only one section, such as header, .hero, or #pricing'
      },
      parent_id: {
        type: 'string',
        description: 'Parent frame or page ID. Defaults to the current page.'
      },
      x: { type: 'number', description: 'Canvas X position for the imported root' },
      y: { type: 'number', description: 'Canvas Y position for the imported root' },
      viewport_w: {
        type: 'number',
        min: 320,
        max: 2560,
        description: 'Viewport width for a single import. Defaults to 1440.'
      },
      max_depth: {
        type: 'number',
        min: 1,
        max: 20,
        description: 'Maximum DOM nesting depth to convert. Defaults to 15.'
      },
      multi_viewport: {
        type: 'boolean',
        description: 'Create desktop, tablet, and mobile versions side by side'
      }
    },
    execute: async (_figma, args) => {
      try {
        const url = normalizePublicUrl(args.url)
        const parentId = args.parent_id ?? store.state.currentPageId
        if (!store.graph.getNode(parentId)) return { error: `Parent node "${parentId}" not found.` }

        const fetched = await fetchPageHtml(url)
        const widths = args.multi_viewport
          ? [...MULTI_VIEWPORT_WIDTHS]
          : [Math.round(args.viewport_w ?? 1440)]
        const rootIds: string[] = []
        let currentX = args.x ?? 0

        for (const viewportWidth of widths) {
          const rendered = await executeSingleViewportImport(fetched.html, store.graph, {
            selector: args.selector?.trim() || 'body',
            baseUrl: fetched.baseUrl,
            viewportWidth,
            maxDepth: Math.round(args.max_depth ?? 15),
            offsetX: currentX,
            offsetY: args.y ?? 0,
            pageId: parentId,
            loadFont: store.loadFont,
            requestRepaint: () => store.requestRepaint()
          })
          rootIds.push(rendered.id)
          currentX += (store.graph.getNode(rendered.id)?.width ?? viewportWidth) + VIEWPORT_GAP
        }

        store.select(rootIds)
        store.zoomToFit()

        return {
          ok: true,
          sourceUrl: fetched.baseUrl,
          selector: args.selector?.trim() || 'body',
          roots: rootIds.map((id, index) => {
            const node = store.graph.getNode(id)
            return {
              id,
              viewportWidth: widths[index],
              width: node?.width ?? widths[index],
              height: node?.height ?? 0,
              layerCount: countNodes(store, id)
            }
          }),
          note: 'The page is now editable design content. Review imported fonts, image rights, and complex scripted sections before shipping.'
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'URL import failed.' }
      }
    }
  })
}
