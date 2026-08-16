<script setup lang="ts">
import type { ProjectRecord } from '@/app/dashboard/db'

defineProps<{
  project: ProjectRecord
  showStar?: boolean
}>()

defineEmits<{
  export: [project: ProjectRecord]
  open: [project: ProjectRecord]
  toggleStar: [project: ProjectRecord]
}>()

function formatTimeAgo(timestamp: number): string {
  const age = Date.now() - timestamp
  if (age < 60_000) return 'Just now'
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`
  const days = Math.floor(age / 86_400_000)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(timestamp).toLocaleDateString()
}
</script>

<template>
  <article
    class="group/item rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300"
  >
    <button
      type="button"
      class="aspect-[1.6] w-full bg-[#1d1d22] relative flex items-center justify-center overflow-hidden cursor-pointer border-b border-white/5"
      :aria-label="`Open ${project.name}`"
      @dblclick="$emit('open', project)"
      @click="$emit('open', project)"
    >
      <img
        v-if="project.thumbnail"
        :src="project.thumbnail"
        :alt="`${project.name} preview`"
        class="w-full h-full object-cover group-hover/item:scale-[1.02] transition-transform duration-500"
      />
      <span v-else class="text-[10px] font-mono text-[#52525b]">No Preview</span>
    </button>
    <div class="p-3 flex items-center justify-between gap-3">
      <button type="button" class="min-w-0 text-left" @click="$emit('open', project)">
        <span class="block text-xs font-bold text-[#fafafa] truncate hover:text-white">
          {{ project.name }}
        </span>
        <span class="block text-[10px] text-[#71717a]">
          Edited {{ formatTimeAgo(project.updatedAt) }}
        </span>
      </button>
      <button
        type="button"
        class="p-1 rounded text-[#a1a1aa] hover:bg-white/5 hover:text-[#fafafa] transition-colors"
        :aria-label="`Export ${project.name}`"
        @click="$emit('export', project)"
      >
        <icon-lucide-download class="size-4" />
      </button>
      <button
        v-if="showStar"
        type="button"
        class="p-1 rounded text-[#a1a1aa] hover:bg-white/5 hover:text-[#fafafa] transition-colors"
        :aria-label="project.starred ? `Unstar ${project.name}` : `Star ${project.name}`"
        @click="$emit('toggleStar', project)"
      >
        <icon-lucide-star
          class="size-4"
          :class="{ 'fill-amber-500 text-amber-500': project.starred }"
        />
      </button>
    </div>
  </article>
</template>
