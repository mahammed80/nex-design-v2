<script setup lang="ts">
import NexLogo from './NexLogo.vue'
</script>

<template>
  <footer class="relative z-10 bg-[#000000]/90 border-t border-white/5 text-[#a1a1aa] py-16 px-6">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex items-center gap-4">
        <NexLogo :size="40" variant="white" :show-text="false" />
        <div>
          <div class="text-sm font-bold text-[#f5f4f0] tracking-[0.25em] font-sans">NEX DESIGN</div>
          <div class="text-[11px] text-[#a1a1aa] mt-0.5 font-mono">High-Performance Canvas Vector Editor</div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-8 text-xs font-mono">
        <router-link to="/dashboard" class="hover:text-white transition-colors">LAUNCH EDITOR</router-link>
        <router-link to="/demo" class="hover:text-white transition-colors">DEMO</router-link>
        <a href="https://github.com" target="_blank" rel="noopener" class="hover:text-white transition-colors">GITHUB</a>
        <a href="#" class="hover:text-white transition-colors">DOCUMENTATION</a>
      </div>

      <div class="text-xs text-slate-400 font-mono">
        &copy; {{ new Date().getFullYear() }} NEX DESIGN. All rights reserved.
      </div>
    </div>
  </footer>
</template>
