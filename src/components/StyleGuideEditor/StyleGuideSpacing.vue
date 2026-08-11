<script setup lang="ts">
import type { VariableItem } from './utils'

const { variables } = defineProps<{
  variables: VariableItem[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  rename: [id: string, name: string]
  updateValue: [id: string, val: number]
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2
        class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
      >
        <icon-lucide-layout-grid class="size-4 text-accent" />
        Spacings & Sizes
      </h2>
      <button
        class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3" />
        Add Spacing
      </button>
    </div>

    <div
      v-if="variables.length === 0"
      class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
    >
      No spacing/size variables defined. Click "+ Add Spacing" to begin.
    </div>

    <div v-else class="flex flex-col gap-3 mt-2">
      <div v-for="v in variables" :key="v.id" class="flex items-center gap-3 w-full group/spacing">
        <!-- Sizing graphic representation -->
        <div
          class="flex items-center justify-center size-8 rounded-lg bg-panel border border-border shrink-0"
        >
          <icon-lucide-move-horizontal class="text-muted size-4" />
        </div>

        <!-- Figma Comment Speech Bubble Style for sizing -->
        <div
          class="figma-comment-bubble flex-1 flex items-center justify-between gap-4 p-2 px-3 rounded-lg bg-panel border border-border shadow-sm relative"
        >
          <!-- Label name input -->
          <input
            type="text"
            :value="v.name"
            placeholder="variable-name"
            class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />

          <!-- Size value input -->
          <div class="flex items-center gap-2">
            <input
              type="number"
              :value="v.valuesByMode.default"
              class="w-14 bg-input text-right text-xs font-mono text-surface border border-border rounded px-1 py-0.5 outline-none focus:border-accent"
              @change="emit('updateValue', v.id, Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-[9px] text-muted uppercase font-semibold">px</span>

            <button
              class="ml-1 cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none"
              title="Delete spacing"
              @click="emit('remove', v.id)"
            >
              <icon-lucide-trash-2 class="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.figma-comment-bubble {
  position: relative;
  background: var(--color-bg-panel, #ffffff);
}
.figma-comment-bubble::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: inherit;
  border-right: 1px solid var(--color-border, #e2e8f0);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}
</style>
