<script setup lang="ts">
import type { ProjectRecord } from '@/app/dashboard/db'
import DashboardProjectCard from './DashboardProjectCard.vue'

defineProps<{
  groups: { today: ProjectRecord[]; yesterday: ProjectRecord[]; earlier: ProjectRecord[] }
}>()

defineEmits<{ export: [project: ProjectRecord]; open: [project: ProjectRecord] }>()

const sections = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'earlier', label: 'Earlier' }
] as const
</script>

<template>
  <div class="space-y-8">
    <template v-for="section in sections" :key="section.key">
      <section v-if="groups[section.key].length > 0" class="space-y-4">
        <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wider">
          {{ section.label }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DashboardProjectCard
            v-for="project in groups[section.key]"
            :key="project.id"
            :project="project"
            @export="$emit('export', $event)"
            @open="$emit('open', $event)"
          />
        </div>
      </section>
    </template>
  </div>
</template>
