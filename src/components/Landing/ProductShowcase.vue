<script setup lang="ts">
</script>

<template>
  <section id="showcase" class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <!-- Section Header -->
      <div v-reveal class="text-center max-w-3xl mx-auto mb-20 reveal-up">
        <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727] mb-4">Complete Canvas Environment</h2>
        <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.15]">
          Everything you need to turn ideas into interfaces.
        </h3>
        <p class="mt-4 text-[#a1a1aa] text-sm sm:text-base font-light">
          No separate screens or disconnected tools. Design layouts, define style grids, build components, and link responsive prototypes from one unified environment.
        </p>
      </div>

      <!-- Curated Product Collage -->
      <div class="relative min-h-[500px] lg:min-h-[550px] w-full mt-10 rounded-2xl overflow-hidden p-6 sm:p-12 flex flex-col justify-between glass-card">
        <!-- Dot Grid Backdrop -->
        <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        <!-- Collage Pieces -->
        <div class="relative w-full h-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
          
          <!-- Left: Desktop Application Workspace -->
          <div v-reveal class="lg:col-span-7 rounded-xl border border-white/5 bg-[#141210] shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 reveal-left">
            <!-- Mock Web/Desktop Interface Preview -->
            <div class="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-[#282624]">
              <span class="w-2 h-2 rounded-full bg-white/20" />
              <span class="w-2 h-2 rounded-full bg-white/20" />
              <span class="w-2 h-2 rounded-full bg-white/20" />
              <span class="ml-4 text-[9px] font-mono text-[#a1a1aa]">nexdesign.dev/dashboard</span>
            </div>
            
            <!-- Interface Design Preview -->
            <div class="p-6 bg-[#1c1a18] space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <div class="h-4 w-32 bg-white rounded font-bold text-xs" />
                  <div class="h-2.5 w-48 bg-white/15 rounded" />
                </div>
                <button type="button" class="h-7 px-3 rounded bg-[#eae8e4] text-[#121214] hover:bg-white text-[10px] font-mono transition-colors">Create Project</button>
              </div>

              <!-- Graphic Widgets Mockup -->
              <div class="grid grid-cols-3 gap-4 pt-2">
                <div class="p-3 border border-white/5 rounded-lg space-y-2 bg-[#282624]">
                  <div class="w-6 h-6 rounded bg-[#9c2727]/10 flex items-center justify-center text-[10px] text-[#9c2727] font-bold">1</div>
                  <div class="h-2 w-12 bg-white/15 rounded" />
                </div>
                <div class="p-3 border border-white/5 rounded-lg space-y-2 bg-[#282624]">
                  <div class="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-bold">2</div>
                  <div class="h-2 w-16 bg-white/15 rounded" />
                </div>
                <div class="p-3 border border-white/5 rounded-lg space-y-2 bg-[#282624]">
                  <div class="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-400 font-bold">3</div>
                  <div class="h-2 w-8 bg-white/15 rounded" />
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Mobile screen + Properties & Prototyping Flow Connector -->
          <div v-reveal class="lg:col-span-5 flex flex-col md:flex-row lg:flex-col gap-6 w-full reveal-right">
            
            <!-- Mobile interface preview card -->
            <div class="flex-1 rounded-xl border border-white/5 bg-[#141210] shadow-lg p-5 flex gap-4 items-center transform hover:-translate-y-1 transition-transform duration-300">
              <!-- Simulated phone screen mock -->
              <div class="w-20 h-32 rounded-lg border border-white/5 bg-[#0e0d0b] p-2 flex flex-col justify-between shrink-0 relative overflow-hidden">
                <div class="flex justify-between items-center text-[6px] font-mono text-slate-400">
                  <span>9:41</span>
                  <span>100%</span>
                </div>
                <div class="space-y-1 my-auto">
                  <div class="h-2 w-10 bg-[#9c2727] rounded" />
                  <div class="h-1.5 w-12 bg-white/20 rounded" />
                </div>
                <div class="h-3 w-full bg-white rounded-md" />
              </div>

              <!-- Explanatory metadata -->
              <div class="space-y-1.5 text-xs font-mono">
                <div class="font-bold text-[#f5f4f0]">mobile_preview.flow</div>
                <div class="text-[10px] text-[#a1a1aa]">Prototype connection linked</div>
                <div class="text-[9px] text-[#9c2727] bg-[#9c2727]/10 border border-[#9c2727]/30 px-2 py-0.5 rounded inline-block">
                  Device: iPhone 15 Pro
                </div>
              </div>
            </div>

            <!-- Floating properties + typography card collage -->
            <div class="flex-1 rounded-xl border border-white/5 bg-[#141210] shadow-lg p-5 space-y-3 transform hover:-translate-y-1 transition-transform duration-300">
              <div class="text-[10px] font-mono font-bold text-[#f5f4f0] border-b border-white/5 pb-1.5">Selected Layer: Headline</div>
              
              <div class="space-y-2">
                <div class="flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
                  <span>Family</span>
                  <span class="text-[#f5f4f0] font-semibold">Geist Mono</span>
                </div>
                <div class="flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
                  <span>Size</span>
                  <span class="text-[#f5f4f0] font-semibold">18px</span>
                </div>
                <div class="flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
                  <span>Weight</span>
                  <span class="text-[#f5f4f0] font-semibold">Semibold</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  </section>
</template>
