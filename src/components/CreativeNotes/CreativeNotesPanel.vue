<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { onClickOutside, refAutoReset, useEventListener } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import {
  creativeNotesDocumentKey,
  sortCreativeNotes,
  useCreativeNotes
} from '@/app/creative-notes/storage'
import type { CreativeNoteColor } from '@/app/creative-notes/types'

const store = useEditorStore()
const { showLauncher = false } = defineProps<{ showLauncher?: boolean }>()
const panel = useTemplateRef<HTMLElement>('panel')
const capture = useTemplateRef<HTMLTextAreaElement>('capture')
const draft = ref('')
const query = ref('')
const selectedColor = ref<CreativeNoteColor>('violet')
const saved = refAutoReset(false, 1200)
const noteDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const documentKey = computed(() =>
  creativeNotesDocumentKey(store.state.activeProjectId, store.state.documentName)
)
const { notes, addNote, updateNote, togglePin, deleteNote } = useCreativeNotes(documentKey)

const colorOptions: Array<{ value: CreativeNoteColor; label: string; class: string }> = [
  { value: 'violet', label: 'Violet', class: 'bg-violet-400' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-400' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-400' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-400' }
]

const noteAccentClasses: Record<CreativeNoteColor, string> = {
  violet: 'border-l-violet-400',
  amber: 'border-l-amber-400',
  cyan: 'border-l-cyan-400',
  rose: 'border-l-rose-400'
}

const visibleNotes = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  const filtered = normalizedQuery
    ? notes.value.filter((note) => note.content.toLocaleLowerCase().includes(normalizedQuery))
    : notes.value
  return sortCreativeNotes(filtered)
})

watch(
  () => store.state.showCreativeNotes,
  async (open) => {
    if (!open) return
    await nextTick()
    capture.value?.focus()
  }
)

onClickOutside(panel, () => {
  if (store.state.showCreativeNotes) store.state.showCreativeNotes = false
})

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.code === 'Escape' && store.state.showCreativeNotes) {
    store.state.showCreativeNotes = false
  }
})

function saveDraft() {
  if (!addNote(draft.value, selectedColor.value)) return
  draft.value = ''
  saved.value = true
  void nextTick(() => capture.value?.focus())
}

function onCaptureKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    saveDraft()
  }
}

function onNoteInput(id: string, event: Event) {
  if (!(event.target instanceof HTMLTextAreaElement)) return
  updateNote(id, event.target.value)
}

function formatNoteDate(timestamp: number) {
  return noteDateFormatter.format(timestamp)
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-40">
    <button
      v-if="showLauncher && !store.state.showCreativeNotes"
      data-test-id="creative-notes-open"
      class="pointer-events-auto absolute right-4 bottom-4 flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-panel px-3.5 text-xs font-medium text-surface shadow-lg transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-hover"
      aria-label="Open creative notes"
      title="Creative Notes (⌘⌥N)"
      @click="store.state.showCreativeNotes = true"
    >
      <icon-lucide-notebook-pen class="size-4 text-accent" />
      <span class="hidden sm:inline">Creative Notes</span>
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-8 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-8 opacity-0"
    >
      <aside
        v-if="store.state.showCreativeNotes"
        ref="panel"
        data-test-id="creative-notes-panel"
        class="pointer-events-auto absolute inset-y-3 right-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl"
        aria-label="Creative Notes"
      >
        <header class="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5">
          <div class="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <icon-lucide-lightbulb class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-semibold text-surface">Creative Notes</h2>
            <p class="truncate text-[11px] text-muted">{{ store.state.documentName }}</p>
          </div>
          <span class="rounded-full bg-hover px-2 py-0.5 text-[10px] text-muted">
            {{ notes.length }} {{ notes.length === 1 ? 'idea' : 'ideas' }}
          </span>
          <button
            class="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-surface"
            aria-label="Close creative notes"
            @click="store.state.showCreativeNotes = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </header>

        <section class="shrink-0 border-b border-border p-3">
          <div
            class="rounded-xl border border-border bg-input/40 p-2.5 focus-within:border-accent/60"
          >
            <textarea
              ref="capture"
              v-model="draft"
              data-test-id="creative-notes-capture"
              rows="3"
              placeholder="Capture a concept, visual direction, interaction, or wild idea…"
              class="block w-full resize-none bg-transparent text-xs leading-5 text-surface outline-none placeholder:text-muted"
              @keydown="onCaptureKeydown"
            />
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5" aria-label="Note color">
                <button
                  v-for="color in colorOptions"
                  :key="color.value"
                  class="size-4 cursor-pointer rounded-full transition-transform hover:scale-110"
                  :class="[
                    color.class,
                    selectedColor === color.value
                      ? 'ring-2 ring-surface/70 ring-offset-2 ring-offset-panel'
                      : 'opacity-60'
                  ]"
                  :aria-label="`${color.label} note`"
                  @click="selectedColor = color.value"
                />
              </div>
              <button
                data-test-id="creative-notes-add"
                class="flex h-7 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-2.5 text-[11px] font-medium text-white transition-opacity disabled:cursor-default disabled:opacity-40"
                :disabled="!draft.trim()"
                @click="saveDraft"
              >
                <icon-lucide-check v-if="saved" class="size-3.5" />
                <icon-lucide-plus v-else class="size-3.5" />
                {{ saved ? 'Captured' : 'Add idea' }}
              </button>
            </div>
          </div>
          <p class="mt-1.5 px-1 text-[10px] text-muted">⌘/Ctrl + Enter to capture</p>
        </section>

        <div v-if="notes.length > 3" class="shrink-0 px-3 pt-3">
          <label
            class="flex h-8 items-center gap-2 rounded-lg border border-border bg-input/40 px-2.5"
          >
            <icon-lucide-search class="size-3.5 text-muted" />
            <input
              v-model="query"
              type="search"
              placeholder="Search ideas"
              class="min-w-0 flex-1 bg-transparent text-xs text-surface outline-none placeholder:text-muted"
            />
          </label>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div
            v-if="visibleNotes.length === 0"
            class="flex h-full min-h-48 flex-col items-center justify-center px-8 text-center"
          >
            <div
              class="mb-3 flex size-11 items-center justify-center rounded-xl bg-hover text-muted"
            >
              <icon-lucide-sparkles class="size-5" />
            </div>
            <p class="text-xs font-medium text-surface">
              {{ query ? 'No matching ideas' : 'Your idea space is empty' }}
            </p>
            <p class="mt-1 text-[11px] leading-4 text-muted">
              {{
                query
                  ? 'Try a different search phrase.'
                  : 'Capture references, visual directions, and creative decisions while you design.'
              }}
            </p>
          </div>

          <div v-else class="flex flex-col gap-2.5">
            <article
              v-for="note in visibleNotes"
              :key="note.id"
              class="group rounded-xl border border-border border-l-2 bg-input/25 p-2.5 transition-colors hover:bg-input/45"
              :class="noteAccentClasses[note.color]"
            >
              <textarea
                :value="note.content"
                rows="2"
                aria-label="Creative note"
                class="block min-h-12 w-full resize-none bg-transparent text-xs leading-5 text-surface outline-none"
                @change="onNoteInput(note.id, $event)"
              />
              <footer class="mt-1.5 flex items-center justify-between gap-2">
                <span class="text-[10px] text-muted">
                  {{ formatNoteDate(note.updatedAt) }}
                </span>
                <div
                  class="flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100"
                >
                  <button
                    class="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                    :class="note.pinned ? 'text-accent' : ''"
                    :aria-label="note.pinned ? 'Unpin idea' : 'Pin idea'"
                    @click="togglePin(note.id)"
                  >
                    <icon-lucide-pin class="size-3.5" />
                  </button>
                  <button
                    class="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete idea"
                    @click="deleteNote(note.id)"
                  >
                    <icon-lucide-trash-2 class="size-3.5" />
                  </button>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>
