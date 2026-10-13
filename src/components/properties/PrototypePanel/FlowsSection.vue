<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'

const editor = useEditorStore()

const page = computed(() => {
  void editor.state.sceneVersion
  return editor.graph.getNode(editor.state.currentPageId)
})
const flows = computed(() => page.value?.prototypeFlows ?? [])
const startId = computed(() => page.value?.prototypeStartNodeId ?? null)

function frameName(id: string): string {
  return editor.graph.getNode(id)?.name ?? 'Missing frame'
}

function rename(startNodeId: string, event: Event) {
  const name = (event.target as HTMLInputElement).value.trim()
  if (name) editor.updateFlow(editor.state.currentPageId, startNodeId, { name })
}

function describe(startNodeId: string, event: Event) {
  const description = (event.target as HTMLTextAreaElement).value.trim()
  editor.updateFlow(editor.state.currentPageId, startNodeId, {
    description: description || undefined
  })
}

function selectFrame(id: string) {
  editor.select([id])
}
</script>

<template>
  <div class="flex flex-col gap-2" data-test-id="prototype-flows">
    <h3 class="font-semibold text-surface">Flows</h3>
    <p
      v-if="flows.length === 0"
      class="rounded border border-dashed border-border px-3 py-4 text-center text-muted"
    >
      Select a top-level frame and choose “Add flow starting point” to create a named flow.
    </p>
    <div
      v-for="flow in flows"
      :key="flow.startNodeId"
      class="flex flex-col gap-1.5 rounded border border-border bg-hover/30 p-2"
    >
      <div class="flex items-center gap-1.5">
        <icon-lucide-flag class="size-3 shrink-0 text-accent" />
        <input
          :value="flow.name"
          aria-label="Flow name"
          class="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs font-medium text-surface outline-none focus:bg-input"
          @change="rename(flow.startNodeId, $event)"
        />
        <button
          type="button"
          aria-label="Remove flow"
          class="text-muted hover:text-red-400"
          @click="editor.removeFlow(editor.state.currentPageId, flow.startNodeId)"
        >
          <icon-lucide-x class="size-3" />
        </button>
      </div>
      <button
        type="button"
        class="self-start text-[10px] text-muted hover:text-surface"
        @click="selectFrame(flow.startNodeId)"
      >
        Starts at {{ frameName(flow.startNodeId) }}
        <span v-if="startId === flow.startNodeId" class="text-accent">· default</span>
      </button>
      <textarea
        :value="flow.description ?? ''"
        rows="2"
        placeholder="Description (optional)"
        class="resize-none rounded border border-border bg-input px-2 py-1 text-[10px] text-surface outline-none focus:border-accent"
        @change="describe(flow.startNodeId, $event)"
      />
    </div>
  </div>
</template>
