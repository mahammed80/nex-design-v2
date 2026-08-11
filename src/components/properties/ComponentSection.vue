<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'

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

// Get all variants of the parent component set
const variants = computed(() => {
  const compSet = parentComponentSet.value
  if (!compSet) return []
  return compSet.childIds
    .map((id) => editor.graph.getNode(id))
    .filter((n): n is SceneNode => !!n && n.type === 'COMPONENT')
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

function uniqueValuesForProperty(propName: string) {
  const values = new Set<string>()
  if (propName.toLowerCase() === 'state') {
    const semantic = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Error']
    for (const s of semantic) {
      values.add(s)
    }
  }
  const compSet = isComponentSet.value ? node.value : parentComponentSet.value
  if (compSet) {
    for (const cid of compSet.childIds) {
      const child = editor.graph.getNode(cid)
      if (child?.componentPropertyValues) {
        const val = child.componentPropertyValues[propName]
        if (val) values.add(val)
      }
    }
    const def = compSet.componentPropertyDefinitions?.find((d) => d.name === propName)
    if (def?.variantOptions) {
      for (const opt of def.variantOptions) {
        values.add(opt)
      }
    }
  }
  if (values.size === 0) {
    values.add('Default')
  }
  return Array.from(values)
}

function onRenameValueGlobally(propName: string, oldValue: string) {
  const compSet = isComponentSet.value ? node.value : parentComponentSet.value
  if (!compSet) return
  const newVal = prompt(`Rename variant value "${oldValue}" globally to:`, oldValue)
  if (newVal && newVal.trim() !== '') {
    editor.renameVariantValue(compSet.id, propName, oldValue, newVal.trim())
  }
}

function onDeleteValueGlobally(propName: string, valueToDelete: string) {
  const compSet = isComponentSet.value ? node.value : parentComponentSet.value
  if (!compSet) return
  if (confirm(`Are you sure you want to delete the variant value "${valueToDelete}" globally? It will reset to the default value on all variants.`)) {
    editor.deleteVariantValue(compSet.id, propName, valueToDelete)
  }
}

function onAddVariant() {
  if (!editor || !node.value) return
  const compSet = isComponentSet.value ? node.value : parentComponentSet.value
  
  if (compSet) {
    const customValues: Record<string, string> = {}
    for (const def of compSet.componentPropertyDefinitions || []) {
      if (def.type === 'VARIANT') {
        const defaultVal = `Variant ${compSet.childIds.length + 1}`
        const val = prompt(`Enter value for property "${def.name}":`, defaultVal)
        customValues[def.name] = val && val.trim() !== '' ? val.trim() : defaultVal
      }
    }
    
    if (isComponentSet.value) {
      editor.addVariantToComponentSet(node.value.id, customValues)
    } else {
      editor.addVariantToComponentSet(compSet.id, customValues)
    }
  } else if (isComponent.value) {
    const val = prompt(`Enter value for property "State" for the new variant:`, `Variant 2`)
    const customValues = { State: val && val.trim() !== '' ? val.trim() : 'Variant 2' }
    editor.addVariantToStandaloneComponent(node.value.id, customValues)
  }
}

function onSelectVariant(variantId: string) {
  editor.select([variantId])
}

function onDeleteVariant(variantId: string, e: MouseEvent) {
  e.stopPropagation()
  if (!editor || !parentComponentSet.value) return
  
  const prevSelection = Array.from(editor.state.selectedIds)
  editor.select([variantId])
  editor.deleteSelected()
  
  if (prevSelection.includes(variantId)) {
    const remaining = parentComponentSet.value.childIds.filter(id => id !== variantId)
    if (remaining.length > 0) {
      editor.select([remaining[0]])
    } else {
      editor.select([parentComponentSet.value.id])
    }
  } else {
    editor.select(prevSelection.filter(id => id !== variantId))
  }
}

function onUpdateVariantValue(propName: string, value: string) {
  if (!node.value || node.value.type !== 'COMPONENT') return
  const current = { ...node.value.componentPropertyValues }
  current[propName] = value

  // Keep name synced with property values
  const newName = editor.buildVariantName(current) || value

  editor.updateNodeWithUndo(
    node.value.id,
    { 
      componentPropertyValues: current,
      name: newName
    },
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
        <div class="flex items-center gap-1">
          <button
            class="flex cursor-pointer items-center gap-1 rounded bg-component/15 px-2 py-0.5 text-[10px] font-semibold text-component hover:bg-component/25 transition-colors"
            @click="editor.insertComponentSetInstance(node.id)"
          >
            <icon-lucide-plus-circle class="size-3" />
            Insert Instance
          </button>
          <button
            data-test-id="add-variant-btn"
            class="flex cursor-pointer items-center gap-1 rounded bg-component px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-component/90"
            @click="onAddVariant"
          >
            <icon-lucide-plus class="size-3" />
            Add Variant
          </button>
        </div>
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

        <!-- Add Property Form -->
        <div v-if="isAddingProp" class="flex flex-col gap-2 p-2 rounded bg-muted/10 border border-border/80">
          <input
            type="text"
            v-model="newPropName"
            placeholder="Property Name"
            class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-component"
            @keyup.enter="onAddProperty"
          />
          <div class="flex items-center justify-between gap-2">
            <AppSelect
              v-model="newPropType"
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
        <div class="flex flex-col gap-1.5">
          <div
            v-for="def in propDefs"
            :key="def.id"
            class="flex flex-col gap-1 p-2 rounded bg-panel border border-border/60 text-xs"
          >
            <div class="flex items-center justify-between">
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
            
            <!-- Global Value tags inside Component Set view -->
            <div v-if="def.type === 'VARIANT'" class="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-border/40">
              <span class="text-[9px] text-muted mr-1">Values:</span>
              <div
                v-for="val in uniqueValuesForProperty(def.name)"
                :key="val"
                class="group/tag inline-flex items-center gap-1 rounded bg-muted/15 hover:bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted cursor-pointer"
                title="Click to rename, click 'x' to delete"
                @click="onRenameValueGlobally(def.name, val)"
              >
                <span>{{ val }}</span>
                <button
                  class="opacity-0 group-hover/tag:opacity-100 text-muted hover:text-red-400 cursor-pointer ml-0.5"
                  title="Delete value globally"
                  @click.stop="onDeleteValueGlobally(def.name, val)"
                >
                  <icon-lucide-x class="size-2" />
                </button>
              </div>
            </div>
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
        <div class="flex items-center gap-1">
          <button
            class="flex cursor-pointer items-center gap-1 rounded bg-component/15 px-2 py-0.5 text-[10px] font-semibold text-component hover:bg-component/25 transition-colors"
            @click="editor.createInstanceFromComponent(node.id)"
          >
            <icon-lucide-plus-circle class="size-3" />
            Insert Instance
          </button>
          <button
            class="flex cursor-pointer items-center gap-1 rounded bg-component/15 px-2 py-0.5 text-[10px] font-semibold text-component hover:bg-component/25"
            @click="onAddVariant"
          >
            <icon-lucide-plus class="size-3" />
            Add Variant
          </button>
        </div>
      </div>

      <!-- Variants List Section -->
      <div v-if="parentComponentSet" class="flex flex-col gap-1.5 border-b border-border/50 pb-3 mb-3">
        <span class="text-[9px] font-semibold uppercase tracking-wider text-muted">Variants</span>
        <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
          <div
            v-for="v in variants"
            :key="v.id"
            :class="[
              'group flex items-center justify-between gap-1.5 px-2 py-1 rounded border text-[11px] font-medium cursor-pointer transition-colors max-w-full truncate',
              v.id === node.id
                ? 'bg-component/10 border-component text-component'
                : 'bg-panel border-border text-surface hover:bg-hover'
            ]"
            @click="onSelectVariant(v.id)"
          >
            <span class="truncate">{{ v.name }}</span>
            <button
              v-if="variants.length > 1"
              class="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 cursor-pointer"
              title="Delete variant"
              @click="onDeleteVariant(v.id, $event)"
            >
              <icon-lucide-trash-2 class="size-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Variant property values editor -->
      <div v-if="parentComponentSet" class="flex flex-col gap-1.5">
        <span class="text-[9px] font-semibold uppercase tracking-wider text-muted"
          >Properties</span
        >
        <div
          v-for="def in parentComponentSet.componentPropertyDefinitions ?? []"
          :key="def.id"
          class="flex flex-col gap-0.5"
        >
          <label class="text-[10px] text-muted">{{ def.name }}</label>
          <div class="flex items-center gap-1.5">
            <AppSelect
              :model-value="currentPropValues[def.name] ?? ''"
              :options="uniqueValuesForProperty(def.name).map(v => ({ value: v, label: v }))"
              @update:model-value="onUpdateVariantValue(def.name, $event)"
              class="flex-1 text-xs"
            />
            <input
              type="text"
              :value="currentPropValues[def.name] ?? ''"
              placeholder="Or type new..."
              class="w-24 rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-component"
              @change="onUpdateVariantValue(def.name, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
