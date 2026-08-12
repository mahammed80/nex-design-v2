<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(e: MouseEvent) {
  mouseX.value = (e.clientX / window.innerWidth - 0.5) * 30
  mouseY.value = (e.clientY / window.innerHeight - 0.5) * 30
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-[#000000]">
    <!-- Ambient liquid marble glows - softened for editorial theme -->
    <div
      class="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-25 mix-blend-screen transition-transform duration-700 ease-out"
      :style="{
        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.4) 0%, rgba(251, 191, 36, 0.2) 50%, transparent 80%)',
        transform: `translate(${mouseX * 0.8}px, ${mouseY * 0.8}px)`
      }"
    />
    <div
      class="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[160px] opacity-20 mix-blend-screen transition-transform duration-700 ease-out"
      :style="{
        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 80%)',
        transform: `translate(${-mouseX * 0.8}px, ${-mouseY * 0.8}px)`
      }"
    />

    <!-- Artistic SVG fluid wave curves matching inspiration artwork (editorial light version) -->
    <svg
      class="absolute inset-0 w-full h-full opacity-[0.16] transition-transform duration-500 ease-out scale-105"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      :style="{ transform: `translate(${mouseX * 0.2}px, ${mouseY * 0.2}px)` }"
    >
      <defs>
        <linearGradient id="gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D97706" stop-opacity="0.8" />
          <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#B45309" stop-opacity="0.8" />
        </linearGradient>
        <linearGradient id="blue-wave" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#1E3A8A" stop-opacity="0.05" />
        </linearGradient>
      </defs>

      <!-- Organic golden ribbon waves -->
      <path
        d="M-100,200 C300,50 600,450 1100,100 C1300,-50 1500,200 1600,300"
        fill="none"
        stroke="url(#gold-stroke)"
        stroke-width="1.5"
      />
      <path
        d="M-100,700 C400,900 700,500 1200,850 C1400,1000 1550,750 1650,650"
        fill="none"
        stroke="url(#gold-stroke)"
        stroke-width="2"
      />
      <path
        d="M-50,850 C300,600 800,950 1300,600 C1500,450 1600,550 1700,500"
        fill="none"
        stroke="url(#gold-stroke)"
        stroke-width="1"
      />

      <!-- Deep ocean marble wave curves -->
      <path
        d="M-100,0 C200,300 500,100 900,400 C1300,700 1500,300 1600,200 L1600,900 L-100,900 Z"
        fill="url(#blue-wave)"
      />
    </svg>

    <!-- Grain/Noise subtle texture overlay -->
    <div
      class="absolute inset-0 opacity-[0.02] pointer-events-none"
      style="background-image: radial-gradient(#000 1px, transparent 0); background-size: 24px 24px;"
    />
  </div>
</template>
