<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { computed, ref } from 'vue'

import Tip from '@/components/ui/Tip.vue'
import { useButtonUI } from '@/components/ui/button'
import { useInputUI } from '@/components/ui/input'
import { POOLSIDE_MODEL_NAME } from '@/app/ai/poolside'
import { useI18n } from '@nex-design/vue'

const { dialogs } = useI18n()

const { status } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
}>()

const input = ref('')

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')
function handleSubmit(e: Event) {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  emit('submit', text)
  input.value = ''
}
</script>

<template>
  <TooltipProvider>
    <div class="shrink-0 border-t border-border px-3 py-2">
      <div class="mb-1.5 flex items-center gap-1">
        <div
          class="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted"
          data-test-id="chat-poolside-model-label"
        >
          <icon-lucide-bot class="size-3" />
          {{ POOLSIDE_MODEL_NAME }}
        </div>
      </div>

      <!-- Input form -->
      <form class="flex gap-1.5" @submit="handleSubmit">
        <input
          v-model="input"
          type="text"
          data-test-id="chat-input"
          :placeholder="dialogs.describeChange"
          :class="useInputUI({ ui: { base: 'min-w-0 flex-1 placeholder:text-muted' } }).base"
          :disabled="isStreaming"
          @paste.stop
          @copy.stop
          @cut.stop
        />
        <Tip v-if="isStreaming" :label="dialogs.stopGenerating">
          <button
            type="button"
            data-test-id="chat-stop-button"
            :class="
              useButtonUI({
                tone: 'ghost',
                shape: 'rounded',
                size: 'sm',
                ui: { base: 'shrink-0 border border-border px-2 py-1.5' }
              }).base
            "
            @click="emit('stop')"
          >
            <icon-lucide-square class="size-3" />
          </button>
        </Tip>
        <Tip v-else :label="dialogs.sendMessage">
          <button
            type="submit"
            data-test-id="chat-send-button"
            :class="
              useButtonUI({
                tone: 'accent',
                shape: 'rounded',
                size: 'sm',
                ui: { base: 'shrink-0 px-2.5 py-1.5 font-medium' }
              }).base
            "
            :disabled="!input.trim()"
          >
            <icon-lucide-send class="size-3" />
          </button>
        </Tip>
      </form>
    </div>
  </TooltipProvider>
</template>
