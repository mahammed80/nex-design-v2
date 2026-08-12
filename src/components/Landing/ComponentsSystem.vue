<script setup lang="ts">
import { ref } from 'vue'

const isCrimsonTheme = ref(true)

function toggleTheme() {
  isCrimsonTheme.value = !isCrimsonTheme.value
}
</script>

<template>
  <section class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <!-- Main Grid: Text on Left, Simulator on Right -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left: Text Explanations -->
        <div v-reveal class="lg:col-span-5 space-y-6 reveal-left">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">Modular Design Tokens</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            Build once. Design everywhere.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Create unified component packages for buttons, inputs, icons, and cards. Change parameters on the master node and watch instances adapt across your workspace instantly.
          </p>

          <button
            @click="toggleTheme"
            type="button"
            class="px-4 py-2 border border-white/5 hover:border-white/10 rounded-lg bg-[#1c1a18] text-xs font-mono text-[#f5f4f0] shadow-sm flex items-center gap-2"
          >
            <span>Simulate Master Update:</span>
            <span
              class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white transition-colors"
              :class="isCrimsonTheme ? 'bg-[#f5c2c2] text-black' : 'bg-blue-600 text-white'"
            >
              {{ isCrimsonTheme ? 'Victoria Pink' : 'Blue Accent' }}
            </span>
          </button>
        </div>

        <!-- Right: Interactive Master Component Simulator -->
        <div v-reveal class="lg:col-span-7 rounded-2xl border border-white/5 p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between glass-panel reveal-right">
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          <div class="space-y-6">
            <!-- Master component card -->
            <div class="p-5 rounded-xl border border-dashed border-[#9747ff]/60 bg-[#1c1a18] relative">
              <span class="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-[#9747ff] text-white text-[8px] font-bold tracking-wider font-mono uppercase">
                Master Component
              </span>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors duration-500 font-extrabold text-base"
                    :class="isCrimsonTheme ? 'bg-[#f5c2c2] text-black shadow-lg shadow-[#f5c2c2]/20' : 'bg-blue-600 text-white'"
                  >
                    ✓
                  </div>
                  <div class="text-xs font-mono text-[#f5f4f0] space-y-0.5">
                    <div class="font-bold">PrimaryBtn</div>
                    <div class="text-slate-400 text-[10px]">Variant: Default</div>
                  </div>
                </div>
                <span class="text-[10px] font-mono text-[#9747ff] font-semibold">Ready</span>
              </div>
            </div>

            <!-- Component Instance list -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Instance 1 -->
              <div class="p-5 rounded-xl border border-white/5 bg-[#141210] relative">
                <span class="absolute -top-2 left-2 text-[7px] font-mono text-[#a1a1aa] uppercase">Instance 01</span>
                <button
                  type="button"
                  class="w-full py-3 rounded-lg font-mono text-[11px] font-semibold tracking-wider transition-colors duration-500"
                  :class="isCrimsonTheme ? 'bg-[#f5c2c2] text-black' : 'bg-blue-600 text-white'"
                >
                  Confirm Setup
                </button>
              </div>

              <!-- Instance 2 -->
              <div class="p-5 rounded-xl border border-white/5 bg-[#141210] relative">
                <span class="absolute -top-2 left-2 text-[7px] font-mono text-[#a1a1aa] uppercase">Instance 02</span>
                <button
                  type="button"
                  class="w-full py-3 rounded-lg font-mono text-[11px] font-semibold tracking-wider transition-colors duration-500"
                  :class="isCrimsonTheme ? 'bg-[#f5c2c2] text-black' : 'bg-blue-600 text-white'"
                >
                  Save Progress
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Full-Width Luxury Style Guide Board (Bigger & Detailed) -->
      <div v-reveal class="mt-12 rounded-3xl border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden glass-panel group/guide reveal-up">
        <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-45 pointer-events-none" />

        <div class="space-y-6 relative z-10">
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-white/5">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#f5c2c2] animate-ping" />
              <h4 class="text-xs font-mono text-[#ff5c5c] font-bold tracking-[0.2em] uppercase">NEX DESIGN // LUXURY STYLE GUIDE (VICTORIA PINK THEME)</h4>
            </div>
            <span class="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-[#a1a1aa] uppercase">Active Brand Specification</span>
          </div>

          <!-- Split layout: Big Image Left, In-Depth Spec Sheet Right -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <!-- Left: Expanded Brand Image Mockup -->
            <div class="lg:col-span-5 relative aspect-[4/5] lg:aspect-auto w-full min-h-[350px] rounded-xl overflow-hidden border border-white/10 bg-[#0e0d0b]">
              <img
                src="/style-guide.png"
                alt="Victoria Pink Brand Identity"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover/guide:scale-105"
              />
              
              <!-- Bounding Box Guides overlay on hover -->
              <div class="absolute inset-0 border border-[#f5c2c2]/0 group-hover/guide:border-[#f5c2c2]/40 transition-all duration-300 pointer-events-none">
                <div class="absolute -top-1 -left-1 w-2 h-2 bg-[#0c0a09] border border-[#f5c2c2] rounded-sm" />
                <div class="absolute -top-1 -right-1 w-2 h-2 bg-[#0c0a09] border border-[#f5c2c2] rounded-sm" />
                <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-[#0c0a09] border border-[#f5c2c2] rounded-sm" />
                <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-[#0c0a09] border border-[#f5c2c2] rounded-sm" />
                
                <span class="absolute bottom-3 left-3 bg-[#f5c2c2] text-black text-[8px] font-mono px-1.5 py-0.5 rounded font-bold">
                  480 × 600
                </span>
              </div>
            </div>

            <!-- Right: In-Depth Specifications & Tokens -->
            <div class="lg:col-span-7 flex flex-col justify-between text-xs font-mono space-y-6 bg-white/[0.02] border border-white/5 rounded-xl p-6">
              
              <!-- Spec Section 1: Brand Concept -->
              <div class="space-y-2">
                <div class="text-[10px] text-[#ff5c5c] font-bold uppercase tracking-widest">Brand Aesthetics & Concept</div>
                <p class="text-[11px] text-[#a1a1aa] leading-relaxed font-sans font-light">
                  Inspired by the glamorous, high-end editorial look of Victoria's Secret. The design guidelines incorporate soft pastel pink glamour, elegant rose gold overlays, and deep charcoal backing to ensure premium brand positioning and sensual fashion appeal.
                </p>
              </div>

              <!-- Spec Section 2: Tokens details -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <!-- Color Tokens -->
                <div class="space-y-2.5">
                  <div class="text-[9px] text-[#a1a1aa] uppercase tracking-wider border-b border-white/5 pb-1">Color Palette</div>
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-2">
                      <span class="w-3.5 h-3.5 rounded bg-[#f5c2c2] border border-white/10" />
                      <span class="text-[10px] text-white">#F5C2C2 (Pink)</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-3.5 h-3.5 rounded bg-[#e5a8a8] border border-white/10" />
                      <span class="text-[10px] text-white">#E5A8A8 (Rose)</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-3.5 h-3.5 rounded bg-[#faf6f6]" />
                      <span class="text-[10px] text-white">#FAF6F6 (Cream)</span>
                    </div>
                  </div>
                </div>

                <!-- Typography Scale -->
                <div class="space-y-2.5">
                  <div class="text-[9px] text-[#a1a1aa] uppercase tracking-wider border-b border-white/5 pb-1">Typography Spec</div>
                  <div class="space-y-1 text-[10px] text-white leading-normal">
                    <div class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f5c2c2] to-[#e5a8a8]">Playfair Serif</div>
                    <div class="text-slate-400 text-[9px]">Display, Headers: 48px/64px</div>
                    <div class="font-bold pt-1">Inter Sans</div>
                    <div class="text-slate-400 text-[9px]">UI, Body, Labels: 13px/14px</div>
                  </div>
                </div>

                <!-- Spacing Scales -->
                <div class="space-y-2.5">
                  <div class="text-[9px] text-[#a1a1aa] uppercase tracking-wider border-b border-white/5 pb-1">Spacing Variables</div>
                  <div class="space-y-1 text-[10px] text-white">
                    <div>GAP-08: <span class="text-amber-500">8px (Micro)</span></div>
                    <div>GAP-16: <span class="text-amber-500">16px (Grid)</span></div>
                    <div>GAP-32: <span class="text-amber-500">32px (Layout)</span></div>
                  </div>
                </div>
              </div>

              <!-- Spec Section 3: Verification & Exporter details -->
              <div class="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-slate-400">
                <div class="flex items-center gap-2">
                  <span>EXPORTS: SVG, PNG (3X scale)</span>
                  <span class="text-white/20">|</span>
                  <span>COMPLIANCE: ACTIVE</span>
                </div>
                <span class="text-emerald-400 font-bold tracking-widest flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ✓ BRAND COMPLIANT (100%)
                </span>
              </div>

            </div>
          </div>

          <!-- Bottom Label -->
          <div class="text-[9px] font-mono text-[#a1a1aa] pt-2 flex items-center justify-between">
            <span>victoria_pink_style_guide.fig</span>
            <span class="text-white/40">2.4 MB (vector data serialized)</span>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
