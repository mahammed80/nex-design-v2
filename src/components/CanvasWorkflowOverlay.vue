<script setup lang="ts">
import { computed } from 'vue'

const {
  activePhase = 'idle',
  targetNodeName = 'Frame 1',
  aiModelName = 'Poolside Laguna S 2.1',
  isExecuting = false
} = defineProps<{
  activePhase?: 'skeleton' | 'content' | 'refine' | 'idle'
  targetNodeName?: string
  aiModelName?: string
  isExecuting?: boolean
}>()

interface WorkflowStep {
  id: string
  name: string
  phase: 'skeleton' | 'content' | 'refine' | 'idle'
  status: 'completed' | 'active' | 'pending'
}

function getStep1Status(phase: string): 'completed' | 'active' | 'pending' {
  if (phase === 'skeleton') return 'active'
  if (phase === 'content' || phase === 'refine') return 'completed'
  return 'pending'
}

function getStep2Status(phase: string): 'completed' | 'active' | 'pending' {
  if (phase === 'content') return 'active'
  if (phase === 'refine') return 'completed'
  return 'pending'
}

const steps = computed<WorkflowStep[]>(() => [
  {
    id: 'step-1',
    name: '1. Frame Skeleton',
    phase: 'skeleton',
    status: getStep1Status(activePhase)
  },
  {
    id: 'step-2',
    name: '2. Content Fill',
    phase: 'content',
    status: getStep2Status(activePhase)
  },
  {
    id: 'step-3',
    name: '3. Token Refine & Audit',
    phase: 'refine',
    status: activePhase === 'refine' ? 'active' : 'pending'
  }
])
</script>

<template>
  <div
    v-if="isExecuting"
    class="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center space-y-2 animate-fade-in"
  >
    <!-- Live Agent Workflow HUD -->
    <div
      class="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-rose-500/30 bg-[#18181b]/90 backdrop-blur-md shadow-2xl text-xs text-white"
    >
      <!-- Pulsing AI Indicator -->
      <div class="relative flex items-center justify-center size-7 rounded-xl bg-rose-600/30 border border-rose-500/40 text-rose-300">
        <span class="absolute size-3 rounded-full bg-rose-500 animate-ping opacity-75" />
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      <!-- Agent Status & Step Pills -->
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-bold text-[#fafafa]">AI Agent Workflow ({{ targetNodeName }})</span>
          <span class="text-[10px] font-mono text-[#a1a1aa]">({{ aiModelName }})</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            v-for="step in steps"
            :key="step.id"
            class="px-2 py-0.5 rounded-md text-[10px] font-medium transition"
            :class="{
              'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30': step.status === 'active',
              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30': step.status === 'completed',
              'bg-white/5 text-[#71717a]': step.status === 'pending'
            }"
          >
            {{ step.name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
