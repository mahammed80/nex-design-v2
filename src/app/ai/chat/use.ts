import type { FileUIPart } from 'ai'
import { computed, ref, shallowRef } from 'vue'

import { IS_BROWSER } from '@nex-design/core/constants'

import {
  apiKey,
  customAPIType,
  customBaseURL,
  customModelID,
  isACPProvider,
  isConfigured,
  maxOutputTokens,
  modelID,
  pexelsApiKey,
  providerDef,
  providerID,
  registerAIChatEffects,
  setAPIKey,
  unsplashAccessKey
} from '@/app/ai/chat/storage'
import { createChatSessionManager } from '@/app/ai/chat/transports'
import { createChatSubmission } from '@/app/ai/chat/types'
import type { ChatRunMode, ChatRunStatus, ChatSubmission } from '@/app/ai/chat/types'
import { exposeChatTransportOverride } from '@/app/browser-bridge'
import { getActiveEditorStore } from '@/app/editor/active-store'

const activeTab = ref<'design' | 'code' | 'ai' | 'prototype'>('design')
const chatInputText = ref('')
const chatReferenceNodeImage = ref('')
const chatReferenceNodeName = ref('')
const chatRunMode = ref<ChatRunMode>('build')
const chatRunStatus = ref<ChatRunStatus>('ready')
const queuedChatSubmissions = shallowRef<ChatSubmission[]>([])
const isGenerating = computed(
  () => chatRunStatus.value === 'submitted' || chatRunStatus.value === 'streaming'
)
const queuedPromptCount = computed(() => queuedChatSubmissions.value.length)

function queueChatSubmission(submission: ChatSubmission): void {
  queuedChatSubmissions.value = [...queuedChatSubmissions.value, submission]
  activeTab.value = 'ai'
}

function dequeueChatSubmission(): ChatSubmission | null {
  const [next, ...remaining] = queuedChatSubmissions.value
  if (!next) return null
  queuedChatSubmissions.value = remaining
  return next
}

function clearQueuedChatSubmissions(): void {
  queuedChatSubmissions.value = []
}

function sendMessage(text: string, files: FileUIPart[] = [], mode = chatRunMode.value): void {
  const submission = createChatSubmission({ text, files, mode })
  if (!submission.text && submission.files.length === 0) return
  queueChatSubmission(submission)
}

const chatSession = createChatSessionManager({
  isConfigured,
  isACPProvider,
  providerID,
  apiKey,
  modelID,
  customModelID,
  customBaseURL,
  customAPIType,
  maxOutputTokens,
  getActiveEditorStore
})

registerAIChatEffects(chatSession.markTransportDirty)

if (IS_BROWSER) {
  exposeChatTransportOverride((factory) => {
    chatSession.setOverrideTransport(factory)
  })
}

export function useAIChat() {
  return {
    providerID,
    providerDef,
    apiKey,
    setAPIKey,
    modelID,
    customBaseURL,
    customModelID,
    customAPIType,
    maxOutputTokens,
    pexelsApiKey,
    unsplashAccessKey,
    activeTab,
    chatInputText,
    chatReferenceNodeImage,
    chatReferenceNodeName,
    chatRunMode,
    chatRunStatus,
    queuedChatSubmissions,
    queuedPromptCount,
    isGenerating,
    sendMessage,
    queueChatSubmission,
    dequeueChatSubmission,
    clearQueuedChatSubmissions,
    isConfigured,
    ensureChat: chatSession.ensureChat,
    resetChat: chatSession.resetChat
  }
}
