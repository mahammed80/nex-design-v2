<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { refAutoReset, useEventListener } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import {
  creativeNotesDocumentKey,
  sortCreativeNotes,
  useCreativeNotes
} from '@/app/creative-notes/storage'
import { IS_BROWSER } from '@nex-design/core/constants'
import type { Color } from '@nex-design/core/types'
import type { CreativeNoteColor } from '@/app/creative-notes/types'

const store = useEditorStore()
const { showLauncher = false } = defineProps<{ showLauncher?: boolean }>()
const capture = useTemplateRef<HTMLTextAreaElement>('capture')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

// ── Floating Window Position, Size & Docking State ──
const pos = ref({ x: IS_BROWSER ? Math.max(20, window.innerWidth - 440) : 800, y: 70 })
const size = ref({ width: 400, height: 580 })
const isDocked = ref<'none' | 'top' | 'bottom'>('none')
const isDragging = ref(false)
const isResizing = ref(false)

const draft = ref('')
const draftImage = ref<string | null>(null)
const query = ref('')
const selectedColor = ref<CreativeNoteColor>('yellow')
const saved = refAutoReset(false, 1200)
const copiedNoteId = refAutoReset<string | null>(null, 1500)
const previewImage = ref<string | null>(null)

const noteDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const documentKey = computed(() =>
  creativeNotesDocumentKey(store.state.activeProjectId, store.state.documentName)
)
const { notes, addNote, updateNote, updateNoteColor, attachImage, togglePin, deleteNote } =
  useCreativeNotes(documentKey)

const colorOptions: Array<{
  value: CreativeNoteColor
  label: string
  bgClass: string
  cardClass: string
  tapeClass: string
}> = [
  {
    value: 'yellow',
    label: 'Warm Yellow',
    bgClass: 'bg-amber-400',
    cardClass:
      'bg-[#fef9c3] dark:bg-[#713f12]/30 border-amber-300 dark:border-amber-600/40 text-amber-950 dark:text-amber-100 shadow-[0_8px_24px_rgba(245,158,11,0.15)]',
    tapeClass: 'bg-amber-300/60 dark:bg-amber-500/30 border-amber-400/40'
  },
  {
    value: 'rose',
    label: 'Coral Rose',
    bgClass: 'bg-rose-400',
    cardClass:
      'bg-[#ffe4e6] dark:bg-[#881337]/30 border-rose-300 dark:border-rose-600/40 text-rose-950 dark:text-rose-100 shadow-[0_8px_24px_rgba(244,63,94,0.15)]',
    tapeClass: 'bg-rose-300/60 dark:bg-rose-500/30 border-rose-400/40'
  },
  {
    value: 'cyan',
    label: 'Sky Cyan',
    bgClass: 'bg-sky-400',
    cardClass:
      'bg-[#e0f2fe] dark:bg-[#0c4a6e]/30 border-sky-300 dark:border-sky-600/40 text-sky-950 dark:text-sky-100 shadow-[0_8px_24px_rgba(14,165,233,0.15)]',
    tapeClass: 'bg-sky-300/60 dark:bg-sky-500/30 border-sky-400/40'
  },
  {
    value: 'violet',
    label: 'Lavender',
    bgClass: 'bg-purple-400',
    cardClass:
      'bg-[#f3e8ff] dark:bg-[#581c87]/30 border-purple-300 dark:border-purple-600/40 text-purple-950 dark:text-purple-100 shadow-[0_8px_24px_rgba(168,85,247,0.15)]',
    tapeClass: 'bg-purple-300/60 dark:bg-purple-500/30 border-purple-400/40'
  },
  {
    value: 'emerald',
    label: 'Mint Green',
    bgClass: 'bg-emerald-400',
    cardClass:
      'bg-[#dcfce7] dark:bg-[#064e3b]/30 border-emerald-300 dark:border-emerald-600/40 text-emerald-950 dark:text-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.15)]',
    tapeClass: 'bg-emerald-300/60 dark:bg-emerald-500/30 border-emerald-400/40'
  },
  {
    value: 'orange',
    label: 'Peach Orange',
    bgClass: 'bg-orange-400',
    cardClass:
      'bg-[#ffedd5] dark:bg-[#7c2d12]/30 border-orange-300 dark:border-orange-600/40 text-orange-950 dark:text-orange-100 shadow-[0_8px_24px_rgba(249,115,22,0.15)]',
    tapeClass: 'bg-orange-300/60 dark:bg-orange-500/30 border-orange-400/40'
  }
]

const colorMap = Object.fromEntries(colorOptions.map((c) => [c.value, c]))

const visibleNotes = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  const filtered = normalizedQuery
    ? notes.value.filter((note) => note.content.toLocaleLowerCase().includes(normalizedQuery))
    : notes.value
  return sortCreativeNotes(filtered)
})

onMounted(() => {
  if (IS_BROWSER) {
    pos.value = {
      x: Math.max(20, window.innerWidth - size.value.width - 40),
      y: 70
    }
  }
})

watch(
  () => store.state.showCreativeNotes,
  async (open) => {
    if (!open) return
    isDocked.value = 'none'
    await nextTick()
    capture.value?.focus()
  }
)

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.code === 'Escape' && store.state.showCreativeNotes && isDocked.value === 'none') {
    store.state.showCreativeNotes = false
  }
})

// ── Dragging Window by Header ──
function startDrag(e: MouseEvent | TouchEvent) {
  if ((e.target as HTMLElement).closest('button, input, textarea')) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  const startX = clientX - pos.value.x
  const startY = clientY - pos.value.y
  isDragging.value = true

  function onMove(ev: MouseEvent | TouchEvent) {
    const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX
    const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY
    const nextX = cx - startX
    const nextY = cy - startY

    // Edge docking triggers
    if (nextY < 12) {
      isDocked.value = 'top'
    } else if (nextY > window.innerHeight - 70) {
      isDocked.value = 'bottom'
    } else {
      isDocked.value = 'none'
    }

    pos.value.x = Math.max(10, Math.min(window.innerWidth - size.value.width - 10, nextX))
    pos.value.y = Math.max(0, Math.min(window.innerHeight - 60, nextY))
  }

  function onUp() {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onUp)
}

// ── Resizing Window from Handles ──
function startResize(e: MouseEvent, direction: 'se' | 's' | 'e') {
  e.preventDefault()
  e.stopPropagation()
  const startW = size.value.width
  const startH = size.value.height
  const startX = e.clientX
  const startY = e.clientY
  isResizing.value = true

  function onMove(ev: MouseEvent) {
    if (direction.includes('e')) {
      const nw = startW + (ev.clientX - startX)
      size.value.width = Math.max(300, Math.min(window.innerWidth - pos.value.x - 10, nw))
    }
    if (direction.includes('s')) {
      const nh = startH + (ev.clientY - startY)
      size.value.height = Math.max(350, Math.min(window.innerHeight - pos.value.y - 10, nh))
    }
  }

  function onUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function restoreFromDock(from: 'top' | 'bottom') {
  isDocked.value = 'none'
  store.state.showCreativeNotes = true
  if (from === 'top') pos.value.y = 60
  else pos.value.y = Math.max(40, window.innerHeight - size.value.height - 40)
  void nextTick(() => capture.value?.focus())
}

// ── Screenshot / Image Clipboard Paste Handler ──
function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') {
            draftImage.value = e.target.result
          }
        }
        reader.readAsDataURL(file)
      }
      break
    }
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        draftImage.value = e.target.result
      }
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

function saveDraft() {
  if (!draft.value.trim() && !draftImage.value) return
  if (!addNote(draft.value, selectedColor.value, draftImage.value ?? undefined)) return
  draft.value = ''
  draftImage.value = null
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

function copyNoteText(noteId: string, content: string) {
  void navigator.clipboard.writeText(content)
  copiedNoteId.value = noteId
}

const STICKY_CANVAS_COLORS: Record<CreativeNoteColor, Color> = {
  yellow: { r: 0.99, g: 0.97, b: 0.76, a: 1 },
  rose: { r: 1.0, g: 0.89, b: 0.9, a: 1 },
  cyan: { r: 0.87, g: 0.94, b: 0.99, a: 1 },
  violet: { r: 0.95, g: 0.91, b: 1.0, a: 1 },
  emerald: { r: 0.86, g: 0.98, b: 0.9, a: 1 },
  amber: { r: 0.99, g: 0.95, b: 0.75, a: 1 },
  orange: { r: 1.0, g: 0.93, b: 0.83, a: 1 }
}

// ── Drop Sticky Note Directly onto Canvas ──
function placeOnCanvas(note: { content: string; color: CreativeNoteColor }) {
  if (!store) return
  const noteRgb = STICKY_CANVAS_COLORS[note.color] ?? STICKY_CANVAS_COLORS.yellow
  const fills = [
    {
      type: 'SOLID' as const,
      color: noteRgb,
      visible: true,
      opacity: 1
    }
  ]

  store.undo.beginBatch('Place Sticky Note')
  const vp = store.state.viewport
  const cx = -vp.panX / vp.zoom + window.innerWidth / (2 * vp.zoom)
  const cy = -vp.panY / vp.zoom + window.innerHeight / (2 * vp.zoom)

  const frameId = store.createShape('FRAME', cx - 100, cy - 100, 200, 200)
  store.updateNode(frameId, {
    name: '📌 Sticky Note',
    cornerRadius: 8,
    fills,
    effects: [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.15 },
        offset: { x: 0, y: 8 },
        radius: 16,
        spread: 0,
        visible: true
      }
    ]
  })

  if (note.content) {
    const textId = store.createShape('TEXT', cx - 85, cy - 85, 170, 170, frameId)
    store.updateNode(textId, {
      text: note.content,
      fontSize: 14,
      fontFamily: 'Inter',
      textAutoResize: 'HEIGHT',
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }]
    })
  }

  store.select([frameId])
  store.undo.commitBatch()
  store.requestRender()
}

function formatNoteDate(timestamp: number) {
  return noteDateFormatter.format(timestamp)
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-40">
    <!-- ── 1. FLOATING LAUNCHER PILL (WHEN CLOSED) ── -->
    <button
      v-if="showLauncher && !store.state.showCreativeNotes && isDocked === 'none'"
      data-test-id="creative-notes-open"
      class="pointer-events-auto fixed right-4 bottom-4 flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/80 backdrop-blur-xl px-4 text-xs font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:border-amber-400/50 hover:bg-black/90 group"
      aria-label="Open creative notes"
      title="Creative Sticky Notes (⌘⌥N)"
      @click="store.state.showCreativeNotes = true"
    >
      <icon-lucide-sticky-note class="size-4 text-amber-400 transition-transform group-hover:rotate-12" />
      <span>Creative Notes</span>
      <span
        v-if="notes.length > 0"
        class="flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black"
      >
        {{ notes.length }}
      </span>
    </button>

    <!-- ── 2. HIDDEN / DOCKED SCREEN-EDGE PULL TABS (WITH ARROW) ── -->
    <!-- Top Edge Tab -->
    <button
      v-if="isDocked === 'top' || (store.state.showCreativeNotes && isDocked === 'top')"
      class="pointer-events-auto fixed top-0 z-50 flex items-center gap-2 px-5 py-1.5 rounded-b-2xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.25)] text-white text-xs font-bold cursor-pointer hover:py-2.5 transition-all group select-none animate-bounce"
      :style="{ left: `${pos.x + size.width / 2}px`, transform: 'translateX(-50%)' }"
      title="Click or drag to show Creative Notes"
      @click="restoreFromDock('top')"
    >
      <icon-lucide-chevron-down class="size-4 text-amber-400 transition-transform group-hover:translate-y-0.5" />
      <span>📌 Notes ({{ notes.length }})</span>
      <icon-lucide-sparkles class="size-3 text-amber-400" />
    </button>

    <!-- Bottom Edge Tab -->
    <button
      v-if="isDocked === 'bottom'"
      class="pointer-events-auto fixed bottom-0 z-50 flex items-center gap-2 px-5 py-1.5 rounded-t-2xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_-12px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(245,158,11,0.25)] text-white text-xs font-bold cursor-pointer hover:py-2.5 transition-all group select-none animate-bounce"
      :style="{ left: `${pos.x + size.width / 2}px`, transform: 'translateX(-50%)' }"
      title="Click or drag to show Creative Notes"
      @click="restoreFromDock('bottom')"
    >
      <icon-lucide-chevron-up class="size-4 text-amber-400 transition-transform group-hover:-translate-y-0.5" />
      <span>📌 Notes ({{ notes.length }})</span>
      <icon-lucide-sparkles class="size-3 text-amber-400" />
    </button>

    <!-- ── 3. FLOATING DRAGGABLE & RESIZABLE NOTE TAKER WINDOW ── -->
    <aside
      v-if="store.state.showCreativeNotes && isDocked === 'none'"
      data-test-id="creative-notes-panel"
      class="pointer-events-auto fixed z-50 flex flex-col overflow-hidden rounded-[26px] border border-white/20 bg-zinc-950/90 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.15)] select-none transition-shadow"
      :class="isDragging ? 'shadow-[0_32px_80px_rgba(0,0,0,0.95),0_0_45px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/40 cursor-grabbing' : ''"
      :style="{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }"
      aria-label="Creative Notes"
    >
      <!-- Draggable Window Header Bar -->
      <header
        class="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5 backdrop-blur-md cursor-grab active:cursor-grabbing select-none"
        @mousedown="startDrag"
        @touchstart="startDrag"
      >
        <div class="flex items-center gap-2.5 pointer-events-none">
          <div class="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs">
            <icon-lucide-sticky-note class="size-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Creative Notes
            </h2>
            <p class="truncate text-[10px] text-zinc-400 font-mono">Drag anywhere • Drop on canvas</p>
          </div>
        </div>

        <!-- Window Action Buttons -->
        <div class="flex items-center gap-1.5">
          <!-- Dock to Top Button -->
          <button
            class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Dock to Top Edge (Hide)"
            @click.stop="isDocked = 'top'"
          >
            <icon-lucide-chevron-up class="size-4" />
          </button>

          <!-- Dock to Bottom Button -->
          <button
            class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Dock to Bottom Edge (Hide)"
            @click.stop="isDocked = 'bottom'"
          >
            <icon-lucide-chevron-down class="size-4" />
          </button>

          <span class="w-px h-4 bg-white/10 mx-0.5" />

          <!-- Close Window Button -->
          <button
            class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            aria-label="Close creative notes"
            @click.stop="store.state.showCreativeNotes = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </div>
      </header>

      <!-- ── CREATE STICKY NOTE COMPOSER ── -->
      <section class="shrink-0 p-3.5 border-b border-white/10 bg-black/40">
        <div
          class="rounded-2xl border transition-all duration-200 p-3 relative overflow-hidden"
          :class="colorMap[selectedColor]?.cardClass ?? colorMap.yellow.cardClass"
        >
          <!-- Sticky Tape Effect Header -->
          <div
            class="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-3 rounded-xs border shadow-xs pointer-events-none"
            :class="colorMap[selectedColor]?.tapeClass ?? colorMap.yellow.tapeClass"
          />

          <!-- Text Input -->
          <textarea
            ref="capture"
            v-model="draft"
            data-test-id="creative-notes-capture"
            rows="3"
            placeholder="Type an idea, or press Ctrl+V to paste a screenshot..."
            class="block w-full resize-none bg-transparent text-xs font-medium leading-relaxed outline-none placeholder:text-black/40 dark:placeholder:text-white/40 pt-1"
            @keydown="onCaptureKeydown"
            @paste="handlePaste"
          />

          <!-- Attached Screenshot Preview -->
          <div v-if="draftImage" class="relative mt-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm max-h-36 group">
            <img :src="draftImage" alt="Pasted screenshot" class="w-full object-cover max-h-36 rounded-xl cursor-pointer" @click="previewImage = draftImage" />
            <button
              class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
              title="Remove attached screenshot"
              @click="draftImage = null"
            >
              <icon-lucide-x class="size-3.5" />
            </button>
          </div>

          <!-- Bottom Tools (Color Swatches, Paste Screenshot Button & Add Idea) -->
          <div class="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <!-- Color Swatches & Image Attach -->
            <div class="flex items-center gap-1.5">
              <button
                v-for="color in colorOptions"
                :key="color.value"
                class="size-4.5 cursor-pointer rounded-full transition-transform hover:scale-125 shadow-xs"
                :class="[
                  color.bgClass,
                  selectedColor === color.value
                    ? 'ring-2 ring-black/80 dark:ring-white scale-110'
                    : 'opacity-70 hover:opacity-100'
                ]"
                :title="color.label"
                @click="selectedColor = color.value"
              />

              <!-- Attach Screenshot Button -->
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                class="ml-1 flex size-6 items-center justify-center rounded-md bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
                title="Upload / Attach Screenshot"
                @click="fileInput?.click()"
              >
                <icon-lucide-image class="size-3.5" />
              </button>
            </div>

            <!-- Directly Clickable Add Button -->
            <button
              data-test-id="creative-notes-add"
              class="flex h-7 cursor-pointer items-center gap-1.5 rounded-xl bg-black dark:bg-white px-3 text-[11px] font-bold text-white dark:text-black shadow-md transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!draft.trim() && !draftImage"
              @click="saveDraft"
            >
              <icon-lucide-check v-if="saved" class="size-3.5 stroke-[3]" />
              <icon-lucide-plus v-else class="size-3.5 stroke-[3]" />
              <span>{{ saved ? 'Saved!' : 'Add Note' }}</span>
            </button>
          </div>
        </div>
        <div class="mt-1.5 flex items-center justify-between px-1 text-[10px] text-zinc-400 font-mono">
          <span>⌘/Ctrl + Enter to save</span>
          <span>Ctrl+V to paste image</span>
        </div>
      </section>

      <!-- Search Bar -->
      <div v-if="notes.length > 2" class="shrink-0 px-3.5 pt-3">
        <label class="flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs text-white">
          <icon-lucide-search class="size-3.5 text-zinc-400" />
          <input
            v-model="query"
            type="search"
            placeholder="Search notes..."
            class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-500"
          />
        </label>
      </div>

      <!-- ── STICKY NOTES LIST ── -->
      <div class="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin">
        <!-- Empty State -->
        <div
          v-if="visibleNotes.length === 0"
          class="flex h-full min-h-48 flex-col items-center justify-center px-8 text-center"
        >
          <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20 text-amber-400 shadow-sm">
            <icon-lucide-sticky-note class="size-6" />
          </div>
          <p class="text-xs font-bold text-white">
            {{ query ? 'No matching notes' : 'Your sticky note board is empty' }}
          </p>
          <p class="mt-1 text-[11px] leading-relaxed text-zinc-400">
            {{ query ? 'Try searching for something else.' : 'Capture concepts, screenshot references, and color notes while designing.' }}
          </p>
        </div>

        <!-- Sticky Note Cards -->
        <div v-else class="grid grid-cols-1 gap-3.5">
          <article
            v-for="note in visibleNotes"
            :key="note.id"
            class="group relative rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5"
            :class="colorMap[note.color]?.cardClass ?? colorMap.yellow.cardClass"
          >
            <!-- Sticky Tape Pin Bar -->
            <div
              class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 rounded-xs border shadow-xs pointer-events-none"
              :class="colorMap[note.color]?.tapeClass ?? colorMap.yellow.tapeClass"
            />

            <!-- Pinned Indicator Badge -->
            <div v-if="note.pinned" class="absolute -top-1.5 right-3 text-rose-500 animate-bounce">
              📌
            </div>

            <!-- Note Text Content Area -->
            <textarea
              :value="note.content"
              rows="2"
              aria-label="Creative sticky note"
              placeholder="Empty note..."
              class="block w-full resize-none bg-transparent text-xs font-medium leading-relaxed outline-none min-h-12 placeholder:text-black/30 dark:placeholder:text-white/30"
              @change="onNoteInput(note.id, $event)"
            />

            <!-- Note Attached Screenshot Thumbnail -->
            <div
              v-if="note.image"
              class="relative mt-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm group/img cursor-pointer"
              @click="previewImage = note.image"
            >
              <img :src="note.image" alt="Note attachment" class="w-full object-cover max-h-40 rounded-xl" />
              <button
                class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer opacity-0 group-hover/img:opacity-100"
                title="Remove screenshot"
                @click.stop="attachImage(note.id, undefined)"
              >
                <icon-lucide-trash-2 class="size-3" />
              </button>
            </div>

            <!-- Note Footer Controls -->
            <footer class="mt-2.5 flex items-center justify-between gap-1.5 pt-2 border-t border-black/10 dark:border-white/10">
              <span class="text-[10px] font-mono opacity-70">
                {{ formatNoteDate(note.updatedAt) }}
              </span>

              <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <!-- Color Palette Selector -->
                <div class="flex items-center gap-1 mr-1">
                  <button
                    v-for="c in colorOptions"
                    :key="c.value"
                    class="size-3 rounded-full cursor-pointer transition-transform hover:scale-125"
                    :class="[c.bgClass, note.color === c.value ? 'ring-1 ring-black dark:ring-white scale-110' : 'opacity-60']"
                    :title="`Change to ${c.label}`"
                    @click="updateNoteColor(note.id, c.value)"
                  />
                </div>

                <!-- Drop on Canvas Button -->
                <button
                  class="flex size-6 cursor-pointer items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  title="Place as Sticky Note onto Canvas"
                  @click="placeOnCanvas(note)"
                >
                  <icon-lucide-layout-grid class="size-3.5" />
                </button>

                <!-- Copy Text Button -->
                <button
                  class="flex size-6 cursor-pointer items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  :title="copiedNoteId === note.id ? 'Copied!' : 'Copy Note Text'"
                  @click="copyNoteText(note.id, note.content)"
                >
                  <icon-lucide-check v-if="copiedNoteId === note.id" class="size-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
                  <icon-lucide-copy v-else class="size-3.5" />
                </button>

                <!-- Pin Toggle -->
                <button
                  class="flex size-6 cursor-pointer items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  :class="note.pinned ? 'text-rose-600 dark:text-rose-400 font-bold' : ''"
                  :title="note.pinned ? 'Unpin Note' : 'Pin Note to Top'"
                  @click="togglePin(note.id)"
                >
                  <icon-lucide-pin class="size-3.5" />
                </button>

                <!-- Delete Note -->
                <button
                  class="flex size-6 cursor-pointer items-center justify-center rounded-md hover:bg-red-500/20 hover:text-red-500 transition-colors"
                  title="Delete Note"
                  @click="deleteNote(note.id)"
                >
                  <icon-lucide-trash-2 class="size-3.5" />
                </button>
              </div>
            </footer>
          </article>
        </div>
      </div>

      <!-- ── RESIZE HANDLES ── -->
      <!-- Bottom-Right Handle -->
      <div
        class="absolute bottom-0 right-0 size-4 cursor-se-resize flex items-end justify-end p-1 group/resize"
        title="Drag to resize window"
        @mousedown="startResize($event, 'se')"
      >
        <div class="size-2 rounded-br-sm border-r-2 border-b-2 border-white/30 group-hover/resize:border-amber-400" />
      </div>
      <!-- Right Edge Handle -->
      <div
        class="absolute top-12 bottom-4 right-0 w-1.5 cursor-e-resize hover:bg-amber-400/20 transition-colors"
        @mousedown="startResize($event, 'e')"
      />
      <!-- Bottom Edge Handle -->
      <div
        class="absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize hover:bg-amber-400/20 transition-colors"
        @mousedown="startResize($event, 's')"
      />
    </aside>

    <!-- ── FULLSCREEN IMAGE LIGHTBOX PREVIEW ── -->
    <div
      v-if="previewImage"
      class="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
      @click="previewImage = null"
    >
      <div class="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl" @click.stop>
        <img :src="previewImage" alt="Screenshot lightbox preview" class="w-full h-full object-contain max-h-[80vh] rounded-2xl" />
        <button
          class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
          @click="previewImage = null"
        >
          <icon-lucide-x class="size-5" />
        </button>
      </div>
    </div>
  </div>
</template>
