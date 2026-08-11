<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isHovered = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
}

function startDesigning() {
  router.push('/dashboard')
}
</script>

<template>
  <section class="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 z-10 text-[#f5f4f0] select-none overflow-hidden">
    <!-- Luxury marble texture background with soft parallax and vignette (scoped to Hero section only) -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <img
        src="/luxury-bg.png"
        alt="Hero Luxury Background"
        class="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 transition-transform duration-500 ease-out"
        :style="{
          transform: `translate(${mouseX * 0.15}px, ${mouseY * 0.15}px) scale(1.05)`
        }"
      />
      <!-- Black vignette overlay mask just for the Hero section to enhance layout readability -->
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.95)_85%)]"
      />
      <!-- Bottom fade-out gradient to blend seamlessly into the black backdrop of the rest of the landing page -->
      <div
        class="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#000000] to-transparent"
      />
    </div>

    <!-- Hero Contents -->
    <div class="relative z-10 w-full flex flex-col items-center justify-center">
      <div
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @mousemove="handleMouseMove"
        v-reveal
        class="flex flex-col items-center text-center max-w-4xl mx-auto mb-16 relative group/hero cursor-default reveal-up"
      >
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#9c2727]/20 bg-[#9c2727]/5 text-[#9c2727] text-[10px] font-mono tracking-widest uppercase mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-[#9c2727] animate-pulse" />
        THE COLLABORATIVE DESIGN ENGINE
      </div>

      <!-- Headline with selection guide styling on hover -->
      <div class="relative px-6 py-4 transition-all duration-300">
        <!-- Interactive Spotlight Glow -->
        <div
          class="absolute -z-10 pointer-events-none rounded-full w-96 h-96 transition-opacity duration-500 opacity-0 group-hover/hero:opacity-100"
          :style="{
            left: `${mouseX - 192}px`,
            top: `${mouseY - 192}px`,
            background: 'radial-gradient(circle, rgba(156, 39, 39, 0.22) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 70%)'
          }"
        />

        <!-- Vector Guides Outline -->
        <div
          class="absolute inset-0 border border-dashed border-red-500/0 rounded-lg pointer-events-none transition-all duration-300"
          :class="{ 'border-red-500/30 bg-red-500/[0.01] scale-[1.02]': isHovered }"
        >
          <!-- Corner handles -->
          <div v-if="isHovered" class="absolute -top-1 -left-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm animate-pulse" />
          <div v-if="isHovered" class="absolute -top-1 -right-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm animate-pulse" />
          <div v-if="isHovered" class="absolute -bottom-1 -left-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm animate-pulse" />
          <div v-if="isHovered" class="absolute -bottom-1 -right-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm animate-pulse" />
          
          <!-- Bounding box info badge -->
          <div
            v-if="isHovered"
            class="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-mono tracking-wider uppercase shadow-md"
          >
            H1: Bounding Box : auto-layout
          </div>
        </div>

        <h1 class="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#f5f4f0] max-w-3xl select-none">
          Design without<br />
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-[#9c2727] via-[#c24141] to-[#ea580c] transition-all duration-500 ease-out inline-block origin-center"
            :class="{ 'scale-105 filter drop-shadow-[0_0_20px_rgba(156,39,39,0.5)]': isHovered }"
          >
            limits.
          </span>
        </h1>
      </div>

      <p class="mt-6 text-base sm:text-lg text-[#a1a1aa] max-w-xl font-light leading-relaxed">
        Nex Design is a powerful collaborative design platform built for creating interfaces, prototypes, design systems, and digital experiences in one place.
      </p>

      <div v-reveal class="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto reveal-up delay-300">
        <button
          @click="startDesigning"
          type="button"
          class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#eae8e4] text-[#121214] hover:bg-white font-bold text-xs tracking-widest font-mono shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <span>START DESIGNING FREE</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <a
          href="https://github.com/mahammed80/nex-design-v2/releases/latest"
          target="_blank"
          class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 text-white font-bold text-xs tracking-widest font-mono transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>DOWNLOAD DESKTOP</span>
        </a>

        <a
          href="#features"
          class="w-full sm:w-auto px-6 py-3.5 text-xs text-[#a1a1aa] hover:text-white font-medium transition-all duration-200 flex items-center justify-center"
        >
          Explore Features
        </a>
      </div>
    </div>

    <!-- Product Mockup Preview Container with subtle 3D tilt/depth -->
    <div v-reveal class="w-full max-w-5xl px-4 perspective-[1500px] reveal-up delay-400">
      <div
        class="w-full rounded-2xl shadow-2xl overflow-hidden transform-gpu rotate-x-[6deg] rotate-y-[-2deg] rotate-z-[1deg] hover:rotate-0 transition-transform duration-700 ease-out glass-card"
      >
        <!-- Mockup Header / Top bar -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#141210]/90 text-xs font-mono text-[#a1a1aa]">
          <!-- Window Controls -->
          <div class="flex items-center gap-1.5 w-1/4">
            <span class="w-2.5 h-2.5 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/40" />
            <span class="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40" />
            <span class="w-2.5 h-2.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40" />
          </div>

          <!-- Active tab -->
          <div class="flex items-center gap-2 px-3 py-1 rounded bg-[#282624]/60 border border-white/5 text-[10px] font-semibold text-[#f5f4f0]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#9c2727]" />
            landing-v2.nex
          </div>

          <!-- User profile avatars simulation -->
          <div class="flex items-center justify-end gap-1.5 w-1/4">
            <div class="flex -space-x-2">
              <span class="w-5 h-5 rounded-full border border-[#1c1a18] bg-blue-500 text-[8px] flex items-center justify-center font-bold text-white">JD</span>
              <span class="w-5 h-5 rounded-full border border-[#1c1a18] bg-amber-500 text-[8px] flex items-center justify-center font-bold text-white">MK</span>
            </div>
            <button
              @click="startDesigning"
              type="button"
              class="px-2.5 py-0.5 rounded bg-[#9c2727] text-white text-[9px] font-bold"
            >
              Share
            </button>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center justify-center gap-1 py-1.5 border-b border-white/5 bg-[#141210]/90 shadow-sm">
          <div class="flex items-center gap-0.5 px-2 py-0.5 rounded-lg border border-white/5">
            <!-- Tool buttons mock -->
            <button type="button" class="p-1 rounded text-[#f5f4f0] bg-[#282624]"><icon-lucide-mouse-pointer class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-frame class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-square class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-pen-tool class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-type class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-hand class="size-3.5" /></button>
            <button type="button" class="p-1 rounded text-[#a1a1aa] hover:text-white"><icon-lucide-message-square class="size-3.5" /></button>
          </div>
        </div>

        <!-- Main Workspace Area -->
        <div class="flex h-[360px] overflow-hidden">
          <!-- Left Sidebar (Layers) -->
          <aside class="w-56 border-r border-white/5 glass-panel flex flex-col text-[11px] font-mono text-[#a1a1aa] select-none">
            <div class="px-3 py-2 font-bold border-b border-white/5 text-[#f5f4f0]">Layers</div>
            <div class="flex-1 p-2 overflow-y-auto space-y-1.5">
              <div class="flex items-center gap-1.5 text-[#f5f4f0] font-semibold"><icon-lucide-frame class="size-3 text-[#9c2727]" />Hero Section</div>
              <div class="pl-4 flex items-center gap-1.5"><icon-lucide-frame class="size-3" />Badge</div>
              <div class="pl-4 flex items-center gap-1.5"><icon-lucide-type class="size-3" />Headline Text</div>
              <div class="pl-4 flex items-center gap-1.5"><icon-lucide-frame class="size-3" />CTA Buttons</div>
              <div class="pl-8 flex items-center gap-1.5"><icon-lucide-square class="size-3" />Primary Btn</div>
              <div class="pl-8 flex items-center gap-1.5"><icon-lucide-square class="size-3" />Secondary Btn</div>
              <div class="flex items-center gap-1.5"><icon-lucide-frame class="size-3 text-[#9c2727]" />Features Section</div>
              <div class="pl-4 flex items-center gap-1.5"><icon-lucide-frame class="size-3" />Bento Grid</div>
            </div>
          </aside>

          <!-- Canvas Preview -->
          <main class="flex-1 bg-[#0e0d0b] relative flex items-center justify-center overflow-hidden">
            <!-- Grid pattern backdrop -->
            <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

            <!-- Active design wireframe card -->
            <div class="relative w-80 p-5 rounded-xl border border-[#9c2727]/50 bg-[#1c1a18] shadow-md flex flex-col gap-4">
              <!-- Label -->
              <span class="absolute -top-2.5 -left-px px-2 py-0.5 rounded bg-[#9c2727] text-white text-[8px] font-bold tracking-wider font-mono">
                Frame: Active Card
              </span>

              <!-- Mock contents inside canvas card -->
              <div class="w-10 h-10 rounded-lg bg-[#9c2727]/10 flex items-center justify-center text-[#9c2727] font-extrabold text-sm">
                N
              </div>
              <div class="space-y-1.5">
                <div class="h-3 w-3/4 bg-white/15 rounded" />
                <div class="h-2 w-1/2 bg-white/10 rounded" />
              </div>

              <!-- Alignment guide simulation -->
              <div class="absolute -left-12 top-1/2 w-12 border-t border-dashed border-red-500" />
              <div class="absolute -right-12 top-1/2 w-12 border-t border-dashed border-red-500" />
              <div class="absolute left-1/2 -top-12 h-12 border-l border-dashed border-red-500" />
              <!-- Spacing badge -->
              <span class="absolute -left-8 top-1/2 -translate-y-1/2 px-1 rounded bg-red-500 text-white text-[8px] font-mono">
                48
              </span>

              <!-- Target handles -->
              <div class="absolute -top-1 -left-1 w-2 h-2 bg-white border border-[#9c2727]" />
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-white border border-[#9c2727]" />
              <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-[#9c2727]" />
              <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-[#9c2727]" />
            </div>

            <!-- Custom Collaborator Cursors -->
            <div class="absolute top-1/3 left-1/4 pointer-events-none select-none flex items-center gap-1">
              <svg class="w-4 h-4 text-blue-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4l5 16 3-6 6-3z" />
              </svg>
              <span class="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[8px] font-mono font-semibold">JD</span>
            </div>

            <div class="absolute bottom-1/4 right-1/3 pointer-events-none select-none flex items-center gap-1">
              <svg class="w-4 h-4 text-amber-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4l5 16 3-6 6-3z" />
              </svg>
              <span class="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-mono font-semibold">MK</span>
            </div>
          </main>

          <!-- Right Sidebar (Properties) -->
          <aside class="w-60 border-l border-white/5 glass-panel flex flex-col text-[11px] font-mono text-[#a1a1aa] select-none">
            <div class="px-3 py-2 font-bold border-b border-white/5 text-[#f5f4f0]">Properties</div>
            <div class="flex-1 p-3 overflow-y-auto space-y-4">
              <!-- Alignment section -->
              <div class="space-y-1.5">
                <div class="text-[9px] font-bold text-[#f5f4f0] uppercase tracking-wider">Align</div>
                <div class="grid grid-cols-6 gap-1">
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-align-left class="size-3" /></div>
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-align-center class="size-3" /></div>
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-align-right class="size-3" /></div>
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-align-vertical-distribute-center class="size-3" /></div>
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-align-horizontal-distribute-center class="size-3" /></div>
                  <div class="h-6 rounded border border-white/5 bg-[#181614] flex items-center justify-center text-xs"><icon-lucide-layout-grid class="size-3" /></div>
                </div>
              </div>

              <!-- Dimensions -->
              <div class="space-y-1.5">
                <div class="text-[9px] font-bold text-[#f5f4f0] uppercase tracking-wider">Layout</div>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div class="flex items-center gap-1.5 border border-white/5 px-2 py-1 rounded bg-[#181614]">
                    <span class="text-[#a1a1aa]">W</span>
                    <span class="font-bold text-[#f5f4f0]">320</span>
                  </div>
                  <div class="flex items-center gap-1.5 border border-white/5 px-2 py-1 rounded bg-[#181614]">
                    <span class="text-[#a1a1aa]">H</span>
                    <span class="font-bold text-[#f5f4f0]">180</span>
                  </div>
                </div>
              </div>

              <!-- Typography -->
              <div class="space-y-1.5">
                <div class="text-[9px] font-bold text-[#f5f4f0] uppercase tracking-wider">Text</div>
                <div class="border border-white/5 px-2.5 py-1.5 rounded bg-[#181614] font-semibold text-[#f5f4f0] flex items-center justify-between">
                  <span>Geist Sans</span>
                  <icon-lucide-chevron-down class="size-3 text-[#a1a1aa]" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="border border-white/5 px-2 py-1 rounded bg-[#181614] text-[#f5f4f0]">14px</div>
                  <div class="border border-white/5 px-2 py-1 rounded bg-[#181614] text-[#f5f4f0]">Medium</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
  </section>
</template>
