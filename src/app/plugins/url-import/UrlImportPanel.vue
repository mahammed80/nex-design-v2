<script setup lang="ts">
import { useUrlImport } from './use'

const {
  url,
  selector,
  status,
  statusLabel,
  result,
  history,
  isLoading,
  importUrl,
  tryHistoryItem,
  clearHistory,
  reset
} = useUrlImport()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !isLoading.value) {
    void importUrl()
  }
}

</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-surface tracking-wide uppercase">URL to Design</span>
      <button
        v-if="status === 'done' || status === 'error'"
        class="text-xs text-muted hover:text-surface transition-colors cursor-pointer"
        @click="reset"
      >
        Clear
      </button>
    </div>

    <!-- URL Input Row -->
    <div class="flex gap-1.5">
      <div class="relative flex-1">
        <icon-lucide-globe
          class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none"
        />
        <input
          id="url-import-input"
          v-model="url"
          type="url"
          placeholder="https://stripe.com"
          autocomplete="off"
          spellcheck="false"
          :disabled="isLoading"
          class="w-full pl-8 pr-2 py-1.5 rounded-lg border border-border bg-input text-xs text-surface outline-none placeholder:text-muted focus:border-accent transition-colors disabled:opacity-50"
          @keydown="onKeydown"
        />
      </div>
      <button
        :disabled="!url.trim() || isLoading"
        class="flex items-center justify-center size-7 rounded-lg bg-accent text-white cursor-pointer transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        title="Import URL"
        @click="() => importUrl()"
      >
        <icon-lucide-download class="size-3.5" />
      </button>
    </div>

    <!-- Optional selector input -->
    <div class="flex items-center gap-1.5">
      <icon-lucide-hash class="size-3 text-muted shrink-0" />
      <input
        v-model="selector"
        type="text"
        placeholder="CSS selector (e.g. header, .hero)"
        :disabled="isLoading"
        class="flex-1 px-2 py-1 rounded border border-border bg-input text-[11px] text-surface outline-none placeholder:text-muted focus:border-accent transition-colors disabled:opacity-50"
      />
    </div>

    <!-- Status Area -->
    <div v-if="status !== 'idle'" class="rounded-lg px-2.5 py-2 text-xs transition-all"
      :class="{
        'bg-accent/10 text-accent': isLoading,
        'bg-green-500/10 text-green-400': status === 'done',
        'bg-red-500/10 text-red-400': status === 'error'
      }"
    >
      <div class="flex items-center gap-2">
        <!-- Loading spinner -->
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
        <span class="leading-snug">{{ statusLabel }}</span>
      </div>

      <!-- Success details -->
      <div v-if="status === 'done' && result" class="mt-1.5 text-[10px] text-muted leading-relaxed">
        <span>{{ result.width }}×{{ result.height }}px</span>
        <span class="mx-1 opacity-50">·</span>
        <span>{{ result.totalNodes }} layers</span>
      </div>
    </div>

    <!-- Recent History -->
    <div v-if="history.length > 0 && status === 'idle'" class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium text-muted uppercase tracking-wide">Recent</span>
        <button
          class="text-[10px] text-muted hover:text-surface transition-colors cursor-pointer"
          @click="clearHistory"
        >
          Clear
        </button>
      </div>
      <div class="flex flex-col gap-0.5">
        <button
          v-for="h in history.slice(0, 5)"
          :key="h"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer text-left group"
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
