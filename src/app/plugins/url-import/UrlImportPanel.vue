<script setup lang="ts">
import { useUrlImport, VIEWPORT_OPTIONS } from './use'

const {
  activeTab,
  url,
  selector,
  rawCode,
  rawJson,
  selectedViewport,
  multiViewport,
  status,
  statusLabel,
  result,
  history,
  isLoading,
  importUrl,
  importCode,
  importJson,
  tryHistoryItem,
  clearHistory,
  reset
} = useUrlImport()

function onUrlKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !isLoading.value) {
    void importUrl()
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 w-80">
    <!-- Header with Tabs -->
    <div class="flex items-center justify-between border-b border-border/50 pb-2">
      <div class="flex items-center gap-1">
        <button
          class="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
          :class="activeTab === 'url' ? 'bg-accent/15 text-accent font-semibold' : 'text-muted hover:text-surface'"
          @click="activeTab = 'url'"
        >
          Web URL
        </button>
        <button
          class="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
          :class="activeTab === 'code' ? 'bg-accent/15 text-accent font-semibold' : 'text-muted hover:text-surface'"
          @click="activeTab = 'code'"
        >
          HTML Code
        </button>
        <button
          class="px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
          :class="activeTab === 'json' ? 'bg-accent/15 text-accent font-semibold' : 'text-muted hover:text-surface'"
          @click="activeTab = 'json'"
        >
          JSON / .h2d
        </button>
      </div>

      <button
        v-if="status === 'done' || status === 'error'"
        class="text-[11px] text-muted hover:text-surface transition-colors cursor-pointer"
        @click="reset"
      >
        Clear
      </button>
    </div>

    <!-- Viewport Breakpoint Selector -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-[11px] text-muted">
        <span>Viewport Device</span>
        <label v-if="activeTab === 'url'" class="flex items-center gap-1 cursor-pointer hover:text-surface transition-colors">
          <input
            v-model="multiViewport"
            type="checkbox"
            class="rounded border-border size-3 accent-accent cursor-pointer"
          />
          <span>Multi-breakpoint</span>
        </label>
      </div>

      <div class="grid grid-cols-4 gap-1">
        <button
          v-for="vp in VIEWPORT_OPTIONS"
          :key="vp.id"
          :disabled="multiViewport"
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-md border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          :class="
            selectedViewport === vp.width && !multiViewport
              ? 'border-accent bg-accent/10 text-accent shadow-sm'
              : 'border-border bg-input/40 text-muted hover:bg-hover hover:text-surface'
          "
          @click="selectedViewport = vp.width"
        >
          <span>{{ vp.label }}</span>
          <span class="text-[9px] opacity-60">{{ vp.width }}px</span>
        </button>
      </div>
    </div>

    <!-- TAB 1: WEB URL IMPORT -->
    <div v-if="activeTab === 'url'" class="flex flex-col gap-2">
      <div class="flex gap-1.5">
        <div class="relative flex-1">
          <icon-lucide-globe
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none"
          />
          <input
            id="url-import-input"
            v-model="url"
            type="url"
            placeholder="https://example.com"
            autocomplete="off"
            spellcheck="false"
            :disabled="isLoading"
            class="w-full pl-8 pr-2 py-1.5 rounded-lg border border-border bg-input text-xs text-surface outline-none placeholder:text-muted focus:border-accent transition-colors disabled:opacity-50"
            @keydown="onUrlKeydown"
          />
        </div>
        <button
          :disabled="!url.trim() || isLoading"
          class="flex items-center justify-center px-3 rounded-lg bg-accent text-white font-medium text-xs cursor-pointer transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 gap-1.5"
          title="Import URL"
          @click="() => importUrl()"
        >
          <icon-lucide-download class="size-3.5" />
          <span>Import</span>
        </button>
      </div>

      <!-- Scoped selector -->
      <div class="flex items-center gap-1.5">
        <icon-lucide-hash class="size-3 text-muted shrink-0" />
        <input
          v-model="selector"
          type="text"
          placeholder="Optional CSS selector (e.g. #hero, .pricing)"
          :disabled="isLoading"
          class="flex-1 px-2 py-1 rounded border border-border bg-input text-[11px] text-surface outline-none placeholder:text-muted focus:border-accent transition-colors disabled:opacity-50"
        />
      </div>
    </div>

    <!-- TAB 2: HTML / CODE IMPORT -->
    <div v-else-if="activeTab === 'code'" class="flex flex-col gap-2">
      <textarea
        v-model="rawCode"
        placeholder="Paste raw HTML / Tailwind / JSX code snippet here (from ChatGPT, v0, etc.)..."
        rows="4"
        :disabled="isLoading"
        class="w-full p-2 rounded-lg border border-border bg-input text-xs text-surface font-mono outline-none placeholder:text-muted focus:border-accent transition-colors resize-none disabled:opacity-50"
      />
      <button
        :disabled="!rawCode.trim() || isLoading"
        class="flex items-center justify-center py-1.5 rounded-lg bg-accent text-white font-medium text-xs cursor-pointer transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed gap-1.5"
        @click="() => importCode()"
      >
        <icon-lucide-code class="size-3.5" />
        <span>Generate Layers from Code</span>
      </button>
    </div>

    <!-- TAB 3: JSON / EXTENSION IMPORT -->
    <div v-else-if="activeTab === 'json'" class="flex flex-col gap-2">
      <textarea
        v-model="rawJson"
        placeholder="Paste captured DOM JSON or .h2d snapshot from private/authenticated pages..."
        rows="4"
        :disabled="isLoading"
        class="w-full p-2 rounded-lg border border-border bg-input text-xs text-surface font-mono outline-none placeholder:text-muted focus:border-accent transition-colors resize-none disabled:opacity-50"
      />
      <button
        :disabled="!rawJson.trim() || isLoading"
        class="flex items-center justify-center py-1.5 rounded-lg bg-accent text-white font-medium text-xs cursor-pointer transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed gap-1.5"
        @click="() => importJson()"
      >
        <icon-lucide-file-json class="size-3.5" />
        <span>Import JSON Snapshot</span>
      </button>
    </div>

    <!-- Status Area -->
    <div
      v-if="status !== 'idle'"
      class="rounded-lg px-2.5 py-2 text-xs transition-all"
      :class="{
        'bg-accent/10 text-accent': isLoading,
        'bg-green-500/10 text-green-400': status === 'done',
        'bg-red-500/10 text-red-400': status === 'error'
      }"
    >
      <div class="flex items-center gap-2">
        <svg
          v-if="isLoading"
          class="size-3 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <icon-lucide-check v-else-if="status === 'done'" class="size-3 shrink-0" />
        <icon-lucide-alert-circle v-else-if="status === 'error'" class="size-3 shrink-0" />
        <span class="leading-snug font-medium">{{ statusLabel }}</span>
      </div>

      <!-- Success details -->
      <div v-if="status === 'done' && result" class="mt-1.5 text-[10px] text-muted leading-relaxed">
        <span>{{ result.width }}×{{ result.height }}px</span>
        <span class="mx-1 opacity-50">·</span>
        <span>{{ result.totalNodes }} layers created</span>
      </div>
    </div>

    <!-- Recent History (URL Tab) -->
    <div v-if="activeTab === 'url' && history.length > 0 && status === 'idle'" class="flex flex-col gap-1 border-t border-border/40 pt-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium text-muted uppercase tracking-wide">Recent Imports</span>
        <button
          class="text-[10px] text-muted hover:text-surface transition-colors cursor-pointer"
          @click="clearHistory"
        >
          Clear
        </button>
      </div>
      <div class="flex flex-col gap-0.5">
        <button
          v-for="h in history.slice(0, 4)"
          :key="h"
          class="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-hover transition-colors cursor-pointer text-left group"
          @click="tryHistoryItem(h)"
        >
          <icon-lucide-clock class="size-3 shrink-0 text-muted" />
          <span class="text-[11px] text-muted group-hover:text-surface transition-colors truncate flex-1">
            {{ h.replace(/^https?:\/\//, '') }}
          </span>
          <icon-lucide-arrow-right class="size-3 shrink-0 text-muted/0 group-hover:text-muted transition-colors" />
        </button>
      </div>
    </div>
  </div>
</template>
