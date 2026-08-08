<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSelectionState } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import ScrubInput from '@/components/ScrubInput.vue'
import { useIconButtonUI } from '@/components/ui/icon-button'
import { useSectionUI } from '@/components/ui/section'

import type { Color, LayoutGrid } from '@nex-design/core/scene-graph'

const { selectedNode: node } = useSelectionState()
const store = useEditorStore()
const sectionCls = useSectionUI()

const showGrids = computed(() => {
  const t = node.value?.type
  return t === 'FRAME' || t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'INSTANCE'
})

const expandedIndex = ref<number | null>(null)

const patternOptions = [
  { value: 'GRID', label: 'Grid' },
  { value: 'COLUMNS', label: 'Columns' },
  { value: 'ROWS', label: 'Rows' }
] as const

const colAlignmentOptions = [
  { value: 'STRETCH', label: 'Stretch' },
  { value: 'MIN', label: 'Left' },
  { value: 'MAX', label: 'Right' },
  { value: 'CENTER', label: 'Center' }
] as const

const rowAlignmentOptions = [
  { value: 'STRETCH', label: 'Stretch' },
  { value: 'MIN', label: 'Top' },
  { value: 'MAX', label: 'Bottom' },
  { value: 'CENTER', label: 'Center' }
] as const

function addGrid() {
  if (!node.value) return
  const grids = [...(node.value.layoutGrids || [])]
  const newGrid: LayoutGrid = {
    id: `grid:${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`,
    pattern: 'COLUMNS',
    visible: true,
    color: { r: 1, g: 0, b: 0, a: 0.08 },
    alignment: 'STRETCH',
    count: 5,
    gutterSize: 20,
    offset: 0
  }
  grids.push(newGrid)
  updateGrids(grids)
  expandedIndex.value = grids.length - 1
}

function updateGrids(grids: LayoutGrid[]) {
  if (!node.value) return
  store.undo.beginBatch('Update layout grids')
  store.updateNode(node.value.id, { layoutGrids: grids })
  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

function toggleExpand(idx: number) {
  expandedIndex.value = expandedIndex.value === idx ? null : idx
}

function toggleVisibility(idx: number) {
  if (!node.value?.layoutGrids) return
  const grids = [...node.value.layoutGrids]
  grids[idx] = { ...grids[idx], visible: !grids[idx].visible }
  updateGrids(grids)
}

function removeGrid(idx: number) {
  if (!node.value?.layoutGrids) return
  const grids = [...node.value.layoutGrids]
  grids.splice(idx, 1)
  updateGrids(grids)
  if (expandedIndex.value === idx) {
    expandedIndex.value = null
  } else if (expandedIndex.value !== null && expandedIndex.value > idx) {
    expandedIndex.value--
  }
}

function updateGridPattern(idx: number, pattern: LayoutGrid['pattern']) {
  if (!node.value?.layoutGrids) return
  const grids = [...node.value.layoutGrids]
  const current = grids[idx]
  const updated: LayoutGrid = {
    ...current,
    pattern,
    sectionSize: pattern === 'GRID' ? current.sectionSize || 8 : undefined,
    width: pattern === 'COLUMNS' ? current.width || 60 : undefined,
    height: pattern === 'ROWS' ? current.height || 60 : undefined
  }
  grids[idx] = updated
  updateGrids(grids)
}

function updateGridColor(idx: number, color: Color) {
  if (!node.value?.layoutGrids) return
  const grids = [...node.value.layoutGrids]
  grids[idx] = { ...grids[idx], color }
  updateGrids(grids)
}

function patchGrid(idx: number, patches: Partial<LayoutGrid>) {
  if (!node.value?.layoutGrids) return
  const grids = [...node.value.layoutGrids]
  grids[idx] = { ...grids[idx], ...patches } as LayoutGrid
  updateGrids(grids)
}
</script>

<template>
  <div v-if="showGrids && node" data-test-id="layout-grids-section" :class="sectionCls.wrapper">
    <div class="flex items-center justify-between">
      <label :class="sectionCls.label">Layout Grids</label>
      <button data-test-id="grid-section-add" :class="useIconButtonUI().base" @click="addGrid">
        +
      </button>
    </div>

    <div class="flex flex-col gap-1.5 mt-2">
      <div
        v-for="(grid, i) in node.layoutGrids || []"
        :key="grid.id"
        class="flex flex-col gap-1.5 border border-border/45 rounded px-2.5 py-2 bg-panel shadow-sm relative group"
      >
        <!-- Header Row -->
        <div class="flex items-center gap-2">
          <!-- Pattern selection -->
          <AppSelect
            :model-value="grid.pattern"
            :options="patternOptions"
            @update:model-value="updateGridPattern(i, $event)"
            class="w-[76px]"
          />

          <!-- Color Swatch & input -->
          <ColorInput
            :color="grid.color"
            @update="updateGridColor(i, $event)"
            class="min-w-0 flex-1"
          />

          <div class="flex items-center gap-1 ml-auto">
            <!-- Visibility Toggle -->
            <button
              class="cursor-pointer border-none bg-transparent p-0.5 text-muted hover:text-surface"
              @click="toggleVisibility(i)"
            >
              <icon-lucide-eye v-if="grid.visible" class="size-3.5" />
              <icon-lucide-eye-off v-else class="size-3.5" />
            </button>

            <!-- Edit/Expand Toggle -->
            <button
              class="cursor-pointer border-none bg-transparent p-0.5 text-muted hover:text-surface"
              @click="toggleExpand(i)"
            >
              <icon-lucide-settings class="size-3.5" />
            </button>

            <!-- Remove Button -->
            <button :class="useIconButtonUI().base" @click="removeGrid(i)">−</button>
          </div>
        </div>

        <!-- Detail Config panel -->
        <div
          v-if="expandedIndex === i"
          class="flex flex-col gap-2 border-t border-border/40 pt-2.5 mt-0.5"
        >
          <!-- GRID specific -->
          <div v-if="grid.pattern === 'GRID'" class="flex items-center justify-between gap-4">
            <span class="text-[10px] text-muted font-medium">Size</span>
            <ScrubInput
              class="w-16"
              suffix="px"
              :model-value="grid.sectionSize || 8"
              :min="1"
              :max="100"
              @update:model-value="patchGrid(i, { sectionSize: Number($event) })"
            />
          </div>

          <!-- COLUMNS / ROWS specific -->
          <template v-else>
            <!-- Count -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-[10px] text-muted font-medium">Count</span>
              <ScrubInput
                class="w-16"
                :model-value="grid.count"
                :min="1"
                :max="100"
                @update:model-value="patchGrid(i, { count: Number($event) })"
              />
            </div>

            <!-- Alignment -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-[10px] text-muted font-medium">Alignment</span>
              <AppSelect
                v-if="grid.pattern === 'COLUMNS'"
                :model-value="grid.alignment"
                :options="colAlignmentOptions"
                @update:model-value="patchGrid(i, { alignment: $event })"
                class="w-24"
              />
              <AppSelect
                v-else
                :model-value="grid.alignment"
                :options="rowAlignmentOptions"
                @update:model-value="patchGrid(i, { alignment: $event })"
                class="w-24"
              />
            </div>

            <!-- Width (for columns not stretch) -->
            <div
              v-if="grid.pattern === 'COLUMNS' && grid.alignment !== 'STRETCH'"
              class="flex items-center justify-between gap-4"
            >
              <span class="text-[10px] text-muted font-medium">Width</span>
              <ScrubInput
                class="w-16"
                suffix="px"
                :model-value="grid.width || 60"
                :min="1"
                :max="500"
                @update:model-value="patchGrid(i, { width: Number($event) })"
              />
            </div>

            <!-- Height (for rows not stretch) -->
            <div
              v-if="grid.pattern === 'ROWS' && grid.alignment !== 'STRETCH'"
              class="flex items-center justify-between gap-4"
            >
              <span class="text-[10px] text-muted font-medium">Height</span>
              <ScrubInput
                class="w-16"
                suffix="px"
                :model-value="grid.height || 60"
                :min="1"
                :max="500"
                @update:model-value="patchGrid(i, { height: Number($event) })"
              />
            </div>

            <!-- Offset (margin for stretch, or general position shift) -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-[10px] text-muted font-medium">Offset / Margin</span>
              <ScrubInput
                class="w-16"
                suffix="px"
                :model-value="grid.offset"
                :min="0"
                :max="500"
                @update:model-value="patchGrid(i, { offset: Number($event) })"
              />
            </div>

            <!-- Gutter -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-[10px] text-muted font-medium">Gutter</span>
              <ScrubInput
                class="w-16"
                suffix="px"
                :model-value="grid.gutterSize"
                :min="0"
                :max="100"
                @update:model-value="patchGrid(i, { gutterSize: Number($event) })"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
