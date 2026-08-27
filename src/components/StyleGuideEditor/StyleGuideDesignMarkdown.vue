<script setup lang="ts">
import { refAutoReset, useFileDialog } from '@vueuse/core'
import { ref, watch } from 'vue'

import { applyDesignMarkdown, serializeDesignMarkdown } from '@/app/design-system/design-markdown'
import { useEditorStore } from '@/app/editor/active-store'

const store = useEditorStore()
const markdown = ref(serializeDesignMarkdown(store))
const status = refAutoReset<'idle' | 'imported' | 'exported'>('idle', 1800)
const { open, onChange } = useFileDialog({ accept: '.md,text/markdown', multiple: false })

watch(
  () => store.state.sceneVersion,
  () => {
    markdown.value = serializeDesignMarkdown(store)
  }
)

onChange(async (files) => {
  const file = files?.[0]
  if (!file) return
  markdown.value = await file.text()
  applyDesignMarkdown(store, markdown.value)
  status.value = 'imported'
})

function apply() {
  applyDesignMarkdown(store, markdown.value)
  status.value = 'imported'
}

function download() {
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
  <section class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-3.5">
    <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <icon-lucide-file-text class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            DESIGN.md
            <span class="text-[10px] font-normal text-emerald-400 font-mono">Portable Spec</span>
          </h2>
          <p class="text-[11px] text-zinc-400">Portable design direction and design variable tokens.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          @click="open()"
        >
          <icon-lucide-upload class="size-3" />
          <span>Import .md</span>
        </button>
        <button
          class="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          @click="download"
        >
          <icon-lucide-download class="size-3" />
          <span>Export .md</span>
        </button>
      </div>
    </div>

    <div class="relative rounded-2xl border border-white/10 bg-black/60 p-1 shadow-inner focus-within:border-rose-500/50 transition-colors">
      <textarea
        v-model="markdown"
        class="h-44 w-full resize-y bg-transparent p-3 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600 leading-relaxed scrollbar-thin"
        spellcheck="false"
        placeholder="# Project Design System&#10;&#10;## Direction&#10;- Brand personality..."
      />
    </div>

    <div class="flex items-center justify-between pt-1">
      <span class="text-[11px] font-mono text-emerald-400">
        {{
          status === 'imported'
            ? '✓ Tokens parsed & applied to canvas'
            : status === 'exported'
              ? '✓ DESIGN.md downloaded'
              : ''
        }}
      </span>
      <button
        class="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        @click="apply"
      >
        <icon-lucide-check class="size-3.5" />
        <span>Apply Changes</span>
      </button>
    </div>
  </section>
</template>
