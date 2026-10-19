<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener, useLocalStorage } from '@vueuse/core'

import type { SceneNode } from '@nex-design/core/scene-graph'
import { useViewportKind } from '@nex-design/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { TOOL_TUTORIAL_STEPS, tutorialTargetSelector } from '@/app/tutorial/tools'

const editor = useEditorStore()
const completed = useLocalStorage<string[]>('nex-design:completed-tool-tutorials', [])
// Shares PropertiesPanel's key so the launcher sits beside the right panel, not over the chat input
const propertiesCollapsed = useLocalStorage('nex-design:properties-collapsed', false)
const { isMobile } = useViewportKind()
const launcherOffset = computed(() => {
  if (isMobile.value) return 'right-6'
  return propertiesCollapsed.value ? 'right-24' : 'right-[20.5rem]'
})
const open = ref(false)
const stepIndex = ref(0)
const taskComplete = ref(false)
const targetRect = ref<DOMRect | null>(null)
let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null

const step = computed(() => TOOL_TUTORIAL_STEPS[stepIndex.value])
const progress = computed(() => completed.value.length)

const cardStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return { left: '50%', bottom: '150px', transform: 'translateX(-50%)' }
  return {
    left: `${Math.min(Math.max(rect.left + rect.width / 2, 210), window.innerWidth - 210)}px`,
    bottom: `${Math.max(window.innerHeight - rect.top + 20, 150)}px`,
    transform: 'translateX(-50%)'
  }
})

const highlightStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return { display: 'none' }
  return {
    left: `${rect.left - 4}px`,
    top: `${rect.top - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`
  }
})

function refreshTarget() {
  const target = document.querySelector<HTMLElement>(tutorialTargetSelector(step.value.tool))
  targetRect.value = target?.getBoundingClientRect() ?? null
}

function activateStep() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
  taskComplete.value = false
  editor.setTool(step.value.tool)
  void nextTick(refreshTarget)
}

function markComplete() {
  if (taskComplete.value) return
  taskComplete.value = true
  if (!completed.value.includes(step.value.tool)) {
    completed.value = [...completed.value, step.value.tool]
  }

  // Auto advance to next mission after a brief celebratory pause
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
  autoAdvanceTimer = setTimeout(() => {
    if (open.value && stepIndex.value < TOOL_TUTORIAL_STEPS.length - 1) {
      goTo(stepIndex.value + 1)
    }
  }, 1400)
}

function matchesCreatedNode(node: SceneNode) {
  const completion = step.value.completion
  return completion.kind === 'create' && completion.nodeType === node.type
}

// ── Only trigger success on actual canvas actions ──
const unbindCreated = editor.onEditorEvent('node:created', (node) => {
  if (open.value && matchesCreatedNode(node)) {
    markComplete()
  }
})

const unbindUpdated = editor.onEditorEvent('node:updated', (_id, changes) => {
  if (!open.value) return
  // Move mission requires actual x or y relocation on canvas
  if (step.value.tool === 'SELECT' && ('x' in changes || 'y' in changes)) {
    markComplete()
  }
})

const unbindViewport = editor.onEditorEvent('viewport:changed', () => {
  if (open.value && step.value.completion.kind === 'pan') {
    markComplete()
  }
})

function goTo(index: number) {
  stepIndex.value = (index + TOOL_TUTORIAL_STEPS.length) % TOOL_TUTORIAL_STEPS.length
  activateStep()
}

function closeTutorial() {
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
  open.value = false
  targetRect.value = null
}

function openTutorial() {
  open.value = true
  activateStep()
}

watch(() => step.value.tool, refreshTarget)
useEventListener(window, 'resize', refreshTarget)
useEventListener(window, 'scroll', refreshTarget, true)

onMounted(() => {
  if (open.value) activateStep()
})

onBeforeUnmount(() => {
  if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
  unbindCreated()
  unbindUpdated()
  unbindViewport()
})
</script>

<template>
  <!-- ── DARK RED GLASS GUIDE & MISSIONS LAUNCHER PILL ── -->
  <button
    v-if="!open"
    data-test-id="tool-tutorial-open"
    :class="launcherOffset"
    class="fixed bottom-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-rose-500/30 bg-black/80 backdrop-blur-2xl text-white shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(225,29,72,0.25)] transition-all duration-300 hover:scale-105 hover:border-rose-500/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.9),0_0_30px_rgba(225,29,72,0.45)] cursor-pointer group"
    title="Interactive Guide & Missions"
    aria-label="Open tool tutorials"
    @click="openTutorial"
  >
    <div class="relative flex size-5 items-center justify-center">
      <span class="absolute inset-0 rounded-full bg-rose-500/40 animate-ping opacity-60" />
      <icon-lucide-sparkles class="size-4 text-rose-400 transition-transform group-hover:rotate-12" />
    </div>
    <span class="text-xs font-bold tracking-wide">Guide & Missions</span>
    <span class="flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-300">
      {{ progress }}/{{ TOOL_TUTORIAL_STEPS.length }}
    </span>
  </button>

  <!-- ── DARK RED GLASS MISSIONS CARD & HIGHLIGHT ── -->
  <template v-else>
    <!-- Canvas Floating Action Cue / Spotlight -->
    <div
      v-if="!taskComplete"
      class="fixed top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/40 bg-black/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(225,29,72,0.3)] animate-bounce text-xs font-semibold text-rose-200"
    >
      <span class="size-2 rounded-full bg-rose-500 animate-ping" />
      <span>🎯 Canvas Action: {{ step.task }}</span>
    </div>

    <!-- Toolbar Focus Ring -->
    <div
      class="pointer-events-none fixed z-40 rounded-xl border-2 border-rose-500 ring-4 ring-rose-500/30 transition-all shadow-[0_0_25px_rgba(225,29,72,0.4)]"
      :style="highlightStyle"
    />

    <section
      data-test-id="tool-tutorial-card"
      class="fixed z-50 w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-rose-500/30 bg-zinc-950/90 backdrop-blur-2xl p-5 text-left shadow-[0_24px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(225,29,72,0.25)] overflow-hidden"
      :style="cardStyle"
      aria-live="polite"
    >
      <!-- Dark Red Aurora Mesh Glow Accents -->
      <div class="absolute -top-16 -left-16 size-40 rounded-full bg-gradient-to-br from-rose-600/30 via-red-900/20 to-transparent blur-2xl pointer-events-none" />
      <div class="absolute -bottom-16 -right-16 size-40 rounded-full bg-gradient-to-tl from-rose-700/25 via-red-950/30 to-transparent blur-2xl pointer-events-none" />

      <!-- Caret Arrow pointing to the toolbar item -->
      <div
        class="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-r border-b border-rose-500/30 bg-zinc-950/90"
      />

      <!-- Header -->
      <div class="relative flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono font-bold tracking-wider text-rose-300 uppercase">
              Mission {{ stepIndex + 1 }} of {{ TOOL_TUTORIAL_STEPS.length }}
            </span>
            <span
              v-if="step.shortcut"
              class="inline-flex items-center px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono font-semibold text-zinc-400"
            >
              Key: {{ step.shortcut }}
            </span>
            <span
              v-if="completed.includes(step.tool)"
              class="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400"
            >
              <icon-lucide-check class="size-3 stroke-[3]" /> Done
            </span>
          </div>
          <h2 class="mt-1.5 text-base font-bold text-white tracking-tight flex items-center gap-2">
            {{ step.title }}
          </h2>
        </div>
        <button
          class="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close tutorial"
          @click="closeTutorial"
        >
          <icon-lucide-x class="size-4" />
        </button>
      </div>

      <!-- Description & How to Use -->
      <p class="relative mt-2 text-xs leading-relaxed text-zinc-300">{{ step.description }}</p>

      <div class="relative mt-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 leading-relaxed">
        <span class="font-bold text-rose-300">💡 How to use: </span>
        <span>{{ step.howTo }}</span>
      </div>

      <!-- Mission Action Box -->
      <div
        class="relative mt-3.5 flex items-start gap-3 rounded-xl border p-3 transition-all duration-300"
        :class="
          taskComplete
            ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
            : 'border-rose-500/30 bg-rose-950/30 text-white/90'
        "
      >
        <div
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
          :class="taskComplete ? 'bg-emerald-500 text-black' : 'bg-rose-500/20 text-rose-400'"
        >
          <icon-lucide-check v-if="taskComplete" class="size-3.5 stroke-[3]" />
          <icon-lucide-target v-else class="size-3.5" />
        </div>
        <div class="flex-1">
          <p
            class="text-[11px] font-bold tracking-wide"
            :class="taskComplete ? 'text-emerald-300' : 'text-rose-200'"
          >
            {{ taskComplete ? '🎉 Great Job! Action Complete!' : '🎯 Mission Objective' }}
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-zinc-300">{{ step.task }}</p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="relative mt-4 space-y-1.5">
        <div class="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
          <span>Overall Progress</span>
          <span class="font-mono text-rose-300 font-bold">{{ Math.round((progress / TOOL_TUTORIAL_STEPS.length) * 100) }}%</span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 transition-all duration-500 rounded-full"
            :style="{ width: `${(progress / TOOL_TUTORIAL_STEPS.length) * 100}%` }"
          />
        </div>
      </div>

      <!-- Controls -->
      <div class="relative mt-4 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button
          class="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          @click="goTo(stepIndex - 1)"
        >
          Previous
        </button>
        <div class="flex items-center gap-2">
          <button
            class="cursor-pointer rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200"
            :class="
              taskComplete
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-black hover:opacity-90 shadow-md scale-105'
                : 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
            "
            @click="goTo(stepIndex + 1)"
          >
            {{ taskComplete ? 'Next Mission →' : 'Skip →' }}
          </button>
        </div>
      </div>
    </section>
  </template>
</template>
