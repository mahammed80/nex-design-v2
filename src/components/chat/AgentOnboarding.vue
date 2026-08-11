<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'

const dismissed = useLocalStorage('nex-design:agent-onboarding-dismissed', false)
</script>

<template>
  <div
    v-if="!dismissed"
    class="mx-auto w-full max-w-64 rounded-lg border border-border bg-panel p-3 text-left"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-semibold text-surface">Design agent workflow</p>
      <button
        class="text-muted hover:text-surface"
        aria-label="Dismiss onboarding"
        @click="dismissed = true"
      >
        <icon-lucide-x class="size-3" />
      </button>
    </div>
    <ol class="mt-2 space-y-1 text-[11px] text-muted">
      <li>1. Describe the result and audience.</li>
      <li>2. Select a frame when you want a focused edit.</li>
      <li>3. For URL studies, explicitly confirm ownership or permission.</li>
      <li>4. Review the audit, then undo any change you do not want.</li>
    </ol>
  </div>
</template>
