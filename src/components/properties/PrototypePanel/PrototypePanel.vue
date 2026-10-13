<script setup lang="ts">
import { computed, ref } from 'vue'

import { isConnectionId } from '@nex-design/core/prototype'
import type { Reaction, SceneNode } from '@nex-design/core/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import PrototypePreview from '@/components/PrototypePreview.vue'

import FlowsSection from './FlowsSection.vue'
import { defaultTransition } from './options'
import ReactionCard from './ReactionCard.vue'
import { usePrototypeTargets } from './usePrototypeTargets'

const editor = useEditorStore()
const previewOpen = ref(false)
const { frameOptions } = usePrototypeTargets()

const FLOW_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'SECTION'])

interface ReactionTarget {
  kind: 'node' | 'connection'
  node: SceneNode
  connectionId?: string
  /** Reactions shown, with their index in `node.reactions`. */
  entries: Array<{ reaction: Reaction; index: number }>
}

/** The selected layer's reactions, or the single reaction behind a selected connection. */
const target = computed<ReactionTarget | null>(() => {
  void editor.state.sceneVersion
  const [firstId] = [...editor.state.selectedIds]
  if (!firstId) return null
  if (isConnectionId(firstId)) {
    const found = editor.connectionReaction(firstId)
    return found
      ? {
          kind: 'connection',
          node: found.node,
          connectionId: firstId,
          entries: [{ reaction: found.reaction, index: found.index }]
        }
      : null
  }
  const node = editor.graph.getNode(firstId)
  if (!node) return null
  return {
    kind: 'node',
    node,
    entries: (node.reactions ?? []).map((reaction, index) => ({ reaction, index }))
  }
})

const page = computed(() => {
  void editor.state.sceneVersion
  return editor.graph.getNode(editor.state.currentPageId)
})

/** Top-level frames can be flow starting points. */
const canStartFlow = computed(
  () =>
    target.value?.kind === 'node' &&
    FLOW_TYPES.has(target.value.node.type) &&
    target.value.node.parentId === editor.state.currentPageId
)
const flowForSelection = computed(() =>
  page.value?.prototypeFlows?.find((flow) => flow.startNodeId === target.value?.node.id)
)
const isDefaultStart = computed(
  () => !!target.value && page.value?.prototypeStartNodeId === target.value.node.id
)

function toggleFlow() {
  const node = target.value?.node
  if (!node) return
  if (flowForSelection.value) editor.removeFlow(editor.state.currentPageId, node.id)
  else editor.addFlow(editor.state.currentPageId, node.id, node.name)
}

function toggleDefaultStart() {
  const node = target.value?.node
  if (!node) return
  editor.setPrototypeStartNode(editor.state.currentPageId, isDefaultStart.value ? null : node.id)
}

function addInteraction() {
  const node = target.value?.node
  if (!node || target.value?.kind !== 'node') return
  const destinationId = frameOptions(node.id)[0]?.value
  editor.addReaction(node.id, {
    trigger: { type: 'ON_CLICK' },
    actions: destinationId
      ? [{ type: 'NAVIGATE', destinationId, transition: defaultTransition() }]
      : [{ type: 'BACK' }]
  })
}

function updateReaction(index: number, reaction: Reaction) {
  const node = target.value?.node
  if (node) editor.updateReaction(node.id, index, reaction)
}

function removeReaction(index: number) {
  const current = target.value
  if (!current) return
  if (current.kind === 'connection' && current.connectionId) {
    editor.removeConnection(current.connectionId)
  } else {
    editor.removeReaction(current.node.id, index)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4 text-xs" data-test-id="prototype-panel">
    <button
      type="button"
      data-test-id="prototype-play"
      class="mb-1 flex w-full items-center justify-center gap-2 rounded bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
      @click="previewOpen = true"
    >
      <icon-lucide-play class="size-3.5 fill-current" />
      <span>Play prototype</span>
    </button>

    <FlowsSection v-if="!target" />

    <div v-if="canStartFlow" class="flex flex-col gap-2 border-b border-border pb-3">
      <h3 class="font-semibold text-surface">Flow starting point</h3>
      <label class="flex cursor-pointer items-center gap-2 text-surface">
        <input
          type="checkbox"
          data-test-id="prototype-flow-toggle"
          class="size-3.5 accent-accent"
          :checked="!!flowForSelection"
          @change="toggleFlow"
        />
        <span>{{
          flowForSelection ? `Starts “${flowForSelection.name}”` : 'Add flow starting point'
        }}</span>
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-muted">
        <input
          type="checkbox"
          class="size-3.5 accent-accent"
          :checked="isDefaultStart"
          @change="toggleDefaultStart"
        />
        <span>Default when pressing Play</span>
      </label>
    </div>

    <div v-if="target" class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-surface">Interactions</h3>
        <button
          v-if="target.kind === 'node'"
          type="button"
          data-test-id="prototype-interaction-add"
          class="flex items-center gap-1 rounded bg-accent px-2.5 py-1 font-medium text-accent-foreground transition-colors hover:bg-accent/80"
          @click="addInteraction"
        >
          <icon-lucide-plus class="size-3" />
          <span>Add</span>
        </button>
      </div>

      <p
        v-if="target.entries.length === 0"
        class="rounded border border-dashed border-border bg-hover/50 px-4 py-6 text-center text-muted"
      >
        No interactions yet. Add one, or drag the handle next to the selected layer onto another
        frame.
      </p>

      <ReactionCard
        v-for="entry in target.entries"
        :key="entry.index"
        :source="target.node"
        :title="
          target.kind === 'connection' ? 'Selected connection' : `Interaction ${entry.index + 1}`
        "
        :model-value="entry.reaction"
        @update:model-value="updateReaction(entry.index, $event)"
        @remove="removeReaction(entry.index)"
      />
    </div>

    <PrototypePreview v-model:open="previewOpen" />
  </div>
</template>
