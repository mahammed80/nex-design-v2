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
  <section class="rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex flex-col gap-4">
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <icon-lucide-palette class="size-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Color & Gradient Palette
            <span class="text-[10px] font-normal text-rose-400 font-mono">{{ variables.length }} swatches</span>
          </h2>
          <p class="text-[11px] text-zinc-400">Tokens for fills, strokes, surfaces, and semantic states.</p>
        </div>
      </div>
      <button
        class="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3.5 stroke-[3]" />
        <span>Add Swatch</span>
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="variables.length === 0"
      class="rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center flex flex-col items-center justify-center gap-2.5"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
        <icon-lucide-palette class="size-5" />
      </div>
      <p class="text-xs font-semibold text-white">No colors or gradients defined yet</p>
      <p class="text-[11px] text-zinc-400 max-w-sm">Create individual color swatches or apply a starter preset from the top bar.</p>
      <button
        class="mt-1 flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
        @click="emit('add')"
      >
        <icon-lucide-plus class="size-3.5" />
        <span>Add First Swatch</span>
      </button>
    </div>

    <!-- Swatch Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
      <div
        v-for="v in variables"
        :key="v.id"
        class="flex flex-col gap-2 p-3 rounded-2xl bg-black/50 border border-white/10 shadow-sm relative group hover:border-rose-500/50 hover:shadow-lg transition-all duration-200"
      >
        <!-- Swatch Preview Block -->
        <div
          class="w-full aspect-[16/10] rounded-xl border border-white/10 bg-checkerboard relative overflow-hidden transition-all group-hover:scale-[1.02]"
          :style="{ background: getSwatchBackground(v) }"
        >
          <!-- Delete button on hover -->
          <button
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex cursor-pointer items-center justify-center size-6 rounded-lg bg-black/70 border border-white/20 text-white hover:bg-red-500 hover:border-red-500 shadow-sm transition-all"
            title="Delete swatch"
            @click="emit('remove', v.id)"
          >
            <icon-lucide-trash-2 class="size-3" />
          </button>
        </div>

        <!-- Swatch Details -->
        <div class="flex flex-col gap-1.5 pt-0.5">
          <!-- Variable Name input -->
          <input
            type="text"
            :value="v.name"
            placeholder="color-token-name"
            class="w-full bg-transparent text-xs font-bold text-white border-none outline-none focus:text-rose-300 transition-colors p-0"
            @change="emit('rename', v.id, ($event.target as HTMLInputElement).value)"
          />

          <!-- Value and Picker Controls -->
          <div class="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
            <span class="text-[10px] font-mono text-zinc-400 uppercase truncate max-w-[65%]">
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
  </section>
</template>

<style scoped>
.bg-checkerboard {
  background-color: rgba(255, 255, 255, 0.05);
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0;
}
</style>
