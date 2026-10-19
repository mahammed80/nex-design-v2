<script setup lang="ts">
import type { ToolState } from './tool-parts'

const { state } = defineProps<{ state: ToolState }>()
</script>

<template>
  <div
    class="flex size-4 shrink-0 items-center justify-center rounded-full"
    :class="{
      'bg-accent/20 text-accent': state === 'pending',
      'bg-green-500/20 text-green-400': state === 'done',
      'bg-red-500/20 text-red-400': state === 'error'
    }"
  >
    <icon-lucide-loader-circle v-if="state === 'pending'" class="size-3 animate-spin" />
    <icon-lucide-check v-else-if="state === 'done'" class="size-3" />
    <icon-lucide-triangle-alert v-else class="size-3" />
  </div>
</template>
