<script setup lang="ts">
defineEmits<{ create: [] }>()

const templates = [
  {
    preview: 'SaaS Dashboard',
    name: 'SaaS Dashboard',
    description: 'Start with standard components',
    background: 'bg-[#1d1c1a]'
  },
  {
    preview: 'Landing Page',
    name: 'Landing Page',
    description: 'Start with pricing and CTA sections',
    background: 'bg-[#1c1c1f]'
  },
  {
    preview: 'Mobile App Mockup',
    name: 'Mobile App Screen',
    description: 'Mobile layout and UI modules',
    background: 'bg-[#1a1a1f]'
  },
  {
    preview: 'Admin Template',
    name: 'Admin Portal',
    description: 'Side-nav layout and tabular records',
    background: 'bg-[#1a1c1d]'
  }
]
</script>

<template>
  <section class="space-y-4 pt-4 border-t border-white/5">
    <h3 class="text-base font-bold text-[#fafafa]">Templates Library</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <button
        v-for="template in templates"
        :key="template.name"
        type="button"
        class="group/item text-left rounded-xl border border-white/5 bg-[#121215] overflow-hidden hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
        @click="$emit('create')"
      >
        <span
          class="aspect-[1.8] border-b border-white/5 flex items-center justify-center text-[10px] font-mono text-[#52525b]"
          :class="template.background"
        >
          {{ template.preview }}
        </span>
        <span class="block p-3">
          <span class="block text-xs font-semibold text-[#fafafa] truncate">{{
            template.name
          }}</span>
          <span class="block text-[9px] text-[#71717a]">{{ template.description }}</span>
        </span>
      </button>
    </div>
  </section>
</template>
