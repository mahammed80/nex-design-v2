<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'

import { useEditorStore } from '@/app/editor/active-store'
import type { SceneNode } from '@nex-design/core/scene-graph'

const open = defineModel<boolean>('open', { default: false })
const searchQuery = ref('')
const replaceQuery = ref('')
const matchCase = ref(false)
const searchLayerNames = ref(true)
const searchIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const store = useEditorStore()

interface SearchMatch {
  id: string
  name: string
  type: string
  matchType: 'text' | 'layer'
  preview: string
}

const matches = computed<SearchMatch[]>(() => {
  const q = searchQuery.value.trim()
  if (!q) return []

  const page = store.graph.getNode(store.state.currentPageId)
  if (!page) return []

  const list: SearchMatch[] = []

  function walk(nodeId: string) {
    const node = store.graph.getNode(nodeId)
    if (!node) return

    // Text content matching
    if (node.type === 'TEXT' && 'characters' in node && typeof node.characters === 'string') {
      const text = node.characters
      const haystack = matchCase.value ? text : text.toLowerCase()
      const needle = matchCase.value ? q : q.toLowerCase()
      if (haystack.includes(needle)) {
        list.push({
          id: node.id,
          name: node.name,
          type: node.type,
          matchType: 'text',
          preview: text
        })
      }
    }

    // Layer name matching
    if (searchLayerNames.value) {
      const name = node.name
      const haystack = matchCase.value ? name : name.toLowerCase()
      const needle = matchCase.value ? q : q.toLowerCase()
      if (haystack.includes(needle) && !list.some((m) => m.id === node.id)) {
        list.push({
          id: node.id,
          name: node.name,
          type: node.type,
          matchType: 'layer',
          preview: name
        })
      }
    }

    for (const childId of node.childIds) {
      walk(childId)
    }
  }

  for (const childId of page.childIds) {
    walk(childId)
  }

  return list
})

watch(open, (isOpen) => {
  if (isOpen) {
    searchIndex.value = 0
    void nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

watch(matches, (newMatches) => {
  if (newMatches.length > 0 && searchIndex.value >= newMatches.length) {
    searchIndex.value = 0
  }
})

function goToCurrentMatch() {
  const match = matches.value[searchIndex.value]
  if (match) {
    store.setSelectedIds(new Set([match.id]))
    store.zoomToSelection()
  }
}

function nextMatch() {
  if (matches.value.length === 0) return
  searchIndex.value = (searchIndex.value + 1) % matches.value.length
  goToCurrentMatch()
}

function prevMatch() {
  if (matches.value.length === 0) return
  searchIndex.value = (searchIndex.value - 1 + matches.value.length) % matches.value.length
  goToCurrentMatch()
}

function replaceCurrent() {
  const match = matches.value[searchIndex.value]
  if (!match) return

  const node = store.graph.getNode(match.id)
  if (!node) return

  const q = searchQuery.value
  const rep = replaceQuery.value

  if (match.matchType === 'text' && node.type === 'TEXT' && 'characters' in node) {
    const orig = node.characters as string
    const newText = matchCase.value
      ? orig.replace(q, rep)
      : orig.replace(new RegExp(escapeRegExp(q), 'i'), rep)
    store.updateNodeWithUndo(node.id, { characters: newText }, 'Replace text')
  } else if (match.matchType === 'layer') {
    const orig = node.name
    const newName = matchCase.value
      ? orig.replace(q, rep)
      : orig.replace(new RegExp(escapeRegExp(q), 'i'), rep)
    store.updateNodeWithUndo(node.id, { name: newName }, 'Replace layer name')
  }
}

function replaceAll() {
  if (matches.value.length === 0) return
  const q = searchQuery.value
  const rep = replaceQuery.value

  for (const match of matches.value) {
    const node = store.graph.getNode(match.id)
    if (!node) continue

    if (match.matchType === 'text' && node.type === 'TEXT' && 'characters' in node) {
      const orig = node.characters as string
      const newText = matchCase.value
        ? orig.replaceAll(q, rep)
        : orig.replaceAll(new RegExp(escapeRegExp(q), 'gi'), rep)
      store.updateNodeWithUndo(node.id, { characters: newText }, 'Replace all text')
    } else if (match.matchType === 'layer') {
      const orig = node.name
      const newName = matchCase.value
        ? orig.replaceAll(q, rep)
        : orig.replaceAll(new RegExp(escapeRegExp(q), 'gi'), rep)
      store.updateNodeWithUndo(node.id, { name: newName }, 'Replace all layer names')
    }
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
      <DialogContent
        class="fixed top-[15%] left-1/2 z-50 flex w-[480px] max-w-[90vw] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl outline-none"
      >
        <DialogTitle class="border-b border-border px-3 py-2 text-xs font-semibold text-surface">
          Find and Replace
        </DialogTitle>

        <div class="flex flex-col gap-2.5 p-3">
          <!-- Find Input -->
          <div class="flex items-center gap-1.5 rounded border border-border bg-input px-2 py-1.5">
            <icon-lucide-search class="size-3.5 text-muted" />
            <input
              ref="inputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Find text or layer…"
              class="w-full bg-transparent text-xs text-surface outline-none"
              @keydown.enter="nextMatch"
            />
            <span v-if="matches.length > 0" class="text-[10px] text-muted">
              {{ searchIndex + 1 }} / {{ matches.length }}
            </span>
          </div>

          <!-- Replace Input -->
          <div class="flex items-center gap-1.5 rounded border border-border bg-input px-2 py-1.5">
            <icon-lucide-replace class="size-3.5 text-muted" />
            <input
              v-model="replaceQuery"
              type="text"
              placeholder="Replace with…"
              class="w-full bg-transparent text-xs text-surface outline-none"
              @keydown.enter="replaceCurrent"
            />
          </div>

          <!-- Options -->
          <div class="flex items-center justify-between text-[11px] text-muted">
            <label class="flex cursor-pointer items-center gap-1">
              <input v-model="matchCase" type="checkbox" class="rounded" />
              Match case
            </label>
            <label class="flex cursor-pointer items-center gap-1">
              <input v-model="searchLayerNames" type="checkbox" class="rounded" />
              Include layer names
            </label>
          </div>

          <!-- Navigation & Action Buttons -->
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-1">
              <button
                class="rounded border border-border px-2 py-1 text-xs text-surface hover:bg-hover disabled:opacity-40"
                :disabled="matches.length === 0"
                @click="prevMatch"
              >
                Previous
              </button>
              <button
                class="rounded border border-border px-2 py-1 text-xs text-surface hover:bg-hover disabled:opacity-40"
                :disabled="matches.length === 0"
                @click="nextMatch"
              >
                Next
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                class="rounded border border-border px-2 py-1 text-xs text-surface hover:bg-hover disabled:opacity-40"
                :disabled="matches.length === 0"
                @click="replaceCurrent"
              >
                Replace
              </button>
              <button
                class="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-40"
                :disabled="matches.length === 0"
                @click="replaceAll"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
