/**
 * use.ts — Composable for URL & HTML to Design.
 *
 * Supports 3 industry-standard import methods:
 * 1. Web URL (with Desktop, Laptop, Tablet, Mobile breakpoints & multi-import)
 * 2. Direct Code Snippet (HTML / CSS / Tailwind / JSX)
 * 3. Captured DOM JSON / .h2d snapshot
 */

import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import { executeSingleViewportImport, fetchPageHtml } from './pipeline'

export type ImportTab = 'url' | 'code' | 'json'
export type ImportStatus = 'idle' | 'fetching' | 'parsing' | 'rendering' | 'done' | 'error'

export interface ViewportOption {
  id: string
  label: string
  width: number
  icon: string
}

export const VIEWPORT_OPTIONS: ViewportOption[] = [
  { id: 'desktop', label: 'Desktop', width: 1440, icon: 'monitor' },
  { id: 'laptop', label: 'Laptop', width: 1200, icon: 'laptop' },
  { id: 'tablet', label: 'Tablet', width: 768, icon: 'tablet' },
  { id: 'mobile', label: 'Mobile', width: 390, icon: 'smartphone' }
]

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

  const activeTab = ref<ImportTab>('url')
  const url = ref('')
  const selector = ref('')
  const rawCode = ref('')
  const rawJson = ref('')
  const selectedViewport = ref<number>(1440)
  const multiViewport = ref(false)

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
        return 'Fetching webpage…'
      case 'parsing':
        return 'Analyzing DOM, layout & assets…'
      case 'rendering':
        return 'Generating editable layers…'
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

  function countGraphNodes(id: string): number {
    const n = editor.graph.getNode(id)
    if (!n) return 0
    return 1 + n.childIds.reduce((sum: number, cid: string) => sum + countGraphNodes(cid), 0)
  }

  async function runImport(html: string, baseUrl: string, isMulti: boolean, srcLabel: string) {
    let renderedLast: { id: string; name: string } | null = null
    const pageId = editor.state.currentPageId

    const opts = {
      selector: selector.value.trim() || 'body',
      baseUrl,
      pageId,
      loadFont: editor.loadFont,
      requestRepaint: () => {
        editor.requestRender?.()
        editor.requestRepaint?.()
      }
    }

    if (isMulti) {
      const viewports = [1440, 768, 390]
      let currentX = 0
      for (const vp of viewports) {
        const rendered = await executeSingleViewportImport(html, editor.graph, {
          ...opts,
          viewportWidth: vp,
          offsetX: currentX
        })
        renderedLast = rendered
        const node = editor.graph.getNode(rendered.id)
        currentX += (node?.width ?? vp) + 80
      }
    } else {
      renderedLast = await executeSingleViewportImport(html, editor.graph, {
        ...opts,
        viewportWidth: selectedViewport.value,
        offsetX: 0
      })
    }

    if (renderedLast) {
      const rootNode = editor.graph.getNode(renderedLast.id)
      result.value = {
        id: renderedLast.id,
        name: renderedLast.name,
        totalNodes: countGraphNodes(renderedLast.id),
        width: rootNode?.width ?? selectedViewport.value,
        height: rootNode?.height ?? 0,
        sourceUrl: srcLabel
      }
      editor.select([renderedLast.id])
      editor.zoomToFit()
    }
  }

  async function importUrl() {
    const targetUrl = url.value.trim()
    if (!targetUrl) return
    const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
    reset()

    try {
      status.value = 'fetching'
      const fetchResult = await fetchPageHtml(normalizedUrl)
      status.value = 'parsing'
      await runImport(fetchResult.html, fetchResult.baseUrl, multiViewport.value, normalizedUrl)
      status.value = 'done'
      addToHistory(normalizedUrl)
    } catch (error) {
      status.value = 'error'
      errorMsg.value = error instanceof Error ? error.message : 'Import failed'
    }
  }

  async function importCode() {
    const code = rawCode.value.trim()
    if (!code) return
    reset()

    try {
      status.value = 'parsing'
      await runImport(code, '', false, 'HTML Code Snippet')
      status.value = 'done'
    } catch (error) {
      status.value = 'error'
      errorMsg.value = error instanceof Error ? error.message : 'Code import failed'
    }
  }

  async function importJson() {
    const jsonStr = rawJson.value.trim()
    if (!jsonStr) return
    reset()

    try {
      status.value = 'parsing'
      const parsed = JSON.parse(jsonStr) as { html?: string; code?: string }
      const htmlContent = parsed.html || parsed.code || jsonStr
      await runImport(htmlContent, '', false, 'JSON Snapshot')
      status.value = 'done'
    } catch (error) {
      status.value = 'error'
      errorMsg.value = error instanceof Error ? error.message : 'Invalid JSON snapshot'
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
    activeTab,
    url,
    selector,
    rawCode,
    rawJson,
    selectedViewport,
    multiViewport,
    status,
    statusLabel,
    errorMsg,
    result,
    history,
    isLoading,
    importUrl,
    importCode,
    importJson,
    tryHistoryItem,
    clearHistory,
    reset
  }
}
