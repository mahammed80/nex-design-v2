<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import NexLogo from './NexLogo.vue'

const router = useRouter()
const isScrolled = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function navigateToEditor() {
  router.push('/dashboard')
}
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-[100] transition-all duration-300 select-none animate-slide-down"
    :class="[
      isScrolled
        ? 'py-3 bg-[#000000]/50 border-b border-white/5 backdrop-blur-md shadow-sm'
        : 'py-6 bg-transparent border-b border-transparent'
    ]"
  >
    <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <!-- Left: Logo -->
      <router-link to="/" class="flex items-center gap-3 group">
        <NexLogo :size="28" variant="white" :show-text="false" />
        <span class="font-bold text-sm tracking-[0.25em] text-[#f5f4f0] font-sans">NEX DESIGN</span>
      </router-link>

      <!-- Middle: Navigation Links -->
      <nav class="hidden md:flex items-center gap-8 text-[11px] font-mono tracking-widest text-[#a1a1aa]">
        <a href="#features" class="hover:text-white transition-colors">PRODUCT</a>
        <a href="#showcase" class="hover:text-white transition-colors">FEATURES</a>
        <a href="#design-guide" class="hover:text-white transition-colors">DESIGN GUIDE</a>
        <a
          href="https://github.com/mahammed80/nex-design-v2/releases/latest"
          target="_blank"
          class="hover:text-white transition-colors flex items-center gap-1"
        >
          <span>DOWNLOAD</span>
          <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
        <a href="#pricing" class="hover:text-white transition-colors">PRICING</a>
      </nav>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-4">
        <button
          @click="navigateToEditor"
          type="button"
          class="text-[11px] font-mono text-[#a1a1aa] hover:text-white transition-colors"
        >
          Log in
        </button>
        <button
          @click="navigateToEditor"
          type="button"
          class="text-xs font-mono font-bold px-4 py-2 rounded-lg bg-[#eae8e4] text-[#121214] hover:bg-white transition-all duration-200 shadow-sm"
        >
          Start Designing
        </button>
      </div>
    </div>
  </header>
</template>
