<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { colorToHex, colorToCSSCompact } from '@nex-design/core/color'
import type { SceneNode } from '@nex-design/core/scene-graph'

defineProps<{
  node: SceneNode
}>()

const { copy, copied } = useClipboard({ copiedDuring: 1500 })

function copyValue(val: string) {
  copy(val)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Dimensions & Position -->
    <div class="flex flex-col gap-1.5">
      <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Position & Size</span>
      <div class="grid grid-cols-2 gap-1 text-[11px]">
        <div class="flex items-center justify-between rounded bg-hover/40 px-2 py-1">
          <span class="text-muted">W × H</span>
          <span class="font-mono text-surface font-medium">{{ Math.round(node.width) }} × {{ Math.round(node.height) }}</span>
        </div>
        <div class="flex items-center justify-between rounded bg-hover/40 px-2 py-1">
          <span class="text-muted">X , Y</span>
          <span class="font-mono text-surface font-medium">{{ Math.round(node.x) }} , {{ Math.round(node.y) }}</span>
        </div>
      </div>
    </div>

    <!-- Colors & Fills -->
    <div v-if="node.fills && node.fills.length > 0" class="flex flex-col gap-1.5">
      <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Colors & Fills</span>
      <div class="flex flex-col gap-1">
        <div
          v-for="(fill, i) in node.fills.filter(f => f.visible !== false)"
          :key="i"
          class="flex items-center justify-between rounded-lg border border-border bg-input/30 p-1.5 text-[11px] group"
        >
          <div class="flex items-center gap-2">
            <div
              v-if="fill.type === 'SOLID'"
              class="size-5 rounded border border-border shrink-0 shadow-sm"
              :style="{ backgroundColor: colorToHex(fill.color) }"
            />
            <icon-lucide-image v-else-if="fill.type === 'IMAGE'" class="size-4 text-muted shrink-0" />
            <span class="font-mono text-surface font-medium">
              {{ fill.type === 'SOLID' ? colorToHex(fill.color) : 'Image Fill' }}
            </span>
          </div>

          <div v-if="fill.type === 'SOLID'" class="flex items-center gap-1">
            <button
              class="px-1.5 py-0.5 rounded text-[10px] text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
              title="Copy HEX"
              @click="copyValue(colorToHex(fill.color))"
            >
              HEX
            </button>
            <button
              class="px-1.5 py-0.5 rounded text-[10px] text-muted hover:bg-hover hover:text-surface transition-colors cursor-pointer"
              title="Copy RGB"
              @click="copyValue(colorToCSSCompact(fill.color))"
            >
              RGB
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Typography (if Text) -->
    <div v-if="node.type === 'TEXT'" class="flex flex-col gap-1.5">
      <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Typography</span>
      <div class="grid grid-cols-2 gap-1 text-[11px]">
        <div class="flex items-center justify-between rounded bg-hover/40 px-2 py-1 col-span-2">
          <span class="text-muted">Font Family</span>
          <span class="font-medium text-surface truncate">{{ node.fontFamily || 'Inter' }}</span>
        </div>
        <div class="flex items-center justify-between rounded bg-hover/40 px-2 py-1">
          <span class="text-muted">Size</span>
          <span class="font-mono text-surface font-medium">{{ Math.round(node.fontSize || 14) }}px</span>
        </div>
        <div class="flex items-center justify-between rounded bg-hover/40 px-2 py-1">
          <span class="text-muted">Weight</span>
          <span class="font-mono text-surface font-medium">{{ node.fontWeight || 400 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
