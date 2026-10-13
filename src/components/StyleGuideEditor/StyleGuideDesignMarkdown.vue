<script setup lang="ts">
import { refAutoReset, refDebounced, useFileDialog } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import {
  applyDesignMarkdown,
  previewDesignMarkdown,
  serializeDesignMarkdown
} from '@/app/design-system/design-markdown'
import { useEditorStore } from '@/app/editor/active-store'

const PREVIEW_DEBOUNCE_MS = 250
const MAX_LISTED_REMOVALS = 6

const store = useEditorStore()
const markdown = ref(serializeDesignMarkdown(store))
// Unapplied local edits: scene changes must not overwrite them.
const dirty = ref(false)
const documentChanged = ref(false)
const status = refAutoReset<'idle' | 'imported' | 'exported'>('idle', 1800)
const { open, onChange } = useFileDialog({ accept: '.md,text/markdown', multiple: false })

function regenerate() {
  markdown.value = serializeDesignMarkdown(store)
  dirty.value = false
  documentChanged.value = false
}

watch(
  () => store.state.sceneVersion,
  () => {
    if (dirty.value) documentChanged.value = true
    else markdown.value = serializeDesignMarkdown(store)
  }
)

// Imported files load as an unapplied draft so the change preview can be reviewed first.
onChange(async (files) => {
  const file = files?.[0]
  if (!file) return
  markdown.value = await file.text()
  dirty.value = true
})

const draft = refDebounced(markdown, PREVIEW_DEBOUNCE_MS)
const preview = computed(() => {
  void store.state.sceneVersion
  return dirty.value ? previewDesignMarkdown(store, draft.value) : null
})
const diagnostics = computed(() => preview.value?.parsed.diagnostics ?? [])
const hasErrors = computed(() => diagnostics.value.some((d) => d.severity === 'error'))
const planSummary = computed(() => {
  const plan = preview.value?.plan
  if (!plan) return null
  const removed = plan.remove.map((r) => r.name)
  return {
    create: plan.create.length,
    update: plan.update.length,
    removed: removed.slice(0, MAX_LISTED_REMOVALS),
    moreRemoved: Math.max(0, removed.length - MAX_LISTED_REMOVALS),
    conflicts: plan.conflicts.map((c) => `${c.name} (${c.existingType} ≠ ${c.wantedType})`)
  }
})

function apply() {
  const parsed = previewDesignMarkdown(store, markdown.value).parsed
  if (parsed.diagnostics.some((d) => d.severity === 'error')) return
  applyDesignMarkdown(store, markdown.value)
  regenerate()
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
  <section
    class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-3.5"
  >
    <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        >
          <icon-lucide-file-text class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            DESIGN.md
            <span class="text-[10px] font-normal text-emerald-400 font-mono">Portable Spec</span>
          </h2>
          <p class="text-[11px] text-zinc-400">
            Portable design direction and design variable tokens.
          </p>
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

    <div
      v-if="documentChanged"
      data-test-id="style-guide-markdown-stale"
      class="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200"
    >
      <span>The document's tokens changed while you were editing.</span>
      <button
        class="shrink-0 rounded-lg border border-amber-500/40 px-2 py-0.5 font-semibold hover:bg-amber-500/20 cursor-pointer"
        @click="regenerate"
      >
        Discard edits &amp; reload
      </button>
    </div>

    <div
      class="relative rounded-2xl border border-white/10 bg-black/60 p-1 shadow-inner focus-within:border-rose-500/50 transition-colors"
    >
      <textarea
        v-model="markdown"
        data-test-id="style-guide-markdown-input"
        @input="dirty = true"
        class="h-44 w-full resize-y bg-transparent p-3 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600 leading-relaxed scrollbar-thin"
        spellcheck="false"
        placeholder='---&#10;version: alpha&#10;name: Project Design System&#10;colors:&#10;  primary: "#533afd"&#10;---&#10;&#10;## Overview'
      />
    </div>

    <ul
      v-if="diagnostics.length > 0"
      data-test-id="style-guide-markdown-diagnostics"
      class="flex max-h-28 flex-col gap-1 overflow-y-auto font-mono text-[11px] scrollbar-thin"
    >
      <li
        v-for="(d, index) in diagnostics"
        :key="index"
        :class="d.severity === 'error' ? 'text-rose-400' : 'text-amber-300'"
      >
        {{ d.severity === 'error' ? '✕' : '!' }} <span v-if="d.path">{{ d.path }}: </span
        >{{ d.message }}
      </li>
    </ul>

    <div
      v-if="planSummary && !hasErrors"
      data-test-id="style-guide-markdown-plan"
      class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-zinc-300"
    >
      <span class="text-emerald-400">+{{ planSummary.create }} new</span> ·
      <span class="text-sky-300">{{ planSummary.update }} updated</span> ·
      <span class="text-rose-400"
        >{{ planSummary.removed.length + planSummary.moreRemoved }} removed</span
      >
      <div v-if="planSummary.removed.length > 0" class="mt-1 text-rose-300/80">
        Removes: {{ planSummary.removed.join(', ')
        }}<span v-if="planSummary.moreRemoved"> and {{ planSummary.moreRemoved }} more</span>
      </div>
      <div v-if="planSummary.conflicts.length > 0" class="mt-1 text-amber-300">
        Skipped type conflicts: {{ planSummary.conflicts.join(', ') }}
      </div>
    </div>

    <div class="flex items-center justify-between pt-1">
      <span class="text-[11px] font-mono text-emerald-400">
        {{ status === 'imported' ? '✓ Tokens applied to the document' : '' }}
        {{ status === 'exported' ? '✓ DESIGN.md downloaded' : '' }}
      </span>
      <button
        data-test-id="style-guide-markdown-apply"
        :disabled="!dirty || hasErrors"
        class="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        @click="apply"
      >
        <icon-lucide-check class="size-3.5" />
        <span>Apply Changes</span>
      </button>
    </div>
  </section>
</template>
