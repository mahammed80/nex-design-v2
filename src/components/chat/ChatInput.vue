<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { useFileDialog } from '@vueuse/core'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'

import Tip from '@/components/ui/Tip.vue'
import { useButtonUI } from '@/components/ui/button'
import { useInputUI } from '@/components/ui/input'
import { POOLSIDE_MODEL_NAME } from '@/app/ai/poolside'
import { useI18n } from '@nex-design/vue'
import { useAIChat } from '@/app/ai/chat/use'
import {
  assertChatPayloadSize,
  prepareChatAttachments,
  referenceImagePart
} from '@/app/ai/chat/attachments'
import { createChatSubmission } from '@/app/ai/chat/types'
import type { ChatSubmission } from '@/app/ai/chat/types'
import { toast } from '@/app/shell/ui'

const { dialogs } = useI18n()

const { status, queueCount } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  queueCount: number
}>()

const emit = defineEmits<{
  submit: [submission: ChatSubmission]
  stop: []
}>()

const aiChat = useAIChat()
const activeTab = aiChat.activeTab
const chatInputText = aiChat.chatInputText ?? ref('')
const chatReferenceNodeImage = aiChat.chatReferenceNodeImage ?? ref('')
const chatReferenceNodeName = aiChat.chatReferenceNodeName ?? ref('')
const chatRunMode = aiChat.chatRunMode
const inputEl = ref<HTMLTextAreaElement>()
const attachedFiles = shallowRef<File[]>([])
const MAX_ATTACHMENTS = 5

const { open: openFileDialog, onChange: onFilesChanged } = useFileDialog({
  accept:
    '.png,.jpg,.jpeg,.webp,.gif,.svg,.txt,.md,.json,image/*,text/plain,text/markdown,application/json',
  multiple: true,
  reset: true
})

onFilesChanged((files) => {
  if (!files) return
  addFiles([...files])
})

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
const canSubmit = computed(
  () =>
    chatInputText.value.trim().length > 0 ||
    attachedFiles.value.length > 0 ||
    !!chatReferenceNodeImage.value
)

function addFiles(files: File[]) {
  const startingCount = attachedFiles.value.length
  const existing = new Set(attachedFiles.value.map((file) => `${file.name}:${file.size}`))
  const next = [...attachedFiles.value]
  for (const file of files) {
    const key = `${file.name}:${file.size}`
    if (existing.has(key)) continue
    existing.add(key)
    next.push(file)
    if (next.length === MAX_ATTACHMENTS) break
  }
  attachedFiles.value = next
  if (startingCount + files.length > MAX_ATTACHMENTS) {
    toast.info(`You can attach up to ${MAX_ATTACHMENTS} files per prompt.`)
  }
}

function removeFile(index: number) {
  attachedFiles.value = attachedFiles.value.filter((_, fileIndex) => fileIndex !== index)
}

function handlePaste(event: ClipboardEvent) {
  const files = [...(event.clipboardData?.files ?? [])]
  if (files.length === 0) return
  event.preventDefault()
  addFiles(files)
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!canSubmit.value) return
  try {
    const prepared = await prepareChatAttachments(chatInputText.value, attachedFiles.value)
    const reference = await referenceImagePart(
      chatReferenceNodeImage.value,
      chatReferenceNodeName.value || 'Canvas reference'
    )
    const submissionFiles = reference ? [reference, ...prepared.files] : prepared.files
    assertChatPayloadSize(prepared.text, submissionFiles)
    const submission = createChatSubmission({
      text: prepared.text || 'Use the attached visual reference to create or update the design.',
      files: submissionFiles,
      mode: chatRunMode.value
    })
    emit('submit', submission)
    chatInputText.value = ''
    attachedFiles.value = []
    clearReference()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not prepare the attachments.')
  }
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
        <div class="ml-auto flex rounded-md bg-input p-0.5" data-test-id="chat-run-mode">
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[10px] transition-colors"
            :class="
              chatRunMode === 'build' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
            "
            data-test-id="chat-mode-build"
            @click="chatRunMode = 'build'"
          >
            Build
          </button>
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[10px] transition-colors"
            :class="
              chatRunMode === 'plan' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
            "
            data-test-id="chat-mode-plan"
            @click="chatRunMode = 'plan'"
          >
            Plan
          </button>
        </div>
      </div>

      <!-- Component visual reference preview card -->
      <div
        v-if="chatReferenceNodeImage"
        class="mb-2 relative flex items-center gap-3 p-2 rounded-xl bg-hover border border-border/80 shadow-inner animate-in slide-in-from-bottom-2 duration-200"
      >
        <div
          class="relative size-12 shrink-0 rounded-lg border border-border/60 bg-canvas overflow-hidden flex items-center justify-center"
        >
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

      <div v-if="attachedFiles.length > 0" class="mb-2 flex flex-wrap gap-1.5">
        <div
          v-for="(file, index) in attachedFiles"
          :key="`${file.name}:${file.size}`"
          class="flex max-w-full items-center gap-1 rounded-md border border-border bg-input px-2 py-1 text-[10px] text-muted"
        >
          <icon-lucide-file class="size-3 shrink-0" />
          <span class="truncate">{{ file.name }}</span>
          <button type="button" class="hover:text-surface" @click="removeFile(index)">
            <icon-lucide-x class="size-3" />
          </button>
        </div>
      </div>

      <!-- Input form -->
      <form class="flex items-end gap-1.5" @submit="handleSubmit">
        <Tip label="Attach images or context files">
          <button
            type="button"
            data-test-id="chat-attach-button"
            :class="
              useButtonUI({
                tone: 'ghost',
                shape: 'rounded',
                size: 'sm',
                ui: { base: 'shrink-0 border border-border px-2 py-1.5' }
              }).base
            "
            @click="openFileDialog()"
          >
            <icon-lucide-paperclip class="size-3" />
          </button>
        </Tip>
        <textarea
          ref="inputEl"
          v-model="chatInputText"
          rows="1"
          data-test-id="chat-input"
          :placeholder="dialogs.describeChange"
          :class="
            useInputUI({
              ui: { base: 'min-h-8 min-w-0 flex-1 resize-none placeholder:text-muted' }
            }).base
          "
          @keydown.enter.exact.prevent="handleSubmit"
          @paste.stop="handlePaste"
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
        <Tip :label="isStreaming ? 'Queue prompt' : dialogs.sendMessage">
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
            :disabled="!canSubmit"
          >
            <icon-lucide-list-plus v-if="isStreaming" class="size-3" />
            <icon-lucide-send v-else class="size-3" />
          </button>
        </Tip>
      </form>
      <p v-if="queueCount > 0" class="mt-1 text-[10px] text-muted">
        {{ queueCount }} {{ queueCount === 1 ? 'prompt' : 'prompts' }} waiting
      </p>
    </div>
  </TooltipProvider>
</template>
