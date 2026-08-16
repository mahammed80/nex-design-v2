<script setup lang="ts">
import { ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'

const { node } = defineProps<{
  node: SceneNode
  graph: SceneGraph
}>()

const format = ref<'PNG' | 'SVG' | 'WEBP'>('PNG')
const scale = ref<number>(1)
const { copy, copied } = useClipboard({ copiedDuring: 1500 })

function copySvg() {
  const svg = `<svg width="${node.width}" height="${node.height}" viewBox="0 0 ${node.width} ${node.height}"></svg>`
  copy(svg)
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-input/20 p-2.5">
    <div class="flex items-center justify-between text-[11px] font-semibold text-muted uppercase tracking-wider">
      <span>Export Asset</span>
      <button
        class="text-[10px] text-accent hover:underline cursor-pointer"
        @click="copySvg"
      >
        {{ copied ? 'Copied SVG' : 'Copy SVG' }}
      </button>
    </div>

    <div class="flex items-center gap-1.5">
      <select
        v-model="format"
        class="flex-1 px-2 py-1 rounded border border-border bg-input text-xs text-surface outline-none cursor-pointer"
      >
        <option value="PNG">PNG</option>
        <option value="SVG">SVG</option>
        <option value="WEBP">WEBP</option>
      </select>

      <select
        v-model="scale"
        class="w-16 px-2 py-1 rounded border border-border bg-input text-xs text-surface outline-none cursor-pointer"
      >
        <option :value="1">1x</option>
        <option :value="2">2x</option>
        <option :value="3">3x</option>
      </select>
    </div>
  </div>
</template>
