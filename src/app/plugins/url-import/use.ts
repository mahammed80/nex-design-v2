/**
 * use.ts — Composable for the URL Import panel.
 *
 * Manages URL input state, history, fetch lifecycle, and error handling.
 * Delegates HTML parsing, image downloading, rendering, and font loading.
 */

import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import { downloadAndStoreTreeImages, finalizeImportedTreeFonts } from './pipeline'

const URL_FETCH_PROXY = '/api/url-fetch'

export type ImportStatus = 'idle' | 'fetching' | 'parsing' | 'rendering' | 'done' | 'error'

export interface ImportResult {
  id: string
  name: string
  totalNodes: number
  width: number
  height: number
  sourceUrl: string
}

const MAX_HISTORY = 10

export function useUrlImport() {
  const editor = useEditorStore()

  const url = ref('')
  const selector = ref('')
  const status = ref<ImportStatus>('idle')
  const errorMsg = ref('')
  const result = ref<ImportResult | null>(null)
  const history = useLocalStorage<string[]>('nex-url-import-history', [])

  const isLoading = computed(
    () =>
      status.value === 'fetching' ||
      status.value === 'parsing' ||
      status.value === 'rendering'
  )

  const statusLabel = computed(() => {
    switch (status.value) {
      case 'fetching':
        return 'Fetching page…'
      case 'parsing':
        return 'Parsing layout & images…'
      case 'rendering':
        return 'Rendering to canvas…'
      case 'done':
        return `Done — ${result.value?.totalNodes ?? 0} layers created`
      case 'error':
        return errorMsg.value
      default:
        return ''
    }
  })

  function addToHistory(urlStr: string) {
    const cleaned = history.value.filter((h) => h !== urlStr)
    history.value = [urlStr, ...cleaned].slice(0, MAX_HISTORY)
  }

  function reset() {
    status.value = 'idle'
    errorMsg.value = ''
    result.value = null
  }

  async function fetchPageHtml(normalizedUrl: string) {
    status.value = 'fetching'
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

  async function importUrl() {
    const targetUrl = url.value.trim()
    if (!targetUrl) return

    const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
    reset()

    try {
      // 1. Fetch HTML
      const fetchResult = await fetchPageHtml(normalizedUrl)

      // 2. Parse HTML → TreeNode using hidden desktop iframe
      status.value = 'parsing'
      const { parseHtmlToTree } = (await import('./parse')) as {
        parseHtmlToTree: (html: string, opts?: object) => Promise<object>
      }

      const tree = (await parseHtmlToTree(fetchResult.html, {
        selector: selector.value.trim() || 'body',
        maxDepth: 15,
        baseUrl: fetchResult.baseUrl,
        viewportWidth: 1440
      })) as { props?: Record<string, unknown>; children?: unknown[] }

      // 3. Download and register all raster images
      await downloadAndStoreTreeImages(tree, editor.graph)

      // 4. Render TreeNode → SceneGraph nodes
      status.value = 'rendering'
      const { renderTree } = (await import('@nex-design/core/design-jsx')) as {
        renderTree: (
          graph: object,
          tree: object,
          opts?: { parentId?: string; x?: number; y?: number }
        ) => Promise<{ id: string; name: string; type: string; childIds: string[] }>
      }

      const pageId = editor.state.currentPageId
      const rendered = await renderTree(editor.graph, tree, {
        parentId: pageId,
        x: 0,
        y: 0
      })

      // 5. Finalize fonts (Google Fonts download, clear picture caches, and repaint)
      await finalizeImportedTreeFonts(
        editor.graph,
        rendered.id,
        editor.loadFont,
        () => {
          editor.requestRender?.()
          editor.requestRepaint?.()
        }
      )

      const rootNode = editor.graph.getNode(rendered.id)

      function countNodes(id: string): number {
        const n = editor.graph.getNode(id)
        if (!n) return 0
        return 1 + n.childIds.reduce((sum: number, cid: string) => sum + countNodes(cid), 0)
      }

      result.value = {
        id: rendered.id,
        name: rendered.name,
        totalNodes: countNodes(rendered.id),
        width: rootNode?.width ?? 0,
        height: rootNode?.height ?? 0,
        sourceUrl: normalizedUrl
      }

      status.value = 'done'
      addToHistory(normalizedUrl)

      // Select and zoom to the imported frame
      editor.select([rendered.id])
      editor.zoomToFit()
    } catch (error) {
      status.value = 'error'
      errorMsg.value = error instanceof Error ? error.message : 'Import failed'
    }
  }

  function tryHistoryItem(historyUrl: string) {
    url.value = historyUrl
    void importUrl()
  }

  function clearHistory() {
    history.value = []
  }

  return {
    url,
    selector,
    status,
    statusLabel,
    errorMsg,
    result,
    history,
    isLoading,
    importUrl,
    tryHistoryItem,
    clearHistory,
    reset
  }
}
