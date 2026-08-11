<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { computed, nextTick, ref, watch } from 'vue'

import Tip from '@/components/ui/Tip.vue'
import { useButtonUI } from '@/components/ui/button'
import { useInputUI } from '@/components/ui/input'
import { POOLSIDE_MODEL_NAME } from '@/app/ai/poolside'
import { useI18n } from '@nex-design/vue'
import { useAIChat } from '@/app/ai/chat/use'

const { dialogs } = useI18n()

const { status } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
}>()

const aiChat = useAIChat()
const activeTab = aiChat.activeTab
const chatInputText = aiChat.chatInputText ?? ref('')
const chatReferenceNodeImage = aiChat.chatReferenceNodeImage ?? ref('')
const chatReferenceNodeName = aiChat.chatReferenceNodeName ?? ref('')
const inputEl = ref<HTMLInputElement>()

watch(chatInputText, (newVal) => {
  if (newVal && document.activeElement !== inputEl.value) {
    nextTick(() => {
      inputEl.value?.focus()
    })
  }
})

watch(activeTab, (newTab) => {
  if (newTab === 'ai') {
    nextTick(() => {
      inputEl.value?.focus()
    })
  }
})

function clearReference() {
  if (chatReferenceNodeImage.value && chatReferenceNodeImage.value.startsWith('blob:')) {
    URL.revokeObjectURL(chatReferenceNodeImage.value)
  }
  chatReferenceNodeImage.value = ''
  chatReferenceNodeName.value = ''
}

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')
function handleSubmit(e: Event) {
  e.preventDefault()
  const text = chatInputText.value.trim()
  if (!text) return
  emit('submit', text)
  chatInputText.value = ''
  clearReference()
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

      <!-- Component visual reference preview card -->
      <div
        v-if="chatReferenceNodeImage"
        class="mb-2 relative flex items-center gap-3 p-2 rounded-xl bg-hover border border-border/80 shadow-inner animate-in slide-in-from-bottom-2 duration-200"
      >
        <div class="relative size-12 shrink-0 rounded-lg border border-border/60 bg-canvas overflow-hidden flex items-center justify-center">
          <img :src="chatReferenceNodeImage" class="max-h-full max-w-full object-contain" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-surface truncate">{{ chatReferenceNodeName }}</p>
          <p class="text-[10px] text-muted truncate">Component reference in context</p>
        </div>
        <button
          type="button"
          class="size-6 rounded-full flex items-center justify-center hover:bg-muted/20 text-muted hover:text-surface transition-colors shrink-0"
          @click="clearReference"
        >
          <icon-lucide-x class="size-3.5" />
        </button>
      </div>

      <!-- Input form -->
      <form class="flex gap-1.5" @submit="handleSubmit">
        <input
          ref="inputEl"
          v-model="chatInputText"
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
            :disabled="!chatInputText.trim()"
          >
            <icon-lucide-send class="size-3" />
          </button>
        </Tip>
      </form>
    </div>
  </TooltipProvider>
</template>
