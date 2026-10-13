<script setup lang="ts">
import type { EasingType, Transition, TransitionType } from '@nex-design/core/scene-graph'

import AppSelect from '@/components/ui/AppSelect.vue'

import {
  DIRECTIONAL_TRANSITIONS,
  EASING_OPTIONS,
  TRANSITION_DIRECTIONS,
  TRANSITION_OPTIONS
} from './options'

const transition = defineModel<Transition>({ required: true })

function setType(type: TransitionType) {
  const direction = DIRECTIONAL_TRANSITIONS.has(type)
    ? (transition.value.direction ?? 'RIGHT')
    : undefined
  transition.value = { ...transition.value, type, direction }
}

function setEasing(easing: EasingType) {
  transition.value = { ...transition.value, easing }
}

function setDuration(event: Event) {
  const duration = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(duration) && duration >= 0)
    transition.value = { ...transition.value, duration }
}
</script>

<template>
  <div class="flex flex-col gap-2.5" data-test-id="prototype-transition">
    <div class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Animation</span>
      <AppSelect
        :options="TRANSITION_OPTIONS"
        :model-value="transition.type"
        test-id="prototype-transition-type"
        @update:model-value="setType"
      />
    </div>

    <div v-if="DIRECTIONAL_TRANSITIONS.has(transition.type)" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Direction</span>
      <div class="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Transition direction">
        <button
          v-for="direction in TRANSITION_DIRECTIONS"
          :key="direction.value"
          type="button"
          role="radio"
          :aria-checked="transition.direction === direction.value"
          :title="direction.label"
          :data-test-id="`prototype-transition-direction-${direction.value.toLowerCase()}`"
          class="flex items-center justify-center rounded border py-1 transition-colors"
          :class="
            transition.direction === direction.value
              ? 'border-accent bg-accent/15 text-surface'
              : 'border-border text-muted hover:text-surface'
          "
          @click="transition = { ...transition, direction: direction.value }"
        >
          <icon-lucide-arrow-left v-if="direction.icon === 'left'" class="size-3.5" />
          <icon-lucide-arrow-right v-else-if="direction.icon === 'right'" class="size-3.5" />
          <icon-lucide-arrow-up v-else-if="direction.icon === 'up'" class="size-3.5" />
          <icon-lucide-arrow-down v-else class="size-3.5" />
        </button>
      </div>
    </div>

    <div v-if="transition.type !== 'INSTANT'" class="grid grid-cols-2 gap-2">
      <div class="flex flex-col gap-1">
        <span class="text-[10px] text-muted">Easing</span>
        <AppSelect
          :options="EASING_OPTIONS"
          :model-value="transition.easing"
          test-id="prototype-transition-easing"
          @update:model-value="setEasing"
        />
      </div>
      <label class="flex flex-col gap-1">
        <span class="text-[10px] text-muted">Duration (ms)</span>
        <input
          type="number"
          min="0"
          step="50"
          :value="transition.duration"
          data-test-id="prototype-transition-duration"
          class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
          @change="setDuration"
        />
      </label>
    </div>
  </div>
</template>
