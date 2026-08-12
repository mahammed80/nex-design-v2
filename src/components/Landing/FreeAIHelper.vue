<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface PromptOption {
  id: string
  label: string
  prompt: string
  thinkingLog: string[]
  layoutType: string
  layoutClass: string
}

const prompts: PromptOption[] = [
  {
    id: 'glass',
    label: 'Luxury Glassmorphism',
    prompt: 'Generate a glassmorphic login card with gold gradient glows',
    thinkingLog: [
      'Parsing request parameters...',
      'Setting border-radius: 24px, backdrop-filter: blur(16px)',
      'Injecting luxury gold-accent linear gradient',
      'Synthesizing input field layers and alignment tokens...',
      'CanvasKit rendering complete (1.2ms)'
    ],
    layoutType: 'Frame: Premium Login',
    layoutClass: 'glass'
  },
  {
    id: 'brutalist',
    label: 'Brutalist Grid',
    prompt: 'Create a bold neo-brutalist feature grid with heavy shadows',
    thinkingLog: [
      'Calculating grid coordinates...',
      'Applying border: 3px solid #ffffff, shadow: [8px, 8px, 0px, #9c2727]',
      'Arranging child elements into a 3-column horizontal flow',
      'Binding spacing gap variables (24px gap offset)...',
      'CanvasKit rendering complete (0.8ms)'
    ],
    layoutType: 'Auto Layout: Grid (3 Cols)',
    layoutClass: 'brutalist'
  },
  {
    id: 'dashboard',
    label: 'Modern Dashboard',
    prompt: 'Build an interactive analytics graph with glowing KPI cards',
    thinkingLog: [
      'Initializing flex layouts...',
      'Drawing bezier curve graph paths (okHCL color scale)...',
      'Applying pulse animation states to active indicators',
      'Adding numerical variable tags for spacing values...',
      'CanvasKit rendering complete (1.5ms)'
    ],
    layoutType: 'Frame: Analytics Dashboard',
    layoutClass: 'dashboard'
  }
]

const activeIndex = ref(0)
const typedText = ref('')
const isThinking = ref(false)
const currentLogs = ref<string[]>([])
const layoutState = ref<string>('glass')
const activeLogIndex = ref(-1)

let typingTimeout: any = null
let loggingInterval: any = null

function selectPrompt(index: number) {
  if (isThinking.value) return
  activeIndex.value = index
  const selected = prompts[index]

  // Clear previous typing and logs
  typedText.value = ''
  currentLogs.value = []
  activeLogIndex.value = -1
  isThinking.value = true
  if (typingTimeout) clearTimeout(typingTimeout)
  if (loggingInterval) clearInterval(loggingInterval)

  // Start typing simulation
  let charIndex = 0
  const type = () => {
    if (charIndex < selected.prompt.length) {
      typedText.value += selected.prompt.charAt(charIndex)
      charIndex++
      typingTimeout = setTimeout(type, 20)
    } else {
      // Done typing, start thinking logs
      runThinkingLogs(selected)
    }
  }
  type()
}

function runThinkingLogs(selected: PromptOption) {
  let logIndex = 0
  loggingInterval = setInterval(() => {
    if (logIndex < selected.thinkingLog.length) {
      currentLogs.value.push(selected.thinkingLog[logIndex])
      activeLogIndex.value = logIndex
      logIndex++
    } else {
      clearInterval(loggingInterval)
      // Done thinking, update layout state
      isThinking.value = false
      layoutState.value = selected.layoutClass
    }
  }, 350)
}

onMounted(() => {
  // Select first one on load automatically
  selectPrompt(0)
})
</script>

<template>
  <section id="ai-helper" class="relative py-28 px-6 z-10 text-[#f5f4f0] bg-white/5 backdrop-blur-[12px] border-t border-white/10">
    <!-- Ambient background light source for premium look -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

    <div class="max-w-7xl mx-auto">
      <!-- Section Header -->
      <div v-reveal class="text-center max-w-3xl mx-auto mb-20 reveal-up">
        <h2 class="text-xs font-mono tracking-[0.3em] uppercase text-[#9c2727] mb-4">AI Design Assistant</h2>
        <h3 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f5f4f0] leading-[1.15]">
          Your thoughts. Built in pixels.
        </h3>
        <p class="mt-4 text-[#a1a1aa] text-sm sm:text-base font-light">
          Meet the Free AI Design Helper. Describe any layout, design system token, or interface style in natural language and watch the CanvasKit Skia engine generate edit-ready vector files instantly.
        </p>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-6">
        
        <!-- Left Column: AI Input & Chat Console -->
        <div v-reveal class="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-white/5 bg-[#141210]/95 shadow-xl glass-panel min-h-[480px] reveal-left">
          
          <div class="space-y-6">
            <!-- Header/Avatar -->
            <div class="flex items-center gap-3.5 pb-4 border-b border-white/5">
              <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9c2727] to-[#e63946] shadow-md shadow-[#9c2727]/10">
                <!-- AI spark logo icon -->
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 21l-1.813-5.096L2.091 14.1l5.096-1.813L9 7.187l1.813 5.096 5.096 1.813-5.096 1.813zM19.071 4.929l-1.125 3.125-3.125 1.125 3.125 1.125 1.125 3.125 1.125-3.125 3.125-1.125-3.125-1.125-1.125-3.125z" />
                </svg>
                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#141210]" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-[#f5f4f0]">Nex Design Co-pilot</h4>
                <p class="text-[10px] text-[#a1a1aa] font-mono uppercase tracking-wider">Ready to generate</p>
              </div>
            </div>

            <!-- Prompts suggestion row -->
            <div class="space-y-2">
              <div class="text-[9px] font-mono text-[#a1a1aa] uppercase tracking-widest">Select a prompt:</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="(pr, idx) in prompts"
                  :key="pr.id"
                  @click="selectPrompt(idx)"
                  type="button"
                  class="px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 shadow-sm"
                  :class="[
                    activeIndex === idx
                      ? 'border-[#9c2727] bg-[#9c2727]/15 text-[#f5f4f0]'
                      : 'border-white/5 bg-white/5 text-[#a1a1aa] hover:bg-white/10 hover:text-white'
                  ]"
                  :disabled="isThinking"
                >
                  {{ pr.label }}
                </button>
              </div>
            </div>

            <!-- Terminal Interface -->
            <div class="p-4 rounded-xl bg-[#0c0a09] border border-white/5 font-mono text-xs space-y-3 min-h-[180px] flex flex-col justify-start">
              <div class="flex items-start gap-2 text-slate-400">
                <span class="text-[#9c2727] font-extrabold">&gt;</span>
                <span class="text-[#eae8e4] leading-relaxed select-all">{{ typedText }}<span class="w-1.5 h-3.5 bg-red-400 inline-block animate-pulse ml-0.5" /></span>
              </div>

              <!-- Output logs with progressive fade-in -->
              <div class="space-y-1.5 pt-2 border-t border-white/5 flex-1 overflow-y-auto">
                <div
                  v-for="(log, lIdx) in currentLogs"
                  :key="lIdx"
                  class="text-[11px] transition-all duration-300"
                  :class="[
                    lIdx === currentLogs.length - 1 && isThinking
                      ? 'text-[#f59e0b] animate-pulse'
                      : lIdx === currentLogs.length - 1 && !isThinking
                      ? 'text-[#10b981]'
                      : 'text-slate-500'
                  ]"
                >
                  <span class="text-slate-600 mr-2">[{{ new Date().toLocaleTimeString().split(' ')[0] }}]</span>
                  {{ log }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom description info -->
          <div class="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#a1a1aa] uppercase tracking-wider">
            <span>Model: NEX-DESIGN-AI-v2</span>
            <span class="flex items-center gap-1.5 text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Active
            </span>
          </div>

        </div>

        <!-- Right Column: Interactive Canvas Showcase -->
        <div v-reveal class="lg:col-span-7 rounded-2xl border border-white/5 overflow-hidden relative flex flex-col justify-between bg-[#0e0d0b] min-h-[480px] reveal-right shadow-2xl">
          
          <!-- Canvas Top Bar / Meta -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#141210]/80 z-20">
            <div class="flex items-center gap-3">
              <!-- Bounding box type badge -->
              <span class="px-2.5 py-1 rounded bg-[#9c2727]/10 border border-[#9c2727]/30 text-[#ff5c5c] text-[9px] font-mono font-bold tracking-wider uppercase">
                {{ prompts[activeIndex].layoutType }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] font-mono text-[#a1a1aa]">
              <span>ZOOM: 100%</span>
              <span class="text-white/20">|</span>
              <span>GRID: 8px</span>
            </div>
          </div>

          <!-- Dynamic Bounding Area (Canvas Frame) -->
          <div class="flex-1 relative flex items-center justify-center p-8 z-10 overflow-hidden">
            <!-- Canvas dots backdrop -->
            <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

            <!-- Thinking visual overlay -->
            <Transition name="fade-overlay">
              <div v-if="isThinking" class="absolute inset-0 bg-[#0e0d0b]/80 z-30 flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]">
                <div class="w-8 h-8 rounded-full border-2 border-t-[#9c2727] border-white/5 animate-spin" />
                <span class="font-mono text-[10px] tracking-widest text-[#a1a1aa] uppercase animate-pulse">Rendering Design Layers...</span>
              </div>
            </Transition>

            <!-- DESIGN 1: Luxury Glassmorphism Card -->
            <div
              v-if="layoutState === 'glass'"
              class="relative w-72 p-6 sm:p-8 rounded-[24px] border border-white/15 bg-white/5 backdrop-blur-[16px] shadow-2xl flex flex-col gap-6 transition-all duration-700 ease-out hover:border-white/25 group/card"
            >
              <!-- Ambient background luxury gold glow inside the card -->
              <div class="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#f59e0b] to-[#ea580c] rounded-full blur-[48px] opacity-35" />
              
              <div class="space-y-1.5 relative z-10">
                <div class="text-[10px] font-mono text-[#ff5c5c] tracking-widest uppercase font-semibold">Welcome Back</div>
                <h4 class="text-xl font-bold tracking-tight text-white">Access Studio</h4>
              </div>

              <!-- Input fields mockup -->
              <div class="space-y-3 relative z-10">
                <div class="space-y-1">
                  <div class="h-3 w-16 bg-white/20 rounded font-mono text-[8px] tracking-wider uppercase pl-1" />
                  <div class="h-9 w-full rounded-lg bg-white/5 border border-white/10 flex items-center px-3 text-[10px] text-white/40">
                    email@nexdesign.dev
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="h-3 w-16 bg-white/20 rounded font-mono text-[8px] tracking-wider uppercase pl-1" />
                  <div class="h-9 w-full rounded-lg bg-white/5 border border-white/10 flex items-center px-3 justify-between text-[10px] text-white/40">
                    ••••••••••••
                    <div class="w-3.5 h-3.5 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>

              <!-- Action button mockup -->
              <button type="button" class="w-full h-10 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] text-white font-bold text-xs font-mono tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-md shadow-amber-900/20 relative overflow-hidden z-10">
                SIGN IN
              </button>

              <!-- Absolute measurement indicator handles typical of vector canvas -->
              <div class="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                <span class="w-1.5 h-1.5 bg-[#ff5c5c] rounded-full" />
                <span class="font-mono text-[8px] text-[#ff5c5c] bg-[#141210] border border-white/10 px-1 py-0.5 rounded">24px</span>
              </div>
            </div>

            <!-- DESIGN 2: Brutalist Grid of 3 Cards -->
            <div
              v-if="layoutState === 'brutalist'"
              class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg transition-all duration-700 ease-out"
            >
              <div
                v-for="i in 3"
                :key="i"
                class="p-4 rounded-lg border-2 border-white bg-[#141210] shadow-[4px_4px_0px_#9c2727] hover:shadow-[6px_6px_0px_#ff5c5c] transition-all duration-300 flex flex-col justify-between h-40 group/brut"
              >
                <div class="space-y-3">
                  <div class="w-7 h-7 rounded border border-white flex items-center justify-center font-bold text-xs font-mono" :class="i === 1 ? 'bg-[#9c2727]' : i === 2 ? 'bg-amber-500 text-black' : 'bg-white text-black'">
                    0{{ i }}
                  </div>
                  <div>
                    <h5 class="text-[11px] font-bold tracking-tight text-white uppercase font-mono">Module {{ i }}</h5>
                    <p class="text-[9px] text-[#a1a1aa] mt-1 font-light leading-relaxed">Vector block node layout constraints.</p>
                  </div>
                </div>
                <div class="text-[8px] font-mono text-[#ff5c5c] font-bold">W: 120 / H: 160</div>
              </div>
            </div>

            <!-- DESIGN 3: Modern Analytics Dashboard with SVG Path Graph -->
            <div
              v-if="layoutState === 'dashboard'"
              class="relative w-full max-w-md p-5 rounded-2xl border border-white/5 bg-[#141210] shadow-xl flex flex-col gap-5 transition-all duration-700 ease-out"
            >
              <!-- KPI headers -->
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[9px] font-mono text-[#a1a1aa] uppercase tracking-widest">Active Workspace Performance</span>
                  <h4 class="text-base font-bold text-white mt-0.5">Render Engine Speed</h4>
                </div>
                <!-- KPI Status badge -->
                <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[9px] font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  +24.8%
                </div>
              </div>

              <!-- Animated graph mockup -->
              <div class="relative h-24 w-full bg-[#1c1a18] border border-white/5 rounded-xl overflow-hidden flex flex-col justify-end p-2">
                <!-- SVG path with luxury gradient -->
                <svg class="absolute inset-0 w-full h-full text-[#9c2727]" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#9c2727" stop-opacity="0.4" />
                      <stop offset="100%" stop-color="#9c2727" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <!-- Filled area -->
                  <path d="M 0 100 Q 80 40, 160 70 T 320 20 T 400 30 L 400 100 L 0 100 Z" fill="url(#chart-glow)" />
                  <!-- Line path -->
                  <path d="M 0 100 Q 80 40, 160 70 T 320 20 T 400 30" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
                
                <!-- Overlay markers -->
                <span class="absolute top-2 left-[40%] text-[8px] font-mono bg-red-600/90 text-white px-1.5 py-0.5 rounded pointer-events-none shadow">
                  120 FPS
                </span>
                
                <!-- X-Axis ticks -->
                <div class="flex justify-between w-full text-[7px] font-mono text-[#a1a1aa] relative z-10 pt-1">
                  <span>10:00 AM</span>
                  <span>12:00 PM</span>
                  <span>02:00 PM</span>
                  <span>04:00 PM</span>
                </div>
              </div>

              <!-- Spacing guidelines indicators overlay -->
              <div class="absolute -right-2 top-10 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                <span class="w-1.5 h-1.5 bg-red-400 rounded-full" />
                <span class="h-10 w-px border-l border-dashed border-red-500" />
                <span class="font-mono text-[7px] text-red-400 bg-[#141210] px-1 border border-white/5 rounded">GAP: 16px</span>
              </div>
            </div>

            <!-- Active element bounds outline / handles simulator (float globally on preview frame) -->
            <div
              v-if="!isThinking"
              class="absolute border border-red-500/40 pointer-events-none z-20 rounded"
              :class="[
                layoutState === 'glass' ? 'w-[300px] h-[340px]' :
                layoutState === 'brutalist' ? 'w-[470px] h-[180px] hidden sm:block' :
                'w-[440px] h-[220px]'
              ]"
            >
              <!-- Selected badge label -->
              <span class="absolute -top-4 -right-1 bg-red-500 text-white text-[7.5px] font-mono px-1 rounded uppercase tracking-wider font-semibold">
                SELECTION
              </span>
              <!-- Handles in corners -->
              <div class="absolute -top-1 -left-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm" />
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm" />
              <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm" />
              <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-[#0e0d0b] border border-red-500 rounded-sm" />
            </div>

          </div>

          <!-- Bottom bar simulating CanvasKit layout actions -->
          <div class="px-5 py-3.5 border-t border-white/5 bg-[#141210]/60 z-20 flex items-center justify-between text-[10px] font-mono text-[#a1a1aa]">
            <div class="flex items-center gap-4">
              <span>LAYOUT: FLEX-BOX (YOGA)</span>
              <span>GAP: 24px</span>
            </div>
            <div class="text-[#ff5c5c] font-bold">READY TO EXPORT</div>
          </div>

        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.glass-panel {
  background: linear-gradient(135deg, rgba(20, 18, 16, 0.95) 0%, rgba(10, 8, 6, 0.98) 100%);
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
