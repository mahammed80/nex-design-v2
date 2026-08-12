<script setup lang="ts">
import NexLogo from './NexLogo.vue'

const nodes = [
  { name: 'Design Canvas', x: '50%', y: '15%' },
  { name: 'Design Systems', x: '80%', y: '35%' },
  { name: 'Prototyping', x: '70%', y: '75%' },
  { name: 'Collaboration', x: '30%', y: '75%' },
  { name: 'Dev Handoff', x: '20%', y: '35%' }
]
</script>

<template>
  <section class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Left: Text content -->
        <div v-reveal class="lg:col-span-5 space-y-6 reveal-left">
          <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727]">The Unified Ecosystem</h2>
          <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.1]">
            Not just another design tool.
          </h3>
          <p class="text-[#a1a1aa] font-light text-sm sm:text-base leading-relaxed">
            Nex Design consolidates your fragmented tools into a single source of truth. Build and scale vectors, document component libraries, link prototype flows, collaborate with colleagues, and check off handoff specs in one place.
          </p>
        </div>

        <!-- Right: Connected ecosystem hub diagram mockup -->
        <div v-reveal class="lg:col-span-7 h-[360px] rounded-2xl border border-white/5 shadow-xl relative overflow-hidden flex items-center justify-center p-6 reveal-right glass-panel">
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          <!-- Center Node (Core) -->
          <div class="relative z-10 w-20 h-20 rounded-2xl bg-[#1c1a18] border border-white/10 shadow-md flex items-center justify-center">
            <NexLogo :size="40" variant="white" :show-text="false" />
          </div>

          <!-- Connecting Lines SVG -->
          <svg class="absolute inset-0 w-full h-full text-[#9c2727]/30" xmlns="http://www.w3.org/2000/svg">
            <!-- Connect all nodes to center -->
            <line x1="50%" y1="50%" x2="50%" y2="15%" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
            <line x1="50%" y1="50%" x2="80%" y2="35%" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
            <line x1="50%" y1="50%" x2="70%" y2="75%" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
            <line x1="50%" y1="50%" x2="30%" y2="75%" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
            <line x1="50%" y1="50%" x2="20%" y2="35%" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
          </svg>

          <!-- Surrounding Orbit Nodes -->
          <div
            v-for="nd in nodes"
            :key="nd.name"
            class="absolute px-3 py-1.5 rounded-lg border border-white/5 bg-[#141210] text-[9.5px] font-mono font-bold text-[#f5f4f0] shadow-sm transform -translate-x-1/2 -translate-y-1/2"
            :style="{ left: nd.x, top: nd.y }"
          >
            {{ nd.name }}
          </div>
        </div>

      </div>
    </div>
  </section>
</template>
