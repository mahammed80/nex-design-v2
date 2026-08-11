<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n, useSelectionState } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'

import VariablesDialog from './VariablesDialog.vue'
import AppearanceSection from './properties/AppearanceSection.vue'
import EffectsSection from './properties/EffectsSection.vue'
import ExportSection from './properties/ExportSection.vue'
import FillSection from './properties/FillSection.vue'
import LayoutSection from './properties/LayoutSection/LayoutSection.vue'
import PageSection from './properties/PageSection.vue'
import PositionSection from './properties/PositionSection.vue'
import StrokeSection from './properties/StrokeSection.vue'
import TypographySection from './properties/TypographySection.vue'
import VariablesSection from './properties/VariablesSection.vue'
import VariantSection from './properties/VariantSection.vue'
import ComponentSection from './properties/ComponentSection.vue'
import BooleanSection from './properties/BooleanSection.vue'
import VectorSection from './properties/VectorSection.vue'
import DevicePresetsSection from './properties/DevicePresetsSection.vue'
import GridSection from './properties/GridSection.vue'

const variablesOpen = ref(false)
const { selectedNode: node, selectedCount: multiCount } = useSelectionState()
const store = useEditorStore()
const isFrameToolActive = computed(() => store.state.activeTool === 'FRAME')

const isComponentType = computed(() => {
  const t = node.value?.type
  return t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'INSTANCE'
})
const { panels } = useI18n()
</script>

<template>
  <!-- Frame tool active: show device presets -->
  <div
    v-if="isFrameToolActive"
    data-test-id="design-panel-presets"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto"
  >
    <DevicePresetsSection />
  </div>

  <!-- Multi-select summary -->
  <div
    v-else-if="multiCount > 1"
    data-test-id="design-panel-multi"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <div
      data-test-id="design-multi-header"
      class="flex items-center gap-1.5 border-b border-border px-3 py-2"
    >
      <span class="text-[11px] text-muted">{{ panels.mixed }}</span>
      <span class="text-xs font-semibold">{{
        panels.layersCount({ count: String(multiCount) })
      }}</span>
    </div>
    <PositionSection />
    <AppearanceSection />
    <FillSection />
    <StrokeSection />
    <EffectsSection />
    <GridSection />
  </div>

  <!-- Single selection -->
  <div
    v-else-if="node"
    data-test-id="design-panel-single"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <div
      data-test-id="design-node-header"
      class="flex items-center gap-1.5 border-b border-border px-3 py-2"
    >
      <span class="text-[11px]" :class="isComponentType ? 'text-component' : 'text-muted'">{{
        node.type
      }}</span>
      <span class="text-xs font-semibold">{{ node.name }}</span>
    </div>

    <ComponentSection />
    <BooleanSection />
    <VectorSection />
    <VariantSection v-if="node.type === 'INSTANCE'" />

    <PositionSection />
    <LayoutSection />
    <AppearanceSection />
    <TypographySection v-if="node.type === 'TEXT'" />
    <FillSection />
    <StrokeSection />
    <EffectsSection />
    <GridSection />

    <ExportSection />
  </div>

  <div
    v-else
    data-test-id="design-panel-empty"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <PageSection />
    <VariablesSection @open-dialog="variablesOpen = true" />
    <ExportSection />
  </div>

  <VariablesDialog v-model:open="variablesOpen" />
</template>
