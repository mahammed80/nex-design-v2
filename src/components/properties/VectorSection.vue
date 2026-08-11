<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useSectionUI } from '@/components/ui/section'
import { useSelectionState } from '@nex-design/vue'

const editor = useEditorStore()
const { selectedNode: node } = useSelectionState()
const sectionCls = useSectionUI()

const isVectorNode = computed(() => node.value?.type === 'VECTOR')
const vectorNetwork = computed(() => node.value?.vectorNetwork)

const vertexCount = computed(() => vectorNetwork.value?.vertices?.length ?? 0)
const segmentCount = computed(() => vectorNetwork.value?.segments?.length ?? 0)
const regionCount = computed(() => vectorNetwork.value?.regions?.length ?? 0)

const defaultMirroring = computed(() => {
  const v = vectorNetwork.value?.vertices?.[0]
  return v?.handleMirroring ?? 'NONE'
})

function setGlobalMirroring(mirroring: string) {
  if (!node.value || !vectorNetwork.value) return
  const updatedVertices = vectorNetwork.value.vertices.map((v) => ({
    ...v,
    handleMirroring: mirroring as 'NONE' | 'ANGLE_AND_LENGTH' | 'ANGLE'
  }))
  editor.updateNodeWithUndo(
    node.value.id,
    {
      vectorNetwork: {
        ...vectorNetwork.value,
        vertices: updatedVertices
      }
    },
    'Change vector handle mirroring'
  )
}
</script>

<template>
  <div v-if="isVectorNode && node" data-test-id="vector-section" :class="sectionCls.wrapper">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <icon-lucide-spline class="size-3.5 text-accent" />
        <label class="text-[11px] font-semibold text-surface">Vector Network</label>
      </div>
    </div>

    <!-- Stats pills -->
    <div class="flex items-center gap-1.5 mb-2.5">
      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/20 text-muted font-medium"
        >{{ vertexCount }} vertices</span
      >
      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/20 text-muted font-medium"
        >{{ segmentCount }} segments</span
      >
      <span
        v-if="regionCount > 0"
        class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/20 text-muted font-medium"
        >{{ regionCount }} regions</span
      >
    </div>

    <!-- Handle Mirroring Control -->
    <div class="flex flex-col gap-1.5">
      <span class="text-[9px] font-semibold uppercase tracking-wider text-muted"
        >Handle Mirroring</span
      >
      <AppSelect
        :model-value="defaultMirroring"
        :options="[
          { value: 'NONE', label: 'Straight (No Mirroring)' },
          { value: 'ANGLE_AND_LENGTH', label: 'Symmetric (Angle & Length)' },
          { value: 'ANGLE', label: 'Smooth (Angle Only)' }
        ]"
        @update:model-value="setGlobalMirroring"
      />
    </div>
  </div>
</template>
