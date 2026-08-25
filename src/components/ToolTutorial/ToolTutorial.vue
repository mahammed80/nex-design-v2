<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener, useLocalStorage } from '@vueuse/core'

import type { SceneNode } from '@nex-design/core/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import { TOOL_TUTORIAL_STEPS, tutorialTargetSelector } from '@/app/tutorial/tools'

const editor = useEditorStore()
const completed = useLocalStorage<string[]>('nex-design:completed-tool-tutorials', [])
const open = ref(false)
const stepIndex = ref(0)
const taskComplete = ref(false)
const targetRect = ref<DOMRect | null>(null)

const step = computed(() => TOOL_TUTORIAL_STEPS[stepIndex.value])
const progress = computed(() => completed.value.length)
const cardStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return { left: '50%', bottom: '76px', transform: 'translateX(-50%)' }
  return {
    left: `${Math.min(Math.max(rect.left + rect.width / 2, 176), window.innerWidth - 176)}px`,
    bottom: `${Math.max(window.innerHeight - rect.top + 14, 76)}px`,
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
}

function matchesCreatedNode(node: SceneNode) {
  const completion = step.value.completion
  return completion.kind === 'create' && completion.nodeType === node.type
}

const unbindCreated = editor.onEditorEvent('node:created', (node) => {
  if (open.value && matchesCreatedNode(node)) markComplete()
})
const unbindUpdated = editor.onEditorEvent('node:updated', (_id, changes) => {
  if (!open.value || step.value.completion.kind !== 'move') return
  if ('x' in changes || 'y' in changes) markComplete()
})
const unbindViewport = editor.onEditorEvent('viewport:changed', () => {
  if (open.value && step.value.completion.kind === 'pan') markComplete()
})

function goTo(index: number) {
  stepIndex.value = (index + TOOL_TUTORIAL_STEPS.length) % TOOL_TUTORIAL_STEPS.length
  activateStep()
}

function closeTutorial() {
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
  unbindCreated()
  unbindUpdated()
  unbindViewport()
})
</script>

<template>
  <button
    v-if="!open"
    data-test-id="tool-tutorial-open"
    class="fixed right-4 bottom-4 z-40 flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted shadow-lg transition-colors hover:bg-hover hover:text-surface"
    title="Learn the editor tools"
    aria-label="Open tool tutorials"
    @click="openTutorial"
  >
    <icon-lucide-graduation-cap class="size-4.5" />
  </button>

  <template v-else>
    <div
      class="pointer-events-none fixed z-40 rounded-xl border-2 border-accent ring-4 ring-accent/20 transition-all"
      :style="highlightStyle"
    />
    <section
      data-test-id="tool-tutorial-card"
      class="fixed z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-panel p-4 text-left shadow-2xl"
      :style="cardStyle"
      aria-live="polite"
    >
      <div
        class="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-r border-b border-border bg-panel"
      />
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-semibold tracking-wide text-accent uppercase">
            Tool {{ stepIndex + 1 }} of {{ TOOL_TUTORIAL_STEPS.length }}
          </p>
          <h2 class="mt-1 text-sm font-semibold text-surface">{{ step.title }}</h2>
        </div>
        <button
          class="cursor-pointer rounded p-1 text-muted hover:bg-hover hover:text-surface"
          aria-label="Close tutorial"
          @click="closeTutorial"
        >
          <icon-lucide-x class="size-3.5" />
        </button>
      </div>

      <p class="mt-2 text-xs leading-5 text-muted">{{ step.description }}</p>
      <div
        class="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5"
        :class="
          taskComplete ? 'border-green-500/40 bg-green-500/10' : 'border-accent/30 bg-accent/10'
        "
      >
        <icon-lucide-circle-check
          v-if="taskComplete"
          class="mt-0.5 size-4 shrink-0 text-green-400"
        />
        <icon-lucide-mouse-pointer-2 v-else class="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <p class="text-[11px] font-semibold text-surface">
            {{ taskComplete ? 'Practice complete' : 'Try it now' }}
          </p>
          <p class="mt-0.5 text-[11px] leading-4 text-muted">{{ step.task }}</p>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2">
        <span class="text-[10px] text-muted"
          >{{ progress }} / {{ TOOL_TUTORIAL_STEPS.length }} learned</span
        >
        <div class="flex gap-1.5">
          <button
            class="cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
            @click="goTo(stepIndex - 1)"
          >
            Back
          </button>
          <button
            class="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            @click="goTo(stepIndex + 1)"
          >
            {{ taskComplete ? 'Next tool' : 'Skip' }}
          </button>
        </div>
      </div>
    </section>
  </template>
</template>
