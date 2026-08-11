<script setup lang="ts">
</script>

<template>
  <section class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left: Collaboration mockup -->
        <div v-reveal class="lg:col-span-7 rounded-2xl border border-white/5 p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col gap-6 reveal-left glass-panel">
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          <!-- Canvas layout card with cursors -->
          <div class="relative w-full h-44 bg-[#1c1a18]/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            <span class="text-[8px] font-mono text-slate-400">Team Canvas</span>
            
            <div class="space-y-1.5 my-auto max-w-xs">
              <div class="h-4 w-3/4 bg-white/20 rounded" />
              <div class="h-2.5 w-1/2 bg-white/10 rounded" />
            </div>

            <!-- Comment bubble -->
            <div class="absolute top-4 right-4 p-2.5 rounded-lg border border-white/5 bg-[#282624]/90 shadow-sm max-w-[150px] space-y-1 text-[9px] z-10">
              <div class="flex items-center gap-1.5 font-bold text-[#f5f4f0]">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
                JD:
              </div>
              <p class="text-[#a1a1aa] font-light leading-snug">Let's refine this alignment.</p>
            </div>

            <!-- Cursors -->
            <div class="absolute top-1/2 left-1/3 flex items-center gap-1 pointer-events-none select-none">
              <svg class="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4l5 16 3-6 6-3z" />
              </svg>
              <span class="px-1 py-0.5 rounded bg-blue-500 text-white text-[7px] font-mono font-bold">JD</span>
            </div>

            <div class="absolute bottom-4 left-1/2 flex items-center gap-1 pointer-events-none select-none">
              <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4l5 16 3-6 6-3z" />
              </svg>
              <span class="px-1 py-0.5 rounded bg-amber-500 text-white text-[7px] font-mono font-bold">MK</span>
            </div>
          </div>
        </div>

        <!-- Right: Text messaging -->
        <div v-reveal class="lg:col-span-5 space-y-6 reveal-right">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">Teamwork Workspace</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            A workspace built for teams.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Co-design layouts in real-time, leave visual comments on canvas nodes, resolve review points, and share code specifications instantly with engineering peers.
          </p>
        </div>

      </div>
    </div>
  </section>
</template>
