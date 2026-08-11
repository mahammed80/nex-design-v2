<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const tiers = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'For solo creators and designers starting out.',
    features: ['1 Editor Sandbox workspace', '3 Active project frames', 'Headless CanvasKit rendering', 'Basic layout and shape tools'],
    cta: 'Get Started',
    recommended: false
  },
  {
    name: 'Professional',
    price: '$12',
    period: '/ month',
    desc: 'For professional UI/UX designers and freelancers.',
    features: ['Unlimited sandbox workspaces', 'Unlimited project files', 'Real-time WebRTC collaboration', 'Figma API inspect tools', 'Full OkHCL color controls'],
    cta: 'Start Pro Trial',
    recommended: true
  },
  {
    name: 'Team / Organization',
    price: '$36',
    period: '/ month',
    desc: 'For product teams and organizations.',
    features: ['Everything in Pro tier', 'Shared Team design libraries', 'Advanced linter rule configs', 'Tauri Desktop ACP support', 'Priority support channels'],
    cta: 'Contact Sales',
    recommended: false
  }
]

function startDesigning() {
  router.push('/dashboard')
}
</script>

<template>
  <section id="pricing" class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <div class="max-w-7xl mx-auto">
      <div v-reveal class="text-center max-w-3xl mx-auto mb-20 reveal-up">
        <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727] mb-4">Pricing Plans</h2>
        <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0]">
          Start building your next idea.
        </h3>
        <p class="mt-4 text-[#a1a1aa] text-sm sm:text-base font-light">
          Simple, transparent tiers tailored for solo creators, professionals, and product design teams.
        </p>
      </div>

      <!-- Pricing cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 max-w-5xl mx-auto">
        <div
          v-for="(tier, i) in tiers"
          :key="tier.name"
          v-reveal
          class="p-8 rounded-2xl border flex flex-col justify-between relative transition-all duration-300 reveal-scale"
          :class="[
            tier.recommended
              ? 'border-[#ff5c5c] bg-white/10 backdrop-blur-md shadow-lg scale-105 z-10'
              : 'border-white/5 bg-white/5 backdrop-blur-sm shadow-sm',
            `delay-${i * 100}`
          ]"
        >
          <!-- Recommended Badge -->
          <span
            v-if="tier.recommended"
            class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#9c2727] text-white text-[9px] font-bold tracking-widest font-mono uppercase"
          >
            RECOMMENDED
          </span>

          <div class="space-y-6">
            <div>
              <h4 class="text-lg font-bold text-[#f5f4f0]">{{ tier.name }}</h4>
              <p class="text-xs text-[#a1a1aa] mt-1">{{ tier.desc }}</p>
            </div>

            <div class="flex items-baseline gap-1 text-[#f5f4f0]">
              <span class="text-4xl font-extrabold tracking-tight">{{ tier.price }}</span>
              <span v-if="tier.period" class="text-xs text-[#a1a1aa] font-mono">{{ tier.period }}</span>
            </div>

            <!-- Features list -->
            <ul class="space-y-3 pt-4 border-t border-white/5 text-xs text-[#a1a1aa] font-light">
              <li v-for="feat in tier.features" :key="feat" class="flex items-center gap-2">
                <span class="text-[#ff5c5c] font-bold">✓</span>
                {{ feat }}
              </li>
            </ul>
          </div>

          <button
            @click="startDesigning"
            type="button"
            class="w-full mt-8 py-3 rounded-xl font-bold font-mono text-[10px] uppercase tracking-wider transition-all duration-200"
            :class="[
              tier.recommended
                ? 'bg-[#9c2727] text-white hover:bg-[#7f1d1d]'
                : 'bg-[#1c1a18] border border-white/5 text-white hover:bg-white hover:text-[#121214]'
            ]"
          >
            {{ tier.cta }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
