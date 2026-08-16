<script setup lang="ts">
const {
  size = 80,
  variant = 'solid',
  showText = true,
  textColor = 'currentColor',
  animated = false
} = defineProps<{
  size?: number | string
  variant?: 'solid' | 'marble' | 'white'
  showText?: boolean
  textColor?: string
  animated?: boolean
}>()
</script>

<template>
  <div class="inline-flex flex-col items-center select-none" :style="{ width: typeof size === 'number' ? `${size}px` : size }">
    <div class="relative w-full aspect-square flex items-center justify-center">
      <img
        src="/nexus-logo.webp"
        alt="Nexus Design Studios"
        class="w-full h-full object-contain drop-shadow-md transition-all duration-300 rounded-xl"
        :class="{ 'animate-pulse': animated }"
      />
    </div>

    <!-- NEX DESIGN typography -->
    <div
      v-if="showText"
      class="mt-3 text-center"
      :style="{ color: textColor }"
    >
      <div class="tracking-[0.3em] text-[0.7rem] sm:text-xs font-bold uppercase whitespace-nowrap font-sans">
        NEX DESIGN
      </div>
      <div class="text-[9px] text-rose-400 font-semibold tracking-wider uppercase mt-0.5">
        Powered by Nexus Design Studios
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
