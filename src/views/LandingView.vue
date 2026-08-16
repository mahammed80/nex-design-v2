<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { fadeOutGlobalLoader } from '@/app/editor/canvas/loader-overlay'
import AnimatedLoader from '@/components/Landing/AnimatedLoader.vue'
import MarbleBackground from '@/components/Landing/MarbleBackground.vue'
import LandingNavbar from '@/components/Landing/LandingNavbar.vue'
import LandingHero from '@/components/Landing/LandingHero.vue'
import ProductShowcase from '@/components/Landing/ProductShowcase.vue'
import DesignGuide from '@/components/Landing/DesignGuide.vue'
import Prototyping from '@/components/Landing/Prototyping.vue'
import FreeAIHelper from '@/components/Landing/FreeAIHelper.vue'
import Typography from '@/components/Landing/Typography.vue'
import ComponentsSystem from '@/components/Landing/ComponentsSystem.vue'
import Collaboration from '@/components/Landing/Collaboration.vue'
import LandingFeatures from '@/components/Landing/LandingFeatures.vue'
import WhyNex from '@/components/Landing/WhyNex.vue'
import Pricing from '@/components/Landing/Pricing.vue'
import FinalCTA from '@/components/Landing/FinalCTA.vue'
import LandingFooter from '@/components/Landing/LandingFooter.vue'

const isLoaded = ref(false)

onMounted(() => {
  fadeOutGlobalLoader()
  document.documentElement.classList.add('scrollable-page')
  document.body.classList.add('scrollable-page')
  const app = document.getElementById('app')
  if (app) app.classList.add('scrollable-page')
})

onUnmounted(() => {
  document.documentElement.classList.remove('scrollable-page')
  document.body.classList.remove('scrollable-page')
  const app = document.getElementById('app')
  if (app) app.classList.remove('scrollable-page')
})

function onLoaderComplete() {
  isLoaded.value = true
}
</script>

<template>
  <div class="relative min-h-screen bg-[#000000] text-[#eae8e4] overflow-x-hidden font-sans">
    <!-- Animated Intro Heartbeat Loader Overlay -->
    <AnimatedLoader @complete="onLoaderComplete" />

    <!-- Organic Marble Wave Canvas Backdrop -->
    <MarbleBackground />

    <!-- Landing View Main Content -->
    <div class="relative z-10 transition-opacity duration-700" :class="{ 'opacity-100': isLoaded, 'opacity-0': !isLoaded }">
      <LandingNavbar />
      <LandingHero />
      <ProductShowcase />
      <DesignGuide />
      <Prototyping />
      <FreeAIHelper />
      <Typography />
      <ComponentsSystem />
      <Collaboration />
      <LandingFeatures />
      <WhyNex />
      <Pricing />
      <FinalCTA />
      <LandingFooter />
    </div>
  </div>
</template>
