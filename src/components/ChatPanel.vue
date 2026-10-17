<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { refAutoReset } from '@vueuse/core'
import { computed, markRaw, nextTick, ref, watch } from 'vue'

import { getAcpDebugText, clearAcpDebugLog, hasAcpDebugEntries } from '@/app/ai/acp/transport'
import { copyChatLog } from '@/app/ai/debug'
import { clearToolLogEntries, didHitStepLimit } from '@/app/ai/tools'
import { activeTab } from '@/app/tabs'
import AcpPermissionDialog from '@/components/chat/AcpPermissionDialog.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import AgentOnboarding from '@/components/chat/AgentOnboarding.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ProviderSetup from '@/components/chat/ProviderSetup.vue'
import { useAIChat } from '@/app/ai/chat/use'
import { toast } from '@/app/shell/ui'
import { useI18n } from '@nex-design/vue'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { getAgentRunProgress } from '@/app/ai/orchestration/progress'
import {
  getAgentRunCheckpoints,
  recordAgentRunCheckpoint,
  restoreAgentRunCheckpoint
} from '@/app/ai/chat/checkpoints'
import { setAgentRunMode } from '@/app/ai/chat/run-mode'
import type { AgentCheckpointVersion } from '@/app/ai/chat/checkpoints'
import type { ChatSubmission } from '@/app/ai/chat/types'

const IS_DEV = import.meta.env.DEV

const {
  isConfigured,
  ensureChat,
  resetChat,
  chatRunStatus,
  queuedChatSubmissions,
  queuedPromptCount,
  queueChatSubmission,
  dequeueChatSubmission,
  clearQueuedChatSubmissions,
  sendMessage
} = useAIChat()
const { dialogs } = useI18n()

const chat = ref<Chat<UIMessage> | null>(null)

ensureChat().then((c) => {
  if (c) chat.value = markRaw(c)
})
const messagesEnd = ref<HTMLDivElement>()
const debugCopied = refAutoReset(false, 1500)
const acpLogCopied = refAutoReset(false, 1500)

const messages = computed(() => chat.value?.messages ?? [])
const agentProgress = computed(() => getAgentRunProgress(getActiveEditorStore()))
const checkpoints = computed(() => getAgentRunCheckpoints(getActiveEditorStore()))
const latestCheckpoint = computed(() => checkpoints.value[0] ?? null)
const status = computed(() => chat.value?.status ?? 'ready')
const isThinking = computed(() => {
  const s = status.value
  if (s !== 'submitted' && s !== 'streaming') return false
  if (messages.value.length === 0) return true
  const last = messages.value[messages.value.length - 1]
  if (last.role !== 'assistant') return true
  const parts = last.parts
  if (parts.length === 0) return true
  const lastPart = parts[parts.length - 1] as Record<string, unknown>
  if (lastPart.type === 'step-start') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-available') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-error') return true
  return s === 'submitted'
})

const showContinue = computed(() => {
  if (status.value !== 'ready') return false
  if (messages.value.length === 0) return false
  const last = messages.value[messages.value.length - 1]
  return last.role === 'assistant' && didHitStepLimit()
})

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

watch(messages, scrollToBottom, { deep: true })
watch(
  status,
  (nextStatus) => {
    chatRunStatus.value = nextStatus
  },
  { immediate: true }
)
watch(
  () => chat.value?.error,
  (error) => {
    if (error) toast.error(error.message)
  }
)
watch(
  () => activeTab.value?.id,
  async () => {
    const nextChat = await ensureChat()
    chat.value = nextChat ? markRaw(nextChat) : null
  }
)

let dispatching = false

async function dispatchNextSubmission() {
  if (dispatching || status.value === 'streaming' || status.value === 'submitted') return
  const submission = dequeueChatSubmission()
  if (!submission) return
  dispatching = true

  try {
    const c = await ensureChat()
    if (c) chat.value = markRaw(c)
    if (!c) return

    const store = getActiveEditorStore()
    setAgentRunMode(store, submission.mode)
    const before = submission.mode === 'build' ? store.snapshotPage() : null
    await c.sendMessage({ text: submission.text, files: submission.files })
    if (before) {
      recordAgentRunCheckpoint(store, submission.text, before, store.snapshotPage())
    }
  } catch (e) {
    console.error('Failed to initialize chat:', e)
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    dispatching = false
    void nextTick(dispatchNextSubmission)
  }
}

function handleSubmit(submission: ChatSubmission) {
  queueChatSubmission(submission)
}

watch(queuedChatSubmissions, () => void dispatchNextSubmission(), { immediate: true })

function handleStop() {
  chat.value?.stop()
}

async function handleCopyDebug() {
  await copyChatLog(messages.value)
  debugCopied.value = true
}

async function handleCopyAcpLog() {
  const text = getAcpDebugText()
  if (!text) return
  await navigator.clipboard.writeText(text)
  acpLogCopied.value = true
}

function handleClearChat() {
  chat.value = null
  resetChat()
  clearQueuedChatSubmissions()
  clearToolLogEntries()
  clearAcpDebugLog()
}

function restoreCheckpoint(version: AgentCheckpointVersion) {
  const checkpoint = latestCheckpoint.value
  if (!checkpoint) return
  restoreAgentRunCheckpoint(getActiveEditorStore(), checkpoint, version)
  toast.info(
    version === 'before' ? 'Restored the design from before the run.' : 'Restored the AI result.'
  )
}
</script>

<template>
  <div data-test-id="chat-panel" class="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
    <ProviderSetup v-if="!isConfigured" />

    <template v-else>
      <div
        v-if="agentProgress.phase !== 'idle' && status !== 'ready'"
        class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 text-[11px] text-muted"
      >
        <span class="size-1.5 animate-pulse rounded-full bg-accent" />
        <span class="font-medium capitalize text-surface">{{ agentProgress.role }}</span>
        <span class="capitalize">{{ agentProgress.phase }}</span>
        <span v-if="agentProgress.activeTool" class="ml-auto truncate font-mono">{{
          agentProgress.activeTool
        }}</span>
      </div>
      <div
        v-if="queuedPromptCount > 0"
        class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5 text-[10px] text-muted"
        data-test-id="chat-queue-status"
      >
        <icon-lucide-list-ordered class="size-3" />
        <span
          >{{ queuedPromptCount }} queued {{ queuedPromptCount === 1 ? 'prompt' : 'prompts' }}</span
        >
        <button class="ml-auto hover:text-surface" @click="clearQueuedChatSubmissions">
          Clear
        </button>
      </div>
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
          <!-- Empty state -->
          <div
            v-if="messages.length === 0"
            data-test-id="chat-empty-state"
            class="flex h-full flex-col items-center justify-center gap-3 text-muted"
          >
            <icon-lucide-message-circle class="size-8 opacity-50" />
            <p class="text-center text-xs">{{ dialogs.describeCreateOrChange }}</p>
            <AgentOnboarding />
          </div>

          <!-- Messages -->
          <div v-else data-test-id="chat-messages" class="flex flex-col gap-3">
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />

            <!-- Thinking indicator: shown when AI is working but no visible activity -->
            <div v-if="isThinking" data-test-id="chat-typing-indicator" class="flex gap-2">
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted"
              >
                AI
              </div>
              <div class="flex items-center gap-1 py-2">
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 0ms"
                />
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 150ms"
                />
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 300ms"
                />
              </div>
            </div>

            <!-- Continue button when step limit reached -->
            <div v-if="showContinue" class="flex justify-center py-2">
              <button
                class="flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                @click="sendMessage('Continue where you left off')"
              >
                <icon-lucide-play class="size-3" />
                Continue
              </button>
            </div>

            <div ref="messagesEnd" />
          </div>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
          <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/30" />
        </ScrollAreaScrollbar>
      </ScrollAreaRoot>

      <!-- Chat toolbar -->
      <div
        v-if="messages.length > 0"
        class="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1"
      >
        <button
          v-if="IS_DEV"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
          @click="handleCopyDebug"
        >
          <icon-lucide-clipboard-copy v-if="!debugCopied" class="size-3" />
          <icon-lucide-check v-else class="size-3 text-green-400" />
          {{ debugCopied ? 'Copied' : 'Copy log' }}
        </button>
        <button
          v-if="IS_DEV && hasAcpDebugEntries()"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
          @click="handleCopyAcpLog"
        >
          <icon-lucide-bug v-if="!acpLogCopied" class="size-3" />
          <icon-lucide-check v-else class="size-3 text-green-400" />
          {{ acpLogCopied ? 'Copied' : 'ACP log' }}
        </button>
        <button
          v-if="latestCheckpoint"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
          title="Restore the canvas from before the latest AI run"
          data-test-id="chat-restore-before"
          @click="restoreCheckpoint('before')"
        >
          <icon-lucide-rotate-ccw class="size-3" />
          Before
        </button>
        <button
          v-if="latestCheckpoint"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
          title="Restore the completed result from the latest AI run"
          data-test-id="chat-restore-result"
          @click="restoreCheckpoint('result')"
        >
          <icon-lucide-sparkles class="size-3" />
          Result
        </button>
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
          @click="handleClearChat"
        >
          <icon-lucide-trash-2 class="size-3" />
          Clear
        </button>
      </div>

      <ChatInput
        :status="status"
        :queue-count="queuedPromptCount"
        @submit="handleSubmit"
        @stop="handleStop"
      />

      <AcpPermissionDialog />
    </template>
  </div>
</template>
