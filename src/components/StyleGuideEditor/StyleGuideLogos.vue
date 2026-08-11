<script setup lang="ts">
import type { VariableItem } from './utils'

const { variables, resolveImageHash } = defineProps<{
  variables: VariableItem[]
  resolveImageHash: (hash: string) => string
}>()

const emit = defineEmits<{
  upload: []
  replace: [id: string]
  remove: [id: string]
  rename: [id: string, name: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2
        class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
      >
        <icon-lucide-image class="size-4 text-accent" />
        Brand Logos
      </h2>
      <button
        class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
        @click="emit('upload')"
      >
        <icon-lucide-plus class="size-3" />
        Add Logo
      </button>
    </div>

    <div
      v-if="variables.length === 0"
      class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
    >
      No logos uploaded. Click "+ Add Logo" to upload your brand assets.
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
      <div
        v-for="v in variables"
        :key="v.id"
        class="card-bubble flex flex-col items-center relative group/logo p-3 rounded-lg bg-panel border border-border shadow-sm hover:shadow-md transition-all"
      >
        <!-- Checkerboard wrapper for transparent logos -->
        <div
          class="relative flex items-center justify-center w-full aspect-video rounded bg-checkerboard border border-border/80 overflow-hidden mb-3"
        >
          <img
            v-if="v.valuesByMode.default"
            :src="resolveImageHash(String(v.valuesByMode.default))"
            alt="Brand Logo"
            class="max-w-[85%] max-h-[85%] object-contain"
          />

          <!-- Replace overlay on hover -->
          <button
            class="absolute inset-0 bg-black/60 text-white text-xs font-semibold opacity-0 group-hover/logo:opacity-100 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
            @click="emit('replace', v.id)"
          >
            <icon-lucide-upload class="size-3.5" />
            Replace Logo
          </button>
        </div>

        <!-- Logo Details (Name input + Delete) -->
        <div class="flex items-center gap-1.5 w-full">
          <input
            type="text"
            :value="v.name"
            placeholder="logo-name"
            class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0 text-center"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />

          <button
            class="cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none shrink-0"
            title="Delete logo"
            @click="emit('remove', v.id)"
          >
            <icon-lucide-trash-2 class="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-bubble {
  background: var(--color-bg-panel, #ffffff);
}

.bg-checkerboard {
  background-color: var(--color-bg-panel, #ffffff);
  background-image:
    linear-gradient(45deg, var(--color-border, #e2e8f0) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-border, #e2e8f0) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-border, #e2e8f0) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-border, #e2e8f0) 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0;
}
</style>
