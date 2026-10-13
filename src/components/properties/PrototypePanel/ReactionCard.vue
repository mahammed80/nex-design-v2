<script setup lang="ts">
import type { Action, Reaction, SceneNode } from '@nex-design/core/scene-graph'

import ActionEditor from './ActionEditor.vue'
import TriggerPicker from './TriggerPicker.vue'

const { source, title } = defineProps<{ source: SceneNode; title: string }>()
const reaction = defineModel<Reaction>({ required: true })
const emit = defineEmits<{ remove: [] }>()

function setAction(index: number, action: Action) {
  reaction.value = {
    ...reaction.value,
    actions: reaction.value.actions.map((existing, i) => (i === index ? action : existing))
  }
}

/** Actions run in order; a sequence like "set variable, then navigate" is one interaction. */
function addAction() {
  reaction.value = { ...reaction.value, actions: [...reaction.value.actions, { type: 'BACK' }] }
}

function removeAction(index: number) {
  if (reaction.value.actions.length <= 1) {
    emit('remove')
    return
  }
  reaction.value = {
    ...reaction.value,
    actions: reaction.value.actions.filter((_, i) => i !== index)
  }
}

function moveAction(index: number, delta: -1 | 1) {
  const target = index + delta
  const actions = [...reaction.value.actions]
  if (target < 0 || target >= actions.length) return
  ;[actions[index], actions[target]] = [actions[target], actions[index]]
  reaction.value = { ...reaction.value, actions }
}
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded border border-border bg-hover/30 p-3"
    data-test-id="prototype-reaction"
  >
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-bold uppercase tracking-wider text-muted">{{ title }}</span>
      <button
        type="button"
        aria-label="Remove interaction"
        data-test-id="prototype-reaction-remove"
        class="text-muted transition-colors hover:text-red-400"
        @click="emit('remove')"
      >
        <icon-lucide-trash class="size-3.5" />
      </button>
    </div>

    <TriggerPicker
      :model-value="reaction.trigger"
      @update:model-value="reaction = { ...reaction, trigger: $event }"
    />

    <div class="flex flex-col gap-2">
      <div
        v-for="(action, index) in reaction.actions"
        :key="index"
        class="flex flex-col gap-1.5 rounded border border-border/60 p-2"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-muted">
            {{ reaction.actions.length > 1 ? `Action ${index + 1}` : 'Action' }}
          </span>
          <div class="flex items-center gap-1 text-muted">
            <button
              v-if="reaction.actions.length > 1"
              type="button"
              aria-label="Move action up"
              :disabled="index === 0"
              class="hover:text-surface disabled:opacity-30"
              @click="moveAction(index, -1)"
            >
              <icon-lucide-chevron-up class="size-3" />
            </button>
            <button
              v-if="reaction.actions.length > 1"
              type="button"
              aria-label="Move action down"
              :disabled="index === reaction.actions.length - 1"
              class="hover:text-surface disabled:opacity-30"
              @click="moveAction(index, 1)"
            >
              <icon-lucide-chevron-down class="size-3" />
            </button>
            <button
              type="button"
              aria-label="Remove action"
              class="hover:text-red-400"
              @click="removeAction(index)"
            >
              <icon-lucide-x class="size-3" />
            </button>
          </div>
        </div>
        <ActionEditor
          :source="source"
          :model-value="action"
          @update:model-value="setAction(index, $event)"
        />
      </div>
      <button
        type="button"
        data-test-id="prototype-action-add"
        class="flex items-center justify-center gap-1 rounded border border-dashed border-border py-1 text-[10px] text-muted transition-colors hover:text-surface"
        @click="addAction"
      >
        <icon-lucide-plus class="size-3" /> Add action
      </button>
    </div>
  </div>
</template>
