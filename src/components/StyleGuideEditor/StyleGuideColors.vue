<script setup lang="ts">
import FillPicker from '@/components/FillPicker.vue'
import { colorToCSS, colorToHex } from '@nex-design/core/color'
import type { Fill, VariableValue } from '@nex-design/core/scene-graph'
import type { Color } from '@nex-design/core/types'
import { getFillFromVariable, parseLinearGradient, type VariableItem } from './utils'

const { variables } = defineProps<{
  variables: VariableItem[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  rename: [id: string, name: string]
  updateValue: [id: string, val: VariableValue]
  updateFill: [id: string, fill: Fill]
}>()

function getSwatchBackground(v: VariableItem): string {
  if (v.type === 'COLOR') {
    return colorToCSS(v.valuesByMode.default as Color)
  } else if (
    v.type === 'STRING' &&
    typeof v.valuesByMode.default === 'string' &&
    v.valuesByMode.default.startsWith('linear-gradient')
  ) {
    return v.valuesByMode.default
  }
  return 'transparent'
}

function getVariableValueText(v: VariableItem): string {
  if (v.type === 'COLOR') {
    return colorToHex(v.valuesByMode.default as Color)
  } else if (
    v.type === 'STRING' &&
    typeof v.valuesByMode.default === 'string' &&
    v.valuesByMode.default.startsWith('linear-gradient')
  ) {
    const parsed = parseLinearGradient(v.valuesByMode.default)
    return `${parsed.color1} → ${parsed.color2}`
  }
  return String(v.valuesByMode.default)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2
        class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
      >
        <icon-lucide-palette class="size-4 text-accent" />
        Color & Gradient Palette
      </h2>
      <button
        class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3" />
        Add Swatch
      </button>
    </div>

    <div
      v-if="variables.length === 0"
      class="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted"
    >
      No colors or gradients defined. Click "+ Add Swatch" to begin.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
      <div
        v-for="v in variables"
        :key="v.id"
        class="flex flex-col gap-2.5 p-3 rounded-xl bg-panel border border-border/80 shadow-sm relative group hover:border-accent/40 hover:shadow-md transition-all duration-200"
      >
        <!-- Swatch Preview Block -->
        <div
          class="w-full aspect-video rounded-lg border border-border bg-checkerboard relative overflow-hidden transition-all group-hover:scale-[1.01]"
          :style="{ background: getSwatchBackground(v) }"
        >
          <!-- Delete button on hover -->
          <button
            class="absolute top-2 right-2 hidden group-hover:flex cursor-pointer items-center justify-center p-1.5 rounded-md bg-panel/90 border border-border hover:text-red-500 hover:border-red-500/20 shadow-sm transition-all"
            title="Delete style"
            @click="emit('remove', v.id)"
          >
            <icon-lucide-trash-2 class="size-3.5" />
          </button>
        </div>

        <!-- Swatch Details -->
        <div class="flex flex-col gap-1">
          <!-- Variable Name input -->
          <input
            type="text"
            :value="v.name"
            placeholder="style-name"
            class="w-full bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />

          <!-- Value and Picker Controls -->
          <div class="flex items-center justify-between gap-2 mt-1 border-t border-border/40 pt-2">
            <span class="text-[9px] font-mono text-muted uppercase truncate max-w-[70%]">
              {{ getVariableValueText(v) }}
            </span>

            <FillPicker
              :fill="getFillFromVariable(v)"
              :swatch-background="getSwatchBackground(v)"
              @update="emit('updateFill', v.id, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
