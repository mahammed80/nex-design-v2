<script setup lang="ts">
</script>

<template>
  <section class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <!-- Left: Phone/Device mock + Prototyping Path Connections -->
        <div v-reveal class="lg:col-span-7 flex flex-col md:flex-row items-center justify-center gap-8 relative p-6 border border-white/5 rounded-2xl shadow-lg overflow-hidden reveal-left glass-panel">
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          <!-- Screen A -->
          <div class="w-40 p-4 border border-white/5 bg-[#141210] shadow-sm flex flex-col gap-3 shrink-0 relative z-10">
            <span class="text-[8px] font-mono text-slate-400">Screen A : Home</span>
            <div class="h-6 w-full bg-[#1c1a18] rounded border border-white/5 flex items-center justify-center text-[9px] text-[#a1a1aa] font-semibold">
              Dashboard View
            </div>
            <!-- Target interactive node -->
            <div class="relative h-7 w-full bg-[#9c2727] text-white text-[9px] font-mono font-bold rounded flex items-center justify-center shadow-sm">
              Launch Setup
              <!-- Hotspot marker -->
              <span class="absolute -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white animate-pulse" />
            </div>
          </div>

          <!-- Connecting Arrow Path SVG -->
          <svg class="hidden md:block w-24 h-12 text-blue-500 shrink-0 relative z-10" fill="none" viewBox="0 0 100 50">
            <path
              d="M0,25 C40,0 60,50 90,25"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="4 4"
            />
            <polygon points="90,20 100,25 90,30" fill="currentColor" />
          </svg>

          <!-- Screen B inside Phone device mockup -->
          <div class="w-48 h-80 rounded-[32px] border-4 border-[#282624] bg-[#0e0d0b] p-2.5 shadow-2xl relative shrink-0 z-10 flex flex-col justify-between overflow-hidden">
            <!-- Notch/Speaker -->
            <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-[#282624]" />

            <!-- Phone Top Status bar -->
            <div class="flex justify-between items-center text-[7px] font-mono px-2 pt-2 text-[#a1a1aa]">
              <span>9:41</span>
              <span>100%</span>
            </div>

            <!-- Screen B Content -->
            <div class="flex-1 my-auto flex flex-col items-center justify-center p-3 text-center gap-2">
              <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                ✓
              </div>
              <h4 class="text-xs font-bold text-[#f5f4f0]">Connection Setup</h4>
              <p class="text-[9px] text-[#a1a1aa] font-light leading-relaxed">
                Device successfully paired to design workspace.
              </p>
            </div>

            <!-- Home indicator -->
            <div class="w-20 h-1 bg-white/20 rounded-full mx-auto mb-1" />
          </div>
        </div>

        <!-- Right: Editorial Messaging -->
        <div v-reveal class="lg:col-span-5 space-y-6 reveal-right">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">Interactive Prototyping</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            From design to experience.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Link layouts, setup interactive triggers, and preview screen transitions instantly. Test responsive behaviors in a real phone mockup alongside the active canvas.
          </p>
          <div class="text-sm font-mono text-[#9c2727] font-semibold tracking-wider uppercase">
            Design it. Connect it. Experience it.
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
