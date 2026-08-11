<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string
    variant?: 'solid' | 'marble' | 'white'
    showText?: boolean
    textColor?: string
    animated?: boolean
  }>(),
  {
    size: 80,
    variant: 'solid',
    showText: true,
    textColor: 'currentColor',
    animated: false
  }
)
</script>

<template>
  <div class="inline-flex flex-col items-center select-none" :style="{ width: typeof size === 'number' ? `${size}px` : size }">
    <div class="relative w-full aspect-square flex items-center justify-center">
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-full drop-shadow-md transition-all duration-300"
      >
        <defs>
          <!-- Luxury marble / metallic gradient -->
          <linearGradient id="nex-marble-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0F172A" />
            <stop offset="35%" stop-color="#1E3A8A" />
            <stop offset="65%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#EA580C" />
          </linearGradient>

          <linearGradient id="nex-gold-accent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#F59E0B" />
            <stop offset="50%" stop-color="#FCD34D" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
        </defs>

        <!-- Precision geometric 'N' logo segments -->
        <g :fill="variant === 'marble' ? 'url(#nex-marble-grad)' : variant === 'white' ? '#FFFFFF' : '#0F172A'">
          <!-- Left Part -->
          <path
            d="M 100 125 L 175 100 L 300 200 L 300 250 L 200 175 L 200 325 L 100 400 Z"
            :class="{ 'animate-left-outer': animated }"
            class="transform-gpu origin-left transition-all"
          />
          <!-- Right Part -->
          <path
            d="M 400 375 L 325 400 L 200 300 L 200 250 L 300 325 L 300 175 L 400 100 Z"
            :class="{ 'animate-right-outer': animated }"
            class="transform-gpu origin-right transition-all"
          />
        </g>
      </svg>
    </div>

    <!-- NEX DESIGN typography -->
    <div
      v-if="showText"
      class="mt-3 tracking-[0.4em] text-[0.7rem] sm:text-xs font-bold uppercase whitespace-nowrap font-sans"
      :style="{ color: textColor }"
    >
      NEX DESIGN
    </div>
  </div>
</template>

<style scoped>
/* Keyframes for the geometric 'N' assembly animations */
@keyframes slide-in-left-outer {
  0% {
    transform: translateX(-40px) scaleX(0.5);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scaleX(1);
    opacity: 1;
  }
}

@keyframes slide-in-right-outer {
  0% {
    transform: translateX(40px) scaleX(0.5);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scaleX(1);
    opacity: 1;
  }
}

@keyframes slide-in-left-inner {
  0% {
    transform: translateY(-40px) scaleY(0.5);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scaleY(1);
    opacity: 1;
  }
}

@keyframes slide-in-right-inner {
  0% {
    transform: translateY(40px) scaleY(0.5);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scaleY(1);
    opacity: 1;
  }
}

.animate-left-outer {
  animation: slide-in-left-outer 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-right-outer {
  animation: slide-in-right-outer 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-left-inner {
  animation: slide-in-left-inner 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-right-inner {
  animation: slide-in-right-inner 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
