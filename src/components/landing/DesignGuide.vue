<script setup lang="ts">
const callouts = [
  { title: 'Global Tokens', desc: 'Sync typography styles, spacing markers, and OkHCL canvas colors.' },
  { title: 'Instance Syncing', desc: 'Auto-update target nested children when master layers mutate.' },
  { title: 'Smart Variables', desc: 'Bind spacing numbers to borders and margin offsets.' },
  { title: 'Design Lints', desc: 'Inspect design compliance on sizing scales automatically.' }
]
</script>

<template>
  <section id="design-guide" class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <!-- Left: Editorial Text Content -->
        <div v-reveal class="lg:col-span-5 space-y-6 reveal-left">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">Design Consistency Engine</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            A design guide that thinks with you.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Stop checking static design documents. Nex Design integrates your layout principles, typography definitions, spacing tokens, and component systems directly inside the active viewport so compliance is automatic.
          </p>

          <!-- Interactive Bullet Callouts -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div v-for="call in callouts" :key="call.title" class="space-y-1.5">
              <h4 class="text-xs font-bold font-mono text-[#f5f4f0] uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#9c2727]" />
                {{ call.title }}
              </h4>
              <p class="text-xs text-[#a1a1aa] font-light leading-relaxed">
                {{ call.desc }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Design Guide UI Visual Showcase -->
        <div v-reveal class="lg:col-span-7 rounded-2xl border border-white/5 p-6 sm:p-8 shadow-xl relative overflow-hidden reveal-right glass-panel">
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          <!-- Mock Design Guide Header -->
          <div class="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div class="flex items-center gap-2">
              <div class="w-2.5 h-2.5 rounded bg-[#9c2727]" />
              <span class="text-xs font-mono font-bold text-[#f5f4f0]">DesignTokens.guide</span>
            </div>
            <span class="text-[10px] font-mono text-[#a1a1aa]">Version 1.2.0</span>
          </div>

          <!-- Token Columns -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <!-- Col 1: Colors -->
            <div class="space-y-4">
              <h4 class="text-[10px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Colors</h4>
              
              <div class="space-y-2">
                <div class="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 bg-[#1c1a18]">
                  <div class="w-5 h-5 rounded bg-[#9c2727] border border-white/10 shrink-0" />
                  <div class="text-[10px] font-mono text-[#f5f4f0]">
                    <div class="font-bold">primary-red</div>
                    <div class="text-[9px] text-[#a1a1aa]">#9c2727</div>
                  </div>
                </div>

                <div class="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 bg-[#1c1a18]">
                  <div class="w-5 h-5 rounded bg-[#121214] border border-white/10 shrink-0" />
                  <div class="text-[10px] font-mono text-[#f5f4f0]">
                    <div class="font-bold">charcoal-900</div>
                    <div class="text-[9px] text-[#a1a1aa]">#121214</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Col 2: Spacing -->
            <div class="space-y-4">
              <h4 class="text-[10px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Spacing Scale</h4>
              
              <div class="space-y-2 text-[10px] font-mono">
                <div class="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-[#1c1a18]">
                  <span>space-xs</span>
                  <span class="font-bold text-[#ff5c5c]">4px</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-[#1c1a18]">
                  <span>space-sm</span>
                  <span class="font-bold text-[#ff5c5c]">8px</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-[#1c1a18]">
                  <span>space-md</span>
                  <span class="font-bold text-[#ff5c5c]">16px</span>
                </div>
              </div>
            </div>

            <!-- Col 3: Type Scale -->
            <div class="space-y-4">
              <h4 class="text-[10px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Type Scale</h4>
              
              <div class="space-y-2 text-[10px] font-mono">
                <div class="p-2 rounded-lg border border-white/5 bg-[#1c1a18] space-y-1">
                  <div class="font-bold text-[#f5f4f0]">heading-lg</div>
                  <div class="text-[9px] text-[#a1a1aa]">Geist Sans / 24px</div>
                </div>
                <div class="p-2 rounded-lg border border-white/5 bg-[#1c1a18] space-y-1">
                  <div class="font-bold text-[#f5f4f0]">body-text</div>
                  <div class="text-[9px] text-[#a1a1aa]">Geist Mono / 12px</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
