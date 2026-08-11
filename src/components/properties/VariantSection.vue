<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import Tip from '@/components/ui/Tip.vue'
import { useSectionUI } from '@/components/ui/section'
import { useI18n, useSelectionState } from '@nex-design/vue'

const editor = useEditorStore()
const { selectedNode: node } = useSelectionState()
const sectionCls = useSectionUI()
const { panels } = useI18n()

const isInstance = computed(() => node.value?.type === 'INSTANCE')

const instanceComponent = computed(() => {
  if (!node.value || node.value.type !== 'INSTANCE' || !node.value.componentId) return null
  return editor.graph.getNode(node.value.componentId) ?? null
})

const componentSetId = computed(() => {
  const comp = instanceComponent.value
  if (!comp) return null
  const parent = comp.parentId ? editor.graph.getNode(comp.parentId) : null
  return parent?.type === 'COMPONENT_SET' ? parent.id : null
})

const variantOptions = computed(() => {
  const csId = componentSetId.value
  if (!csId) return new Map<string, Set<string>>()
  return editor.collectVariantOptions(csId)
})

const currentValues = computed(() => {
  return instanceComponent.value?.componentPropertyValues ?? {}
})

const overrideCount = computed(() => {
  if (!node.value || node.value.type !== 'INSTANCE' || !node.value.overrides) return 0
  return Object.keys(node.value.overrides).length
})

const hasOverrides = computed(() => overrideCount.value > 0)

function switchVariant(propertyName: string, newValue: string) {
  if (!node.value) return
  editor.switchInstanceVariant(node.value.id, propertyName, newValue)
}

function onGoToMainComponent() {
  editor.goToMainComponent()
}

function onDetachInstance() {
  editor.detachInstance()
}

function onResetOverrides() {
  if (!node.value || node.value.type !== 'INSTANCE') return
  editor.resetInstanceOverrides(node.value.id)
}
</script>

<template>
  <div v-if="isInstance && node" data-test-id="variant-section" :class="sectionCls.wrapper">
    <!-- Instance Header & Quick Actions -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <icon-lucide-component class="size-3.5 text-component" />
        <label class="text-[11px] font-semibold text-component">Instance</label>
      </div>

      <div class="flex items-center gap-1">
        <Tip :label="panels.goToMainComponent">
          <button
            data-test-id="design-go-to-component"
            class="flex cursor-pointer items-center justify-center p-1 rounded bg-component/15 text-component hover:bg-component/25 transition-colors"
            @click="onGoToMainComponent"
          >
            <icon-lucide-external-link class="size-3" />
          </button>
        </Tip>

        <Tip :label="panels.detachInstance">
          <button
            data-test-id="design-detach-instance"
            class="flex cursor-pointer items-center justify-center p-1 rounded text-muted hover:bg-hover hover:text-surface transition-colors"
            @click="onDetachInstance"
          >
            <icon-lucide-unlink class="size-3" />
          </button>
        </Tip>
      </div>
    </div>

    <!-- Main Component Name & Status -->
    <div
      class="flex items-center justify-between p-1.5 rounded bg-panel border border-border mb-2 text-xs"
    >
      <span class="truncate font-medium text-surface max-w-[70%]">{{
        instanceComponent?.name ?? 'Main Component'
      }}</span>
      <span
        v-if="hasOverrides"
        class="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-500 font-semibold"
        >{{ overrideCount }} override{{ overrideCount > 1 ? 's' : '' }}</span
      >
    </div>

    <!-- Reset Overrides Button -->
    <button
      v-if="hasOverrides"
      data-test-id="reset-overrides-btn"
      class="mb-2.5 flex w-full cursor-pointer items-center justify-center gap-1 rounded border border-border bg-input py-1 text-[10px] font-semibold text-muted hover:bg-hover hover:text-surface transition-colors"
      @click="onResetOverrides"
    >
      <icon-lucide-rotate-ccw class="size-3" />
      Reset Overrides
    </button>

    <!-- Variant Switchers -->
    <div v-if="variantOptions.size > 0" class="flex flex-col gap-1.5">
      <span class="text-[9px] font-semibold uppercase tracking-wider text-muted">{{
        panels.variants
      }}</span>
      <div
        v-for="[propName, options] in variantOptions"
        :key="propName"
        class="flex flex-col gap-0.5"
      >
        <label class="text-[10px] text-muted">{{ propName }}</label>
        <AppSelect
          :model-value="currentValues[propName] ?? ''"
          :options="[...options].map((v) => ({ value: v, label: v }))"
          @update:model-value="switchVariant(propName, $event)"
        />
      </div>
    </div>
  </div>
</template>
