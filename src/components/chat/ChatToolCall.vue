<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'

import ChatToolStatus from './ChatToolStatus.vue'
import { hasErrorOutput, toolDisplayName, toolState } from './tool-parts'

import type { ToolPart } from './tool-parts'

const { part } = defineProps<{ part: ToolPart }>()

const STATE_LABEL = { pending: 'Running…', done: 'Done', error: 'Error' } as const
</script>

<template>
  <CollapsibleRoot data-test-id="chat-tool-call">
    <CollapsibleTrigger class="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover">
      <ChatToolStatus :state="toolState(part)" />
      <span class="text-[11px] text-surface">
        {{ toolDisplayName(part) }}
      </span>
      <span class="text-[10px] text-muted">{{ STATE_LABEL[toolState(part)] }}</span>
      <icon-lucide-chevron-down
        v-if="toolState(part) !== 'pending'"
        class="ml-auto size-3 text-muted transition-transform [[data-state=open]>&]:rotate-180"
      />
    </CollapsibleTrigger>
    <CollapsibleContent
      v-if="toolState(part) !== 'pending'"
      class="data-[state=closed]:collapsible-up data-[state=open]:collapsible-down overflow-hidden text-[10px]"
    >
      <pre class="mt-1 overflow-x-auto rounded bg-input p-2 text-muted">{{
        part.state === 'output-error' && part.errorText
          ? part.errorText
          : hasErrorOutput(part)
            ? (part.output as { error: string }).error
            : JSON.stringify(part.output, null, 2)
      }}</pre>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
