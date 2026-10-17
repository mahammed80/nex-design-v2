<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import Tip from '@/components/ui/Tip.vue'
import { useInputUI } from '@/components/ui/input'
import { useSectionUI } from '@/components/ui/section'
import { useI18n, useSelectionState } from '@nex-design/vue'

const editor = useEditorStore()
const { selectedNode: node } = useSelectionState()
const sectionCls = useSectionUI()
const inputCls = useInputUI({ size: 'sm' })
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
  return {
    ...instanceComponent.value?.componentPropertyValues,
    ...node.value?.componentPropertyValues
  }
})

const propertyDefinitions = computed(() => {
  const component = instanceComponent.value
  if (!component) return []
  const parent = component.parentId ? editor.graph.getNode(component.parentId) : null
  const owner = parent?.type === 'COMPONENT_SET' ? parent : component
  return owner.componentPropertyDefinitions.filter((definition) => definition.type !== 'VARIANT')
})

const componentOptions = computed(() =>
  [...editor.graph.getAllNodes()]
    .filter((candidate) => candidate.type === 'COMPONENT')
    .map((candidate) => ({ value: candidate.id, label: candidate.name }))
)

const overrideCount = computed(() => {
  if (!node.value || node.value.type !== 'INSTANCE' || !node.value.overrides) return 0
  return (
    Object.keys(node.value.overrides).length +
    Object.keys(node.value.componentPropertyValues).length
  )
})

const hasOverrides = computed(() => overrideCount.value > 0)

function switchVariant(propertyName: string, newValue: string) {
  if (!node.value) return
  editor.switchInstanceVariant(node.value.id, propertyName, newValue)
}

function currentVariantValue(propertyName: string): string {
  const value = currentValues.value[propertyName]
  return typeof value === 'string' ? value : ''
}

function setTextProperty(propertyName: string, event: Event) {
  if (!node.value || node.value.type !== 'INSTANCE') return
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  editor.setComponentPropertyValue(node.value.id, propertyName, target.value)
}

function setBooleanProperty(propertyName: string, event: Event) {
  if (!node.value || node.value.type !== 'INSTANCE') return
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  editor.setComponentPropertyValue(node.value.id, propertyName, target.checked)
}

function setInstanceSwapProperty(propertyName: string, componentId: string) {
  if (!node.value || node.value.type !== 'INSTANCE') return
  editor.setComponentPropertyValue(node.value.id, propertyName, componentId)
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
          :model-value="currentVariantValue(propName)"
          :options="[...options].map((v) => ({ value: v, label: v }))"
          @update:model-value="switchVariant(propName, $event)"
        />
      </div>
    </div>

    <div v-if="propertyDefinitions.length > 0" class="mt-2.5 flex flex-col gap-1.5">
      <span class="text-[9px] font-semibold uppercase tracking-wider text-muted">Properties</span>
      <div
        v-for="definition in propertyDefinitions"
        :key="definition.id"
        class="flex flex-col gap-0.5"
      >
        <label class="text-[10px] text-muted">{{ definition.name }}</label>
        <input
          v-if="definition.type === 'TEXT'"
          :value="String(currentValues[definition.name] ?? definition.defaultValue)"
          :class="inputCls.base"
          @change="setTextProperty(definition.name, $event)"
        />
        <label
          v-else-if="definition.type === 'BOOLEAN'"
          class="flex items-center justify-between rounded border border-border bg-input px-2 py-1 text-[11px] text-surface"
        >
          <span>{{
            (currentValues[definition.name] ?? definition.defaultValue) ? 'Visible' : 'Hidden'
          }}</span>
          <input
            type="checkbox"
            class="size-3.5 accent-component"
            :checked="Boolean(currentValues[definition.name] ?? definition.defaultValue)"
            @change="setBooleanProperty(definition.name, $event)"
          />
        </label>
        <AppSelect
          v-else-if="definition.type === 'INSTANCE_SWAP'"
          :model-value="String(currentValues[definition.name] ?? definition.defaultValue)"
          :options="componentOptions"
          @update:model-value="setInstanceSwapProperty(definition.name, $event)"
        />
      </div>
    </div>
  </div>
</template>
