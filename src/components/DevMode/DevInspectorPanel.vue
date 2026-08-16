<script setup lang="ts">
import { useSceneComputed } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'
import BoxModelVisualizer from './BoxModelVisualizer.vue'
import PropertySection from './PropertySection.vue'
import CodeSandbox from './CodeSandbox.vue'
import AssetExportSection from './AssetExportSection.vue'

const editor = useEditorStore()

const selectedNode = useSceneComputed(() => {
  void editor.state.sceneVersion
  const ids = Array.from(editor.state.selectedIds)
  if (ids.length === 0) return null
  return editor.graph.getNode(ids[0]) ?? null
})
</script>

<template>
  <div class="flex flex-1 flex-col overflow-y-auto p-3 gap-4 select-none">
    <!-- Empty State -->
    <div
      v-if="!selectedNode"
      class="flex flex-1 flex-col items-center justify-center text-center p-6 gap-2 text-muted"
    >
      <icon-lucide-code-2 class="size-8 stroke-1 text-muted/60" />
      <span class="text-xs font-medium">Select any element on canvas</span>
      <span class="text-[11px] text-muted/70 max-w-[200px]">
        Hover or click layers to inspect box model, extract colors, typography, and copy framework code.
      </span>
    </div>

    <!-- Active Inspect View -->
    <div v-else class="flex flex-col gap-4">
      <!-- Header: Node Name & Type Badge -->
      <div class="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="size-2 rounded-full bg-accent" />
          <span class="text-xs font-semibold text-surface truncate">{{ selectedNode.name }}</span>
        </div>
        <span class="px-1.5 py-0.5 rounded bg-accent/10 text-[10px] font-mono font-medium text-accent">
          {{ selectedNode.type }}
        </span>
      </div>

      <!-- 1. Box Model Visualizer -->
      <BoxModelVisualizer :node="selectedNode" />

      <!-- 2. Code Sandbox (Tailwind / React / Vue / Flutter / SwiftUI) -->
      <CodeSandbox :node="selectedNode" :graph="editor.graph" />

      <!-- 3. Property Section (Dimensions, Colors, Typography) -->
      <PropertySection :node="selectedNode" />

      <!-- 4. Asset Export Section -->
      <AssetExportSection :node="selectedNode" :graph="editor.graph" />
    </div>
  </div>
</template>
