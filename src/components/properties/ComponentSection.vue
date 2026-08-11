<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'

import Tip from '@/components/ui/Tip.vue'
import type { SceneNode } from '@nex-design/core/scene-graph'
import { useSectionUI } from '@/components/ui/section'
import { useSceneComputed, useSelectionState } from '@nex-design/vue'

const editor = useEditorStore()
const { selectedNode: node } = useSelectionState()
const selectedNodes = useSceneComputed<SceneNode[]>(() => editor.getSelectedNodes())
const sectionCls = useSectionUI()

const isComponentSet = computed(() => node.value?.type === 'COMPONENT_SET')
const isComponent = computed(() => node.value?.type === 'COMPONENT')
const parentComponentSet = computed(() => {
  if (!node.value?.parentId) return null
  const parent = editor.graph.getNode(node.value.parentId)
  return parent?.type === 'COMPONENT_SET' ? parent : null
})

const multipleComponentsSelected = computed(() => {
  return (
    selectedNodes.value.length > 1 &&
    selectedNodes.value.every((n: SceneNode) => n.type === 'COMPONENT')
  )
})

const showComponentSection = computed(() => {
  return isComponentSet.value || isComponent.value || multipleComponentsSelected.value
})

const propDefs = computed(() => {
  if (!node.value || node.value.type !== 'COMPONENT_SET') return []
  return node.value.componentPropertyDefinitions ?? []
})

const currentPropValues = computed(() => {
  if (!node.value || node.value.type !== 'COMPONENT') return {}
  return node.value.componentPropertyValues ?? {}
})

const newPropName = ref('')
const newPropType = ref<'VARIANT' | 'BOOLEAN' | 'TEXT'>('VARIANT')
const isAddingProp = ref(false)

function onAddProperty() {
  if (!node.value || node.value.type !== 'COMPONENT_SET') return
  const name = newPropName.value.trim() || `Property ${propDefs.value.length + 1}`
  editor.addPropertyDefinition(node.value.id, name, newPropType.value, 'Default')
  newPropName.value = ''
  isAddingProp.value = false
}

function onRemoveProperty(propId: string) {
  if (!node.value || node.value.type !== 'COMPONENT_SET') return
  editor.removePropertyDefinition(node.value.id, propId)
}

function onRenameProperty(propId: string, name: string) {
  if (!node.value || node.value.type !== 'COMPONENT_SET') return
  editor.renamePropertyDefinition(node.value.id, propId, name)
}

function onAddVariant() {
  if (isComponentSet.value && node.value) {
    editor.addVariantToComponentSet(node.value.id)
  } else if (parentComponentSet.value) {
    editor.addVariantToComponentSet(parentComponentSet.value.id)
  }
}

function onUpdateVariantValue(propName: string, value: string) {
  if (!node.value || node.value.type !== 'COMPONENT') return
  const current = { ...node.value.componentPropertyValues }
  current[propName] = value
  editor.updateNodeWithUndo(
    node.value.id,
    { componentPropertyValues: current },
    'Change variant property'
  )
}

function onCombineAsVariants() {
  editor.createComponentSetFromComponents()
}
</script>

<template>
  <div v-if="showComponentSection" data-test-id="component-section" :class="sectionCls.wrapper">
    <!-- Multiple components selected: Combine as variants -->
    <template v-if="multipleComponentsSelected">
      <div class="flex items-center justify-between">
        <label class="text-[11px] font-semibold text-component">Component Selection</label>
        <span class="text-[10px] text-muted">{{ selectedNodes.length }} components</span>
      </div>
      <button
        data-test-id="combine-as-variants-btn"
        class="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-component/15 py-1.5 text-xs font-medium text-component transition-colors hover:bg-component/25"
        @click="onCombineAsVariants"
      >
        <icon-lucide-grid class="size-3.5" />
        Combine as Variants
      </button>
    </template>

    <!-- Component Set selected -->
    <template v-else-if="isComponentSet && node">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <icon-lucide-component class="size-3.5 text-component" />
          <label class="text-[11px] font-semibold text-component">Component Set</label>
        </div>
        <Tip label="Add new variant to component set">
          <button
            data-test-id="add-variant-btn"
            class="flex cursor-pointer items-center gap-1 rounded bg-component px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-component/90"
            @click="onAddVariant"
          >
            <icon-lucide-plus class="size-3" />
            Add Variant
          </button>
        </Tip>
      </div>

      <!-- Properties list -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-semibold uppercase tracking-wider text-muted"
            >Properties</span
          >
          <button
            class="cursor-pointer text-[10px] text-component hover:underline"
            @click="isAddingProp = !isAddingProp"
          >
            {{ isAddingProp ? 'Cancel' : '+ Property' }}
          </button>
        </div>

        <!-- Add property form -->
        <div
          v-if="isAddingProp"
          class="flex flex-col gap-1.5 p-2 rounded bg-input border border-border"
        >
          <input
            v-model="newPropName"
            type="text"
            placeholder="Property Name"
            class="w-full bg-transparent text-xs text-surface border-b border-border outline-none pb-1"
          />
          <div class="flex items-center gap-1.5">
            <AppSelect
              v-model="newPropType"
              class="flex-1"
              :options="[
                { value: 'VARIANT', label: 'Variant' },
                { value: 'BOOLEAN', label: 'Boolean' },
                { value: 'TEXT', label: 'Text' }
              ]"
            />
            <button
              class="rounded bg-component px-2 py-1 text-xs font-medium text-white hover:bg-component/90"
              @click="onAddProperty"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Property definitions list -->
        <div
          v-for="def in propDefs"
          :key="def.id"
          class="flex items-center justify-between p-1.5 rounded bg-panel border border-border/60 text-xs"
        >
          <input
            type="text"
            :value="def.name"
            class="min-w-0 flex-1 bg-transparent font-medium text-surface border-none outline-none focus:ring-0 p-0 text-[11px]"
            @change="onRenameProperty(def.id, ($event.target as HTMLInputElement).value)"
          />
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-mono uppercase px-1 rounded bg-muted/20 text-muted">{{
              def.type
            }}</span>
            <button
              class="text-muted hover:text-red-500 cursor-pointer"
              title="Delete property"
              @click="onRemoveProperty(def.id)"
            >
              <icon-lucide-trash-2 class="size-3" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Component Variant selected -->
    <template v-else-if="isComponent && node">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <icon-lucide-component class="size-3.5 text-component" />
          <label class="text-[11px] font-semibold text-component">
            {{ parentComponentSet ? 'Component Variant' : 'Component' }}
          </label>
        </div>
        <button
          v-if="parentComponentSet"
          class="flex cursor-pointer items-center gap-1 rounded bg-component/15 px-2 py-0.5 text-[10px] font-semibold text-component hover:bg-component/25"
          @click="onAddVariant"
        >
          <icon-lucide-plus class="size-3" />
          Add Variant
        </button>
      </div>

      <!-- Variant property values editor -->
      <div v-if="parentComponentSet" class="flex flex-col gap-1.5">
        <span class="text-[9px] font-semibold uppercase tracking-wider text-muted"
          >Variant Values</span
        >
        <div
          v-for="def in parentComponentSet.componentPropertyDefinitions ?? []"
          :key="def.id"
          class="flex flex-col gap-0.5"
        >
          <label class="text-[10px] text-muted">{{ def.name }}</label>
          <input
            type="text"
            :value="currentPropValues[def.name] ?? ''"
            class="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-component"
            @change="onUpdateVariantValue(def.name, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
