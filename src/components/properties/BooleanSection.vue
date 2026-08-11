<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useSectionUI } from '@/components/ui/section'
import { useSelectionState } from '@nex-design/vue'

const editor = useEditorStore()
const { selectedNode: node } = useSelectionState()
const sectionCls = useSectionUI()

const isBooleanOperation = computed(() => node.value?.type === 'BOOLEAN_OPERATION')
const currentOperation = computed(() => node.value?.booleanOperation ?? 'UNION')

function setOperation(op: string) {
  if (!node.value || node.value.type !== 'BOOLEAN_OPERATION') return
  editor.updateNodeWithUndo(
    node.value.id,
    {
      booleanOperation: op as 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE',
      name: `Boolean ${op.toLowerCase()}`
    },
    'Change boolean operation'
  )
}
</script>

<template>
  <div v-if="isBooleanOperation && node" data-test-id="boolean-section" :class="sectionCls.wrapper">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <icon-lucide-combine class="size-3.5 text-accent" />
        <label class="text-[11px] font-semibold text-surface">Boolean Groups</label>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-[9px] font-semibold uppercase tracking-wider text-muted"
        >Operation Mode</span
      >
      <AppSelect
        :model-value="currentOperation"
        :options="[
          { value: 'UNION', label: 'Union (Combine)' },
          { value: 'SUBTRACT', label: 'Subtract (Subtract Front)' },
          { value: 'INTERSECT', label: 'Intersect (Overlap Only)' },
          { value: 'EXCLUDE', label: 'Exclude (XOR)' }
        ]"
        @update:model-value="setOperation"
      />
    </div>
  </div>
</template>
