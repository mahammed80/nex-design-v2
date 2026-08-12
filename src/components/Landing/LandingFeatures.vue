<script setup lang="ts">
const features = [
  {
    title: 'Powerful Canvas',
    desc: 'Design interfaces with sub-pixel precision and GPU speed.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    tag: 'CANVAS'
  },
  {
    title: 'Smart Design Guide',
    desc: 'Keep your entire design system and spacing definitions consistent.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    tag: 'STANDARDS'
  },
  {
    title: 'Prototyping',
    desc: 'Turn static frames into interactive flows and device previews.',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    tag: 'FLOWS'
  },
  {
    title: 'Components',
    desc: 'Build reusable asset libraries and variants with instant instance sync.',
    icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
    tag: 'LIBRARY'
  },
  {
    title: 'Responsive Design',
    desc: 'Stretch and constrain elements layout rules for any viewport size.',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    tag: 'RESPONSIVE'
  },
  {
    title: 'Developer Handoff',
    desc: 'Expose code specifications, layout properties, and measurements.',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    tag: 'HANDOFF'
  },
  {
    title: 'Typography',
    desc: 'Complete control over type sizes, families, scales, and letter styling.',
    icon: 'M4 6h16M4 12h16M4 18h16',
    tag: 'FONTS'
  },
  {
    title: 'Collaboration',
    desc: 'Work in real-time on a single vector canvas with shared cursors.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    tag: 'MULTIPLAYER'
  }
]
</script>

<template>
  <section id="features" class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div v-reveal class="text-center max-w-3xl mx-auto mb-20 reveal-up">
        <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727] mb-4">Core Engine Features</h2>
        <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0]">
          Everything you need to succeed.
        </h3>
        <p class="mt-4 text-[#a1a1aa] text-sm sm:text-base font-light">
          A modern professional design workspace engineered with specialized sub-pixel canvas rendering tools.
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="(feat, i) in features"
          :key="feat.title"
          v-reveal
          class="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-[#9c2727]/30 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between reveal-scale"
          :class="`delay-${(i % 4) * 100}`"
        >
          <div class="space-y-4">
            <div class="p-2.5 w-fit rounded-lg bg-[#1c1a18] border border-white/5 text-[#a1a1aa] group-hover:text-white group-hover:border-white/10 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feat.icon" />
              </svg>
            </div>
            
            <div>
              <span class="text-[8px] font-mono tracking-widest text-[#a1a1aa] uppercase">{{ feat.tag }}</span>
              <h4 class="text-sm font-bold text-[#f5f4f0] mt-1 group-hover:text-white transition-colors">
                {{ feat.title }}
              </h4>
              <p class="mt-2 text-xs text-[#a1a1aa] font-light leading-relaxed">
                {{ feat.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
