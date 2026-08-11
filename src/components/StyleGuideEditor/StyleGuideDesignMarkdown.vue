<script setup lang="ts">
import { refAutoReset, useFileDialog } from '@vueuse/core'
import { ref } from 'vue'

import { applyDesignMarkdown, serializeDesignMarkdown } from '@/app/design-system/design-markdown'
import { useEditorStore } from '@/app/editor/active-store'

const store = useEditorStore()
const markdown = ref(serializeDesignMarkdown(store))
const status = refAutoReset<'idle' | 'imported' | 'exported'>('idle', 1800)
const { open, onChange } = useFileDialog({ accept: '.md,text/markdown', multiple: false })

onChange(async (files) => {
  const file = files?.[0]
  if (!file) return
  markdown.value = await file.text()
  applyDesignMarkdown(store, markdown.value)
  status.value = 'imported'
})

function refresh() {
  markdown.value = serializeDesignMarkdown(store)
}

function apply() {
  applyDesignMarkdown(store, markdown.value)
  status.value = 'imported'
}

function download() {
  refresh()
  const url = URL.createObjectURL(new Blob([markdown.value], { type: 'text/markdown' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'DESIGN.md'
  anchor.click()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
  status.value = 'exported'
}
</script>

<template>
  <section class="rounded-lg border border-border bg-panel p-4">
    <div class="mb-3 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-sm font-semibold text-surface">DESIGN.md</h2>
        <p class="mt-1 text-xs text-muted">Portable design direction and variable tokens.</p>
      </div>
      <div class="flex gap-2">
        <button class="rounded bg-hover px-2 py-1 text-xs text-surface" @click="open()">
          Import
        </button>
        <button class="rounded bg-hover px-2 py-1 text-xs text-surface" @click="download">
          Export
        </button>
      </div>
    </div>
    <textarea
      v-model="markdown"
      class="h-44 w-full resize-y rounded border border-border bg-canvas p-3 font-mono text-xs text-surface outline-none focus:border-accent"
      spellcheck="false"
    />
    <div class="mt-2 flex items-center justify-between">
      <span class="text-[11px] text-muted">
        {{
          status === 'imported'
            ? 'Applied to Style Guide'
            : status === 'exported'
              ? 'Downloaded'
              : ''
        }}
      </span>
      <button class="rounded bg-accent px-3 py-1 text-xs font-medium text-white" @click="apply">
        Apply
      </button>
    </div>
  </section>
</template>
