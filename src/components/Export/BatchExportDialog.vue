<script setup lang="ts">
import { ref, computed } from 'vue'
import { zipSync } from 'fflate'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import type { ExportFormatId } from '@nex-design/vue'

const open = defineModel<boolean>('open', { default: false })
const editor = useEditorStore()

const exportScale = ref(1)
const exportFormat = ref<ExportFormatId>('png')
const isExporting = ref(false)
const progress = ref(0)
const statusMessage = ref('')

const FORMAT_OPTIONS: { value: ExportFormatId; label: string }[] = [
  { value: 'png', label: 'PNG Image (.png)' },
  { value: 'jpg', label: 'JPEG Image (.jpg)' },
  { value: 'webp', label: 'WebP Image (.webp)' },
  { value: 'svg', label: 'SVG Vector (.svg)' },
  { value: 'fig', label: 'Figma Document (.fig)' }
]

const SCALE_OPTIONS = [0.5, 0.75, 1, 1.5, 2, 3, 4].map((s) => ({ value: s, label: `${s}x` }))

interface ExportableItem {
  id: string
  name: string
  type: string
  selected: boolean
}

const exportItems = ref<ExportableItem[]>([])

function initItems() {
  if (!editor) return
  const currentPageId = editor.state.currentPageId
  const children = editor.graph.getChildren(currentPageId)

  exportItems.value = children
    .filter((n) => ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION', 'GROUP'].includes(n.type))
    .map((n) => ({
      id: n.id,
      name: n.name || n.type,
      type: n.type,
      selected: true
    }))
}

function toggleAll(selected: boolean) {
  for (const item of exportItems.value) {
    item.selected = selected
  }
}

const selectedCount = computed(() => exportItems.value.filter((i) => i.selected).length)

async function startBatchExport() {
  const selected = exportItems.value.filter((i) => i.selected)
  if (selected.length === 0) return

  isExporting.value = true
  progress.value = 0
  statusMessage.value = 'Preparing export...'

  try {
    if (selected.length === 1) {
      statusMessage.value = `Exporting ${selected[0].name}...`
      await editor.exportTarget({ scope: 'node', nodeId: selected[0].id }, exportFormat.value, {
        scale: exportScale.value
      })
      progress.value = 100
      open.value = false
      return
    }

    // Multi-item export: Bundle into ZIP
    const zipFiles: Record<string, Uint8Array> = {}
    const total = selected.length

    for (let i = 0; i < total; i++) {
      const item = selected[i]
      statusMessage.value = `Rendering ${item.name} (${i + 1}/${total})...`

      const blob = await editor.renderExportBlob(item.id, exportScale.value, exportFormat.value)
      if (blob) {
        const buffer = new Uint8Array(await blob.arrayBuffer())
        const sanitizeName = item.name.replace(/[/\\?%*:|"<>]/g, '-').trim() || `export-${i + 1}`
        const fileName = `${sanitizeName}.${exportFormat.value}`
        zipFiles[fileName] = buffer
      }

      progress.value = Math.round(((i + 1) / total) * 100)
    }

    statusMessage.value = 'Packaging ZIP archive...'
    const zipped = zipSync(zipFiles)
    const zipBlob = new Blob([zipped], { type: 'application/zip' })
    const zipUrl = URL.createObjectURL(zipBlob)

    const link = document.createElement('a')
    link.href = zipUrl
    link.download = `nex-design-batch-export-${Date.now()}.zip`
    link.click()
    URL.revokeObjectURL(zipUrl)

    statusMessage.value = 'Complete!'
    open.value = false
  } catch (err) {
    console.error('Batch export failed:', err)
    statusMessage.value = 'Export failed.'
  } finally {
    isExporting.value = false
  }
}

function handleOpenChange(nextOpen: boolean) {
  if (nextOpen) initItems()
}
</script>

<template>
  <DialogRoot v-model:open="open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-panel p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div class="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div class="flex items-center gap-2">
            <icon-lucide-download class="size-4 text-accent" />
            <DialogTitle class="text-sm font-semibold text-surface"
              >Batch Export Document Assets</DialogTitle
            >
          </div>
          <button
            class="size-6 flex items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
            @click="open = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </div>

        <div class="flex flex-col gap-4 text-xs">
          <!-- Selection checklist -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted"
                >Select Frames to Export ({{ selectedCount }}/{{ exportItems.length }})</span
              >
              <div class="flex items-center gap-2">
                <button
                  class="text-[10px] text-accent hover:underline cursor-pointer"
                  @click="toggleAll(true)"
                >
                  Select All
                </button>
                <span class="text-muted text-[10px]">•</span>
                <button
                  class="text-[10px] text-muted hover:text-surface cursor-pointer"
                  @click="toggleAll(false)"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div
              class="max-h-44 overflow-y-auto rounded-lg border border-border bg-input/40 p-2 flex flex-col gap-1"
            >
              <div v-if="exportItems.length === 0" class="text-muted py-4 text-center text-xs">
                No frames or containers found on current page.
              </div>
              <label
                v-for="item in exportItems"
                :key="item.id"
                class="flex items-center gap-2 rounded px-2 py-1 hover:bg-hover cursor-pointer"
              >
                <input type="checkbox" v-model="item.selected" class="accent-accent size-3.5" />
                <span class="text-surface font-medium truncate flex-1">{{ item.name }}</span>
                <span
                  class="text-[9px] font-mono uppercase text-muted px-1.5 py-0.5 rounded bg-muted/20"
                  >{{ item.type }}</span
                >
              </label>
            </div>
          </div>

          <!-- Format & Scale options -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted"
                >Format</span
              >
              <AppSelect :options="FORMAT_OPTIONS" v-model="exportFormat" />
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted"
                >Resolution</span
              >
              <AppSelect :options="SCALE_OPTIONS" v-model="exportScale" />
            </div>
          </div>

          <!-- Export progress indicator -->
          <div
            v-if="isExporting"
            class="flex flex-col gap-1.5 bg-accent/10 border border-accent/30 rounded-xl p-3"
          >
            <div class="flex items-center justify-between text-xs text-accent font-medium">
              <span>{{ statusMessage }}</span>
              <span>{{ progress }}%</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-input overflow-hidden">
              <div
                class="h-full bg-accent transition-all duration-200"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              class="px-3 py-1.5 rounded-lg border border-border text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
              @click="open = false"
            >
              Cancel
            </button>
            <button
              :disabled="selectedCount === 0 || isExporting"
              class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors cursor-pointer"
              @click="startBatchExport"
            >
              <icon-lucide-download class="size-3.5" />
              <span>Export {{ selectedCount }} Assets</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
