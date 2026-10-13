<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

import type { DragDirection, Trigger, TriggerType } from '@nex-design/core/scene-graph'

import AppSelect from '@/components/ui/AppSelect.vue'

import { DEFAULT_DELAY_MS, DRAG_DIRECTION_OPTIONS, TRIGGER_OPTIONS } from './options'

const trigger = defineModel<Trigger>({ required: true })
const recording = ref(false)

function setType(type: TriggerType) {
  trigger.value = {
    type,
    ...(type === 'AFTER_DELAY' ? { delay: trigger.value.delay ?? DEFAULT_DELAY_MS } : {}),
    ...(type === 'ON_DRAG' ? { direction: trigger.value.direction ?? 'left' } : {}),
    ...(type === 'ON_KEY_DOWN' ? { keys: trigger.value.keys ?? [] } : {})
  }
}

function setDelay(event: Event) {
  const delay = (event.target as HTMLInputElement).valueAsNumber
  if (Number.isFinite(delay) && delay >= 0) trigger.value = { ...trigger.value, delay }
}

function setDirection(direction: DragDirection) {
  trigger.value = { ...trigger.value, direction }
}

function removeKey(code: string) {
  trigger.value = { ...trigger.value, keys: (trigger.value.keys ?? []).filter((k) => k !== code) }
}

// While recording, the next key press (by physical `code`, so layouts and Option don't matter)
// is added to the trigger. Capture phase so it never reaches editor shortcuts.
useEventListener(
  window,
  'keydown',
  (event: KeyboardEvent) => {
    if (!recording.value || event.repeat) return
    event.preventDefault()
    event.stopImmediatePropagation()
    recording.value = false
    if (event.code === 'Escape') return
    const keys = trigger.value.keys ?? []
    if (!keys.includes(event.code))
      trigger.value = { ...trigger.value, keys: [...keys, event.code] }
  },
  { capture: true }
)

function keyLabel(code: string): string {
  return code.replace(/^(Key|Digit)/, '').replace(/^Arrow/, 'Arrow ')
}
</script>

<template>
  <div class="flex flex-col gap-2" data-test-id="prototype-trigger">
    <div class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Trigger</span>
      <AppSelect
        :options="TRIGGER_OPTIONS"
        :model-value="trigger.type"
        test-id="prototype-trigger-type"
        @update:model-value="setType"
      />
    </div>

    <label v-if="trigger.type === 'AFTER_DELAY'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Delay (ms)</span>
      <input
        type="number"
        min="0"
        step="100"
        :value="trigger.delay ?? DEFAULT_DELAY_MS"
        data-test-id="prototype-trigger-delay"
        class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
        @change="setDelay"
      />
    </label>

    <div v-if="trigger.type === 'ON_DRAG'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Swipe direction</span>
      <AppSelect
        :options="DRAG_DIRECTION_OPTIONS"
        :model-value="trigger.direction ?? 'left'"
        test-id="prototype-trigger-drag-direction"
        @update:model-value="setDirection"
      />
    </div>

    <div v-if="trigger.type === 'ON_KEY_DOWN'" class="flex flex-col gap-1">
      <span class="text-[10px] text-muted">Keys (any fires)</span>
      <div class="flex flex-wrap items-center gap-1">
        <span
          v-for="code in trigger.keys ?? []"
          :key="code"
          class="flex items-center gap-1 rounded border border-border bg-input px-1.5 py-0.5 font-mono text-[10px] text-surface"
        >
          {{ keyLabel(code) }}
          <button
            type="button"
            :aria-label="`Remove ${code}`"
            class="text-muted hover:text-red-400"
            @click="removeKey(code)"
          >
            <icon-lucide-x class="size-2.5" />
          </button>
        </span>
        <button
          type="button"
          data-test-id="prototype-trigger-record-key"
          class="rounded border border-dashed px-1.5 py-0.5 text-[10px] transition-colors"
          :class="
            recording ? 'border-accent text-accent' : 'border-border text-muted hover:text-surface'
          "
          @click="recording = !recording"
        >
          {{ recording ? 'Press a key… (Esc cancels)' : '+ Record key' }}
        </button>
      </div>
    </div>
  </div>
</template>
