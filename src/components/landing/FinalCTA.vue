<script setup lang="ts">
import { useRouter } from 'vue-router'
import NexLogo from './NexLogo.vue'

const router = useRouter()

function startDesigning() {
  router.push('/dashboard')
}
</script>

<template>
  <section class="relative py-32 px-6 z-10 text-white bg-gradient-to-b from-[#121214]/60 to-[#000000]/80 backdrop-blur-[16px] overflow-hidden text-center select-none border-t border-white/10">
    <!-- Grid backdrop -->
    <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

    <div v-reveal class="max-w-4xl mx-auto relative z-10 space-y-8 flex flex-col items-center reveal-up">
      <!-- Center Emblem -->
      <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
        <NexLogo :size="36" variant="white" :show-text="false" />
      </div>

      <!-- Heading -->
      <h2 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
        Your next great<br />design starts here.
      </h2>

      <p class="text-slate-400 font-light text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
        Create, prototype, systemize, and bring your ideas to life with Nex Design. Free to start, fully collaborative, and ready in your browser.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pt-4">
        <button
          @click="startDesigning"
          type="button"
          class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-[#121214] hover:bg-[#faf9f6] font-bold font-mono text-xs tracking-widest shadow-md transition-all duration-200"
        >
          START DESIGNING FREE
        </button>
        <a
          href="#features"
          class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white font-bold font-mono text-xs tracking-widest transition-all duration-200"
        >
          EXPLORE THE PRODUCT
        </a>
      </div>
    </div>
  </section>
</template>
