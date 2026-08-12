<script setup lang="ts">
</script>

<template>
  <section class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10 overflow-hidden">
    <!-- Large background typography letter glyphs for creative styling -->
    <div class="absolute -right-20 top-1/2 -translate-y-1/2 text-[15rem] font-serif font-extrabold text-white/5 pointer-events-none select-none">
      Aa
    </div>
    <div class="absolute -left-10 top-10 text-[10rem] font-mono font-extrabold text-white/5 pointer-events-none select-none">
      { }
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left: Text controls panel mock -->
        <div v-reveal class="lg:col-span-6 rounded-2xl border border-white/5 p-6 shadow-xl space-y-4 max-w-md mx-auto w-full reveal-left glass-panel">
          <div class="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <span class="text-xs font-mono font-bold text-[#f5f4f0]">Text Styling Options</span>
            <span class="px-2 py-0.5 rounded bg-[#9c2727]/20 text-[#ff5c5c] text-[8px] font-mono font-bold">ACTIVE LAYER</span>
          </div>

          <!-- Font Family -->
          <div class="space-y-1.5">
            <label class="text-[9px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Font Family</label>
            <div class="border border-white/5 px-3 py-2 rounded-lg bg-[#1c1a18] flex items-center justify-between font-mono text-xs text-[#f5f4f0]">
              <span>Geist Mono (System)</span>
              <icon-lucide-chevron-down class="size-3.5 text-[#a1a1aa]" />
            </div>
          </div>

          <!-- Grid: Weight & Size -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[9px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Weight</label>
              <div class="border border-white/5 px-3 py-2 rounded-lg bg-[#1c1a18] flex items-center justify-between text-xs text-[#f5f4f0]">
                <span>Medium</span>
                <icon-lucide-chevron-down class="size-3.5 text-[#a1a1aa]" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[9px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Size</label>
              <div class="border border-white/5 px-3 py-2 rounded-lg bg-[#1c1a18] flex items-center justify-between text-xs text-[#f5f4f0]">
                <span>16px</span>
                <icon-lucide-chevron-down class="size-3.5 text-[#a1a1aa]" />
              </div>
            </div>
          </div>

          <!-- Line Height & Letter Spacing -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[9px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Line Height</label>
              <div class="border border-white/5 px-3 py-2 rounded-lg bg-[#1c1a18] text-xs text-[#f5f4f0]">
                140%
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[9px] font-mono font-bold text-[#a1a1aa] uppercase tracking-wider">Letter Spacing</label>
              <div class="border border-white/5 px-3 py-2 rounded-lg bg-[#1c1a18] text-xs text-[#f5f4f0]">
                -0.02em
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Text Content -->
        <div v-reveal class="lg:col-span-6 space-y-6 reveal-right">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">Editorial Typography Control</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            Typography that stays in control.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Manage fonts, size hierarchy, line height adjustments, and kerning styles with sub-pixel precision. Search through catalog presets, preview styling rules, and apply them across text frames instantly.
          </p>
        </div>

      </div>
    </div>
  </section>
</template>
