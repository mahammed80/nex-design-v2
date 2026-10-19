<script setup lang="ts">
import { computed } from 'vue'
import { isFileUIPart, isTextUIPart } from 'ai'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { Markdown } from 'vue-stream-markdown'
import 'vue-stream-markdown/index.css'

import ChatToolCall from './ChatToolCall.vue'
import ChatToolStatus from './ChatToolStatus.vue'
import { groupState, groupSummary, partKey, segmentParts } from './tool-parts'

import type { UIMessage } from 'ai'

const { message } = defineProps<{ message: UIMessage }>()

const segments = computed(() => segmentParts(message.parts))
</script>

<template>
  <div
    :data-test-id="`chat-message-${message.role}`"
    :class="message.role === 'user' ? 'flex justify-end' : ''"
  >
    <div class="min-w-0 space-y-1.5" :class="message.role === 'user' ? 'max-w-[85%]' : ''">
      <template v-if="message.role === 'assistant'">
        <template v-for="segment in segments" :key="segment.key">
          <!-- Tool calls: a single call shows inline, a run of calls collapses into one step -->
          <div
            v-if="segment.kind === 'tools'"
            class="rounded-lg border border-border bg-canvas p-2"
          >
            <ChatToolCall v-if="segment.parts.length === 1" :part="segment.parts[0]" />
            <CollapsibleRoot v-else data-test-id="chat-tool-group">
              <CollapsibleTrigger
                class="flex w-full min-w-0 items-center gap-2 rounded px-1 py-0.5 hover:bg-hover"
              >
                <ChatToolStatus :state="groupState(segment.parts)" />
                <span class="shrink-0 text-[11px] text-surface">
                  {{ segment.parts.length }} steps
                </span>
                <span class="min-w-0 truncate text-[10px] text-muted">
                  {{ groupSummary(segment.parts) }}
                </span>
                <icon-lucide-chevron-down
                  class="ml-auto size-3 shrink-0 text-muted transition-transform [[data-state=open]>&]:rotate-180"
                />
              </CollapsibleTrigger>
              <CollapsibleContent
                class="data-[state=closed]:collapsible-up data-[state=open]:collapsible-down overflow-hidden"
              >
                <div class="mt-1 space-y-0.5 border-t border-border pt-1">
                  <ChatToolCall v-for="part in segment.parts" :key="part.toolCallId" :part="part" />
                </div>
              </CollapsibleContent>
            </CollapsibleRoot>
          </div>

          <!-- Text -->
          <div
            v-else-if="isTextUIPart(segment.part)"
            data-test-id="chat-text-bubble"
            class="rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed text-surface"
          >
            <Markdown :content="segment.part.text" :mermaid="false" class="chat-markdown" />
          </div>
        </template>
      </template>

      <!-- User message -->
      <div
        v-else-if="message.role === 'user'"
        data-test-id="chat-text-bubble"
        class="space-y-2 rounded-xl rounded-br-md bg-accent px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-white"
      >
        <div v-if="message.parts.some(isFileUIPart)" class="flex flex-wrap gap-1.5">
          <template v-for="(part, index) in message.parts" :key="partKey(part, index)">
            <img
              v-if="isFileUIPart(part) && part.mediaType.startsWith('image/')"
              :src="part.url"
              :alt="part.filename ?? 'Attached reference'"
              class="max-h-28 max-w-full rounded-md border border-white/20 object-contain"
            />
            <span
              v-else-if="isFileUIPart(part)"
              class="flex items-center gap-1 rounded bg-black/15 px-1.5 py-1 text-[10px]"
            >
              <icon-lucide-file class="size-3" />
              {{ part.filename ?? 'Attachment' }}
            </span>
          </template>
        </div>
        <div>
          {{
            message.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join('')
          }}
        </div>
      </div>
    </div>
  </div>
</template>
