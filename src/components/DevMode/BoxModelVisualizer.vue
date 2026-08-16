<script setup lang="ts">
import type { SceneNode } from '@nex-design/core/scene-graph'

defineProps<{
  node: SceneNode
}>()
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-input/20 p-2.5">
    <div class="flex items-center justify-between text-[11px] font-medium text-muted">
      <span>Box Model</span>
      <span class="font-mono text-[10px] text-accent">{{ Math.round(node.width) }} × {{ Math.round(node.height) }}px</span>
    </div>

    <!-- Outer Box Model Diagram -->
    <div class="relative flex flex-col items-center justify-center rounded border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-[10px] font-mono text-muted">
      <span class="absolute top-1 text-[9px] text-amber-500/80">margin</span>

      <!-- Padding Box -->
      <div class="relative flex w-full flex-col items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-[10px] font-mono text-muted">
        <span class="absolute top-1 text-[9px] text-emerald-500/80 font-semibold">{{ node.paddingTop || 0 }}</span>
        <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-emerald-500/80 font-semibold">{{ node.paddingRight || 0 }}</span>
        <span class="absolute bottom-1 text-[9px] text-emerald-500/80 font-semibold">{{ node.paddingBottom || 0 }}</span>
        <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-emerald-500/80 font-semibold">{{ node.paddingLeft || 0 }}</span>

        <!-- Content Box -->
        <div class="flex h-10 w-full items-center justify-center rounded border border-blue-500/40 bg-blue-500/15 px-4 text-center font-mono text-xs font-semibold text-blue-400">
          {{ Math.round(node.width) }} × {{ Math.round(node.height) }}
        </div>
      </div>
    </div>

    <!-- Quick Spacing Metrics -->
    <div class="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
      <div class="flex items-center justify-between rounded bg-hover/50 px-2 py-1">
        <span class="text-muted">Gap</span>
        <span class="font-mono font-medium text-surface">{{ Math.round(node.itemSpacing || 0) }}px</span>
      </div>
      <div class="flex items-center justify-between rounded bg-hover/50 px-2 py-1">
        <span class="text-muted">Radius</span>
        <span class="font-mono font-medium text-surface">{{ Math.round(node.cornerRadius || 0) }}px</span>
      </div>
    </div>
  </div>
</template>
