<script setup lang="ts">
import { computed } from 'vue'

import { parseColor } from '@nex-design/core/color'
import type { Action, ActionType, OverlayPosition, SceneNode } from '@nex-design/core/scene-graph'

import AppSelect from '@/components/ui/AppSelect.vue'

import {
  ACTION_OPTIONS,
  ANIMATED_ACTIONS,
  FRAME_ACTIONS,
  OVERLAY_ACTIONS,
  OVERLAY_POSITION_OPTIONS,
  actionOfType,
  defaultTransition
} from './options'
import TransitionPicker from './TransitionPicker.vue'
import { usePrototypeTargets } from './usePrototypeTargets'

const { source } = defineProps<{ source: SceneNode }>()
const action = defineModel<Action>({ required: true })

const {
  frameOptions,
  layerOptions,
  variantOptions,
  variableOptions,
  getVariable,
  variableDefaultValue,
  displayVariableValue
} = usePrototypeTargets()

const frames = computed(() => frameOptions(source.id))
const variants = computed(() => variantOptions(source))
const variable = computed(() => getVariable(action.value.variableId))

function patch(changes: Partial<Action>) {
  action.value = { ...action.value, ...changes }
}

function setType(type: ActionType) {
  const next = actionOfType(type, action.value, {
    frameId: frames.value[0]?.value,
    variantId: variants.value[0]?.value,
    layerId: layerOptions.value[0]?.value
  })
  if (type === 'SET_VARIABLE') {
    const first = getVariable(variableOptions.value[0]?.value)
    if (first) {
      next.variableId = first.id
      next.variableValue = variableDefaultValue(first)
    }
  }
  action.value = next
}

function setVariable(id: string) {
  const picked = getVariable(id)
  if (picked) patch({ variableId: id, variableValue: variableDefaultValue(picked) })
}

function setVariableValue(raw: string | number | boolean) {
  if (!variable.value) return
  patch({ variableValue: variable.value.type === 'COLOR' ? parseColor(String(raw)) : raw })
}

function setOverlay(changes: Partial<NonNullable<Action['overlay']>>) {
  patch({ overlay: { ...action.value.overlay, ...changes } })
}

function setOverlayPosition(position: OverlayPosition) {
  setOverlay({
    position,
    offset: position === 'MANUAL' ? (action.value.overlay?.offset ?? { x: 0, y: 0 }) : undefined
  })
}

function setOffset(axis: 'x' | 'y', event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (!Number.isFinite(value)) return
  const offset = action.value.overlay?.offset ?? { x: 0, y: 0 }
  setOverlay({ offset: { ...offset, [axis]: value } })
}

const urlInvalid = computed(() => {
  if (action.value.type !== 'URL') return false
  try {
    return !['http:', 'https:', 'mailto:'].includes(new URL(action.value.url ?? '').protocol)
  } catch {
    return true
  }
})
</script>

<template>
  <div class="flex flex-col gap-2" data-test-id="prototype-action">
    <AppSelect
      :options="ACTION_OPTIONS"
      :model-value="action.type"
      test-id="prototype-action-type"
      @update:model-value="setType"
    />

    <div v-if="FRAME_ACTIONS.has(action.type)" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Destination</span>
      <AppSelect
        v-if="frames.length > 0"
        :options="frames"
        :model-value="action.destinationId ?? ''"
        test-id="prototype-action-destination"
        @update:model-value="patch({ destinationId: $event })"
      />
      <span v-else class="text-[10px] italic text-muted">Create another frame to target</span>
    </div>

    <div v-if="action.type === 'CHANGE_TO'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Variant</span>
      <AppSelect
        v-if="variants.length > 0"
        :options="variants"
        :model-value="action.destinationId ?? ''"
        @update:model-value="patch({ destinationId: $event })"
      />
      <span v-else class="text-[10px] italic text-muted"
        >Source must be inside a component set</span
      >
    </div>

    <div v-if="action.type === 'SCROLL_TO'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Scroll to layer</span>
      <AppSelect
        v-if="layerOptions.length > 0"
        :options="layerOptions"
        :model-value="action.destinationId ?? ''"
        @update:model-value="patch({ destinationId: $event })"
      />
    </div>

    <label v-if="action.type === 'URL'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Link (http, https, or mailto)</span>
      <input
        type="url"
        :value="action.url ?? ''"
        data-test-id="prototype-action-url"
        placeholder="https://example.com"
        class="rounded border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
        :class="urlInvalid ? 'border-red-400' : 'border-border'"
        @change="patch({ url: ($event.target as HTMLInputElement).value.trim() })"
      />
    </label>

    <div v-if="action.type === 'SET_VARIABLE'" class="flex flex-col gap-2">
      <AppSelect
        v-if="variableOptions.length > 0"
        :options="variableOptions"
        :model-value="action.variableId ?? ''"
        @update:model-value="setVariable"
      />
      <span v-else class="text-[10px] italic text-muted">Create a variable first</span>
      <template v-if="variable">
        <input
          v-if="variable.type === 'BOOLEAN'"
          type="checkbox"
          :checked="action.variableValue === true"
          class="size-3.5 accent-accent"
          @change="setVariableValue(($event.target as HTMLInputElement).checked)"
        />
        <input
          v-else
          :type="variable.type === 'FLOAT' ? 'number' : 'text'"
          :value="displayVariableValue(variable, action.variableValue)"
          :placeholder="variable.type === 'COLOR' ? '#000000' : undefined"
          class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
          @change="
            setVariableValue(
              variable.type === 'FLOAT'
                ? ($event.target as HTMLInputElement).valueAsNumber
                : ($event.target as HTMLInputElement).value
            )
          "
        />
      </template>
    </div>

    <div
      v-if="OVERLAY_ACTIONS.has(action.type)"
      class="flex flex-col gap-2 border-t border-border/50 pt-2"
    >
      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-muted">Overlay position</span>
        <AppSelect
          :options="OVERLAY_POSITION_OPTIONS"
          :model-value="action.overlay?.position ?? 'CENTER'"
          test-id="prototype-overlay-position"
          @update:model-value="setOverlayPosition"
        />
      </div>
      <div v-if="action.overlay?.position === 'MANUAL'" class="grid grid-cols-2 gap-2">
        <label v-for="axis in ['x', 'y'] as const" :key="axis" class="flex items-center gap-1">
          <span class="w-3 text-[10px] uppercase text-muted">{{ axis }}</span>
          <input
            type="number"
            :value="action.overlay?.offset?.[axis] ?? 0"
            class="min-w-0 flex-1 rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
            @change="setOffset(axis, $event)"
          />
        </label>
      </div>
      <label class="flex items-center gap-2 text-[10px] text-muted">
        <input
          type="checkbox"
          class="size-3 accent-accent"
          :checked="action.overlay?.closeOnOutsideClick ?? true"
          @change="setOverlay({ closeOnOutsideClick: ($event.target as HTMLInputElement).checked })"
        />
        Close when clicking outside
      </label>
      <label class="flex items-center gap-2 text-[10px] text-muted">
        <input
          type="checkbox"
          class="size-3 accent-accent"
          :checked="action.overlay?.backdrop ?? true"
          @change="setOverlay({ backdrop: ($event.target as HTMLInputElement).checked })"
        />
        Dim background
      </label>
    </div>

    <div v-if="ANIMATED_ACTIONS.has(action.type)" class="border-t border-border/50 pt-2">
      <TransitionPicker
        :model-value="action.transition ?? defaultTransition()"
        @update:model-value="patch({ transition: $event })"
      />
    </div>
  </div>
</template>
