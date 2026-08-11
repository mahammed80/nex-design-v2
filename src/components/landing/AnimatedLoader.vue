<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import NexLogo from './NexLogo.vue'

const emit = defineEmits<{ (e: 'complete'): void }>()

const isFirstVisit = ref(true)
const progress = ref(0)
const stage = ref<'loading' | 'expanding' | 'done'>('loading')
const currentLog = ref('Initializing NEX Design Engine...')

const bootLogs = [
  'Loading CanvasKit WASM binaries...',
  'Binding Facebook Yoga layout engine...',
  'Parsing local design files...',
  'Preloading workspace typography families...',
  'Connecting P2P WebRTC signaling mesh...',
  'Activating AI Copilot design models...',
  'Initializing scene graph memory nodes...',
  'System ready. Booting interface...'
]

onMounted(() => {
  // Check if user has visited in this session
  const visited = sessionStorage.getItem('nex_design_visited')
  if (visited) {
    isFirstVisit.value = false
  } else {
    sessionStorage.setItem('nex_design_visited', 'true')
  }

  // Bind keyboard listener for interactive progress charging
  window.addEventListener('keydown', handleKeyPress)

  // Slow auto-advancer (in case user doesn't type, so they are not blocked)
  const interval = setInterval(() => {
    if (stage.value !== 'loading') {
      clearInterval(interval)
      return
    }

    // Auto-advance quickly (~2.5s total duration)
    progress.value = Math.min(100, progress.value + 1.8)
    updateBootLog()

    if (progress.value >= 100) {
      clearInterval(interval)
      finishLoading()
    }
  }, 50)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})

function handleKeyPress() {
  if (stage.value !== 'loading') return

  // Play mechanical keyboard click synth sound
  playKeyboardClick()

  // Typing charges progress bar by 5% to 8%
  progress.value = Math.min(100, progress.value + 5 + Math.random() * 3)
  updateBootLog()

  if (progress.value >= 100) {
    finishLoading()
  }
}

function updateBootLog() {
  const index = Math.min(
    bootLogs.length - 1,
    Math.floor((progress.value / 100) * bootLogs.length)
  )
  currentLog.value = bootLogs[index]
}

function playKeyboardClick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180 + Math.random() * 60, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start()
    osc.stop(audioCtx.currentTime + 0.05)
  } catch (e) {
    // Ignored (browser autoplay policy, etc.)
  }
}

function finishLoading() {
  window.removeEventListener('keydown', handleKeyPress)
  if (isFirstVisit.value) {
    stage.value = 'expanding'
    setTimeout(() => {
      stage.value = 'done'
      emit('complete')
    }, 600)
  } else {
    stage.value = 'done'
    emit('complete')
  }
}

function skipLoader() {
  progress.value = 100
  finishLoading()
}
</script>

<template>
  <Transition
    name="fade-loader"
    leave-active-class="transition-opacity duration-700 ease-in-out"
    leave-to-class="opacity-0 pointer-events-none"
  >
    <div
      v-if="stage !== 'done'"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-radial-loader text-white select-none overflow-hidden"
    >
      <!-- Dotted vector grid backdrop -->
      <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

      <!-- Floating Abstract Vector Shapes (Design Tool Style) -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <!-- Floating shape 1: Bezier curve and anchor nodes -->
        <svg class="absolute -top-10 -left-10 w-96 h-96 opacity-15 animate-float-1" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 200 C 150 50, 250 350, 350 200" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="4 4" />
          <circle cx="50" cy="200" r="5" fill="#9c2727" stroke="white" stroke-width="1.5" />
          <circle cx="350" cy="200" r="5" fill="#9c2727" stroke="white" stroke-width="1.5" />
          <circle cx="150" cy="50" r="4" fill="white" />
          <line x1="150" y1="50" x2="100" y2="125" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
          <circle cx="250" cy="350" r="4" fill="white" />
          <line x1="250" y1="350" x2="280" y2="275" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
        </svg>

        <!-- Floating shape 2: Rotating coordinates circle guide -->
        <svg class="absolute -bottom-20 -right-20 w-[450px] h-[450px] opacity-10 animate-float-2" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="250" cy="250" r="180" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
          <circle cx="250" cy="250" r="120" stroke="rgba(255,255,255,0.2)" stroke-dasharray="3 6" stroke-width="1" />
          <line x1="70" y1="250" x2="430" y2="250" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
          <line x1="250" y1="70" x2="250" y2="430" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
          <!-- Small bounding squares -->
          <rect x="244" y="64" width="12" height="12" fill="white" stroke="#9c2727" stroke-width="1.5" />
          <rect x="244" y="424" width="12" height="12" fill="white" stroke="#9c2727" stroke-width="1.5" />
          <rect x="64" y="244" width="12" height="12" fill="white" stroke="#9c2727" stroke-width="1.5" />
          <rect x="424" y="244" width="12" height="12" fill="white" stroke="#9c2727" stroke-width="1.5" />
        </svg>
      </div>

      <!-- Heartbeat / Expanding Logo Container -->
      <div
        class="relative flex flex-col items-center justify-center transition-transform duration-700 ease-in-out z-10"
        :class="{
          'animate-heartbeat': isFirstVisit && stage === 'loading',
          'scale-[35] opacity-0 duration-700': stage === 'expanding'
        }"
      >
        <!-- Outer glowing aura for heartbeat effect -->
        <div
          v-if="isFirstVisit"
          class="absolute w-48 h-48 rounded-full bg-red-800/20 blur-2xl animate-pulse"
        />

        <NexLogo
          :size="110"
          variant="white"
          :show-text="stage !== 'expanding'"
          text-color="rgba(255, 255, 255, 0.6)"
          :animated="true"
        />
      </div>

      <!-- Loading Slider / Progress Bar Below -->
      <div
        v-if="stage === 'loading'"
        class="mt-10 flex flex-col items-center gap-3 w-64 max-w-[80vw] transition-opacity duration-300 z-10"
      >
        <!-- Sleek progress slider track (same as app loading state) -->
        <div class="w-25 h-0.5 bg-white/8 rounded-full overflow-hidden">
          <div
            class="h-full bg-white/40 transition-all duration-75 ease-out"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <div class="flex items-center justify-between w-25 text-[9px] uppercase font-mono tracking-widest text-white/40">
          <span>{{ currentLog.startsWith('System') ? 'READY' : 'BOOT' }}</span>
          <span>{{ Math.round(progress) }}%</span>
        </div>

        <!-- Guide to type to load faster -->
        <div class="text-[8px] font-mono tracking-wider text-red-400/80 uppercase animate-pulse mt-1">
          [ TYPE ON KEYBOARD TO LOAD ]
        </div>
      </div>

      <!-- Skip Button -->
      <button
        v-if="stage === 'loading'"
        @click="skipLoader"
        type="button"
        class="absolute bottom-8 text-[10px] font-mono tracking-widest text-white/30 hover:text-white/60 transition-colors uppercase py-1 px-3 rounded border border-white/5 hover:border-white/10 z-10"
      >
        Skip Intro
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.bg-radial-loader {
  background: radial-gradient(circle at center, #2e0808 0%, #150303 60%, #080000 100%) !important;
}

@keyframes heartbeat {
  0% {
    transform: scale(0.96);
  }
  14% {
    transform: scale(1.08);
  }
  28% {
    transform: scale(0.98);
  }
  42% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.96);
  }
  100% {
    transform: scale(0.96);
  }
}

.animate-heartbeat {
  animation: heartbeat 1.5s infinite ease-in-out;
}

@keyframes float-shape-1 {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(20px, -20px) rotate(45deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

@keyframes float-shape-2 {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-30px, 15px) rotate(-90deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

.animate-float-1 {
  animation: float-shape-1 20s infinite ease-in-out;
}

.animate-float-2 {
  animation: float-shape-2 25s infinite ease-in-out;
}
</style>
