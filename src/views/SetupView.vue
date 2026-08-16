<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { fadeOutGlobalLoader } from '@/app/editor/canvas/loader-overlay'

const router = useRouter()

// Setup State stored in localStorage
const studioName = useLocalStorage('nex-setup-studio-name', 'Nexus Design Studio')
const userRole = useLocalStorage('nex-setup-user-role', 'product-designer')
const selectedTheme = useLocalStorage('nex-setup-theme', 'obsidian')
const autoLayoutMode = useLocalStorage('nex-setup-autolayout', 'fluid')
const enableAi = useLocalStorage('nex-setup-ai', true)
const enableUrlImport = useLocalStorage('nex-setup-url-import', true)
const enableDevMode = useLocalStorage('nex-setup-dev-mode', true)
const enableCollab = useLocalStorage('nex-setup-collab', true)
const setupComplete = useLocalStorage('nex-setup-completed', false)

const currentStep = ref(1)
const isLaunching = ref(false)
const launchProgress = ref(0)
const selectedStarter = ref<'blank' | 'url' | 'kit'>('blank')

onMounted(() => {
  fadeOutGlobalLoader()
})

const ROLES = [
  { id: 'product-designer', label: 'Product Designer', icon: 'palette', desc: 'Crafting design systems & mobile/web interfaces' },
  { id: 'ui-architect', label: 'UI/UX Architect', icon: 'layout', desc: 'Component structures, responsive auto-layout & tokens' },
  { id: 'developer', label: 'Frontend / Dev Mode', icon: 'code', desc: 'Translating designs into Tailwind, React, Vue & Flutter' },
  { id: 'agency-lead', label: 'Studio & Agency', icon: 'briefcase', desc: 'High-speed client workflows & AI generation' }
]

const THEMES = [
  { id: 'obsidian', label: 'Obsidian Dark', accent: '#0D99FF', bg: '#0D0D11', desc: 'Ultra-modern high contrast' },
  { id: 'midnight', label: 'Midnight Navy', accent: '#6366F1', bg: '#0A0E1A', desc: 'Deep blue studio aesthetic' },
  { id: 'minimalist', label: 'Nexus Cyber', accent: '#10B981', bg: '#090D0B', desc: 'Emerald neon cyber grade' }
]

const STARTERS = [
  {
    id: 'blank',
    title: 'Blank Infinite Canvas',
    desc: 'Clean slate with full CanvasKit 120 FPS GPU rendering engine',
    icon: 'sparkles'
  },
  {
    id: 'url',
    title: 'URL to Design Studio',
    desc: 'Instantly import existing web pages into fluid AutoLayout frames',
    icon: 'globe'
  },
  {
    id: 'kit',
    title: 'Nexus Design System Starter',
    desc: 'Pre-loaded with modern buttons, inputs, modals, and typography tokens',
    icon: 'layers'
  }
]

const canProceed = computed(() => {
  if (currentStep.value === 1) return studioName.value.trim().length > 0
  return true
})

function nextStep() {
  if (currentStep.value < 4) {
    currentStep.value++
  } else {
    launchEditor()
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function launchEditor() {
  isLaunching.value = true
  launchProgress.value = 15

  const interval = setInterval(() => {
    const randomArray = new Uint8Array(1)
    crypto.getRandomValues(randomArray)
    const stepIncrement = (randomArray[0] % 20) + 15
    launchProgress.value += stepIncrement
    if (launchProgress.value >= 100) {
      clearInterval(interval)
      setupComplete.value = true
      setTimeout(() => {
        if (selectedStarter.value === 'url') {
          void router.push('/editor?tool=url-import')
        } else {
          void router.push('/editor')
        }
      }, 400)
    }
  }, 200)
}
</script>

<template>
  <div class="relative min-h-screen w-full bg-[#08080C] text-[#EDEDED] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-accent/30 selection:text-white">
    <!-- Ambient Background Glows -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-accent/20 via-indigo-600/10 to-transparent blur-[120px] rounded-full opacity-60" />
      <div class="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-gradient-to-t from-emerald-500/10 to-transparent blur-[140px] rounded-full opacity-40" />
    </div>

    <!-- Header / Brand Bar -->
    <header class="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative size-10 rounded-xl overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center shadow-lg shadow-black/50">
          <img src="/nexus-logo.webp" alt="Nexus Design Studios" class="size-7 object-contain" />
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Nexus Design Studios
            <span class="px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-mono text-accent font-semibold">
              v2.0
            </span>
          </span>
          <span class="text-[11px] text-white/50">Setup & Workspace Configuration</span>
        </div>
      </div>

      <!-- Step Indicator Pills -->
      <div class="flex items-center gap-2">
        <div
          v-for="s in 4"
          :key="s"
          class="flex items-center gap-2"
        >
          <div
            class="size-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
            :class="{
              'bg-accent text-white shadow-md shadow-accent/30 scale-105': currentStep === s,
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40': currentStep > s,
              'bg-white/5 text-white/40 border border-white/10': currentStep < s
            }"
          >
            <icon-lucide-check v-if="currentStep > s" class="size-3.5" />
            <span v-else>{{ s }}</span>
          </div>
          <div v-if="s < 4" class="w-4 h-0.5 rounded-full" :class="currentStep > s ? 'bg-emerald-500/50' : 'bg-white/10'" />
        </div>
      </div>
    </header>

    <!-- Main Wizard Card Container -->
    <main class="relative z-10 w-full max-w-3xl mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
      <div class="relative rounded-3xl border border-white/10 bg-[#101017]/80 backdrop-blur-2xl p-8 shadow-2xl shadow-black/80 flex flex-col min-h-[480px] justify-between">
        
        <!-- STEP 1: STUDIO PROFILE & WORKSPACE -->
        <div v-if="currentStep === 1" class="flex flex-col gap-6 animate-fadeIn">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-2">
              <icon-lucide-sparkles class="size-3.5" />
              <span>Step 1: Studio Setup</span>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Name your creative workspace</h1>
            <p class="text-xs text-white/60 mt-1">Set up your studio name and design identity for NexDesign.</p>
          </div>

          <!-- Studio Name Input -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-white/80">Studio / Organization Name</label>
            <div class="relative">
              <icon-lucide-box class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40" />
              <input
                v-model="studioName"
                type="text"
                placeholder="e.g. Nexus Design Studios"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent focus:bg-white/10 transition-all shadow-inner"
              />
            </div>
          </div>

          <!-- Creator Role Selection -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-white/80">Primary Workflow</label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                v-for="role in ROLES"
                :key="role.id"
                class="flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer"
                :class="userRole === role.id ? 'border-accent bg-accent/10 shadow-sm shadow-accent/20' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'"
                @click="userRole = role.id"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="text-xs font-semibold text-white">{{ role.label }}</span>
                  <div v-if="userRole === role.id" class="size-2 rounded-full bg-accent" />
                </div>
                <span class="text-[11px] text-white/50 leading-relaxed">{{ role.desc }}</span>
              </button>
            </div>
          </div>

          <!-- Theme Mode -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-white/80">Editor Theme</label>
            <div class="grid grid-cols-3 gap-2.5">
              <button
                v-for="t in THEMES"
                :key="t.id"
                class="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer"
                :class="selectedTheme === t.id ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5 hover:border-white/20'"
                @click="selectedTheme = t.id"
              >
                <div class="size-4 rounded-full border border-white/30" :style="{ backgroundColor: t.accent }" />
                <span class="text-xs font-medium text-white">{{ t.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 2: RENDERING ENGINE & AUTO-LAYOUT -->
        <div v-else-if="currentStep === 2" class="flex flex-col gap-6 animate-fadeIn">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-2">
              <icon-lucide-cpu class="size-3.5" />
              <span>Step 2: Engine & Auto-Layout</span>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Configure CanvasKit & Layout Pipeline</h1>
            <p class="text-xs text-white/60 mt-1">High-performance Skia WASM rendering coupled with Yoga flexbox constraints.</p>
          </div>

          <!-- Auto-Layout Behavior -->
          <div class="flex flex-col gap-3">
            <label class="text-xs font-medium text-white/80">Default Auto-Layout Model</label>
            <div class="grid grid-cols-2 gap-3">
              <div
                class="p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between"
                :class="autoLayoutMode === 'fluid' ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10' : 'border-white/10 bg-white/5'"
                @click="autoLayoutMode = 'fluid'"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-white flex items-center gap-1.5">
                    <icon-lucide-maximize-2 class="size-4 text-accent" />
                    Fluid Auto-Layout (Fill & Hug)
                  </span>
                  <span class="px-1.5 py-0.5 rounded bg-accent/20 text-[10px] text-accent font-semibold font-mono">Recommended</span>
                </div>
                <p class="text-[11px] text-white/60 leading-relaxed">
                  All imported websites, sections, card lists, and text automatically stretch with container width and hug child labels.
                </p>
              </div>

              <div
                class="p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between"
                :class="autoLayoutMode === 'fixed' ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5'"
                @click="autoLayoutMode = 'fixed'"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-white flex items-center gap-1.5">
                    <icon-lucide-square class="size-4 text-white/60" />
                    Classic Absolute & Fixed
                  </span>
                </div>
                <p class="text-[11px] text-white/60 leading-relaxed">
                  Nodes retain fixed pixel coordinates and explicit bounding box dimensions without auto-flex distribution.
                </p>
              </div>
            </div>
          </div>

          <!-- Hardware Acceleration & Fonts Specs -->
          <div class="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <icon-lucide-zap class="size-4" />
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white">Hardware Accelerated Engine Ready</span>
                <span class="text-[11px] text-white/50">Skia WASM + Google Fonts & Arabic Auto-Shaping enabled</span>
              </div>
            </div>
            <span class="text-xs font-mono text-emerald-400 font-semibold">120 FPS</span>
          </div>
        </div>

        <!-- STEP 3: AI COPILOT & PLUGIN ECOSYSTEM -->
        <div v-else-if="currentStep === 3" class="flex flex-col gap-6 animate-fadeIn">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
              <icon-lucide-bot class="size-3.5" />
              <span>Step 3: Nexus AI & Plugins</span>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Supercharge your studio toolkit</h1>
            <p class="text-xs text-white/60 mt-1">Select the built-in intelligent features to activate in your workspace.</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Nexus Laguna AI -->
            <label class="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3 cursor-pointer hover:border-white/20 transition-all">
              <input v-model="enableAi" type="checkbox" class="mt-1 size-4 rounded accent-accent cursor-pointer" />
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                  Nexus Laguna AI Copilot
                  <span class="px-1.5 py-0.5 rounded bg-accent/15 text-[9px] font-mono text-accent">Active</span>
                </span>
                <span class="text-[11px] text-white/50 mt-0.5">Generate vector shapes, UI screens, and edit layouts with AI prompts.</span>
              </div>
            </label>

            <!-- URL to Design -->
            <label class="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3 cursor-pointer hover:border-white/20 transition-all">
              <input v-model="enableUrlImport" type="checkbox" class="mt-1 size-4 rounded accent-accent cursor-pointer" />
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white">URL to Design Plugin</span>
                <span class="text-[11px] text-white/50 mt-0.5">Import any live website or HTML into editable responsive layers.</span>
              </div>
            </label>

            <!-- Dev Mode Codegen -->
            <label class="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3 cursor-pointer hover:border-white/20 transition-all">
              <input v-model="enableDevMode" type="checkbox" class="mt-1 size-4 rounded accent-accent cursor-pointer" />
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white">Dev Mode & Framework Codegen</span>
                <span class="text-[11px] text-white/50 mt-0.5">Inspect box-model spacing and copy Tailwind, React, Vue, Flutter code.</span>
              </div>
            </label>

            <!-- Realtime P2P Collab -->
            <label class="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3 cursor-pointer hover:border-white/20 transition-all">
              <input v-model="enableCollab" type="checkbox" class="mt-1 size-4 rounded accent-accent cursor-pointer" />
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-white">Realtime P2P Multiplayer</span>
                <span class="text-[11px] text-white/50 mt-0.5">Trystero WebRTC collaboration with zero server relay lock-in.</span>
              </div>
            </label>
          </div>
        </div>

        <!-- STEP 4: LAUNCH & STARTER TEMPLATES -->
        <div v-else-if="currentStep === 4" class="flex flex-col gap-6 animate-fadeIn">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
              <icon-lucide-rocket class="size-3.5" />
              <span>Step 4: Launch Ready</span>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Choose how you want to start</h1>
            <p class="text-xs text-white/60 mt-1">Your studio is configured and ready to create.</p>
          </div>

          <!-- Starter Options -->
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="st in STARTERS"
              :key="st.id"
              class="flex flex-col justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer"
              :class="selectedStarter === st.id ? 'border-accent bg-accent/15 shadow-xl shadow-accent/20' : 'border-white/10 bg-white/5 hover:border-white/20'"
              @click="selectedStarter = st.id as 'blank' | 'url' | 'kit'"
            >
              <div class="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white mb-3">
                <icon-lucide-sparkles v-if="st.id === 'blank'" class="size-4 text-accent" />
                <icon-lucide-globe v-else-if="st.id === 'url'" class="size-4 text-emerald-400" />
                <icon-lucide-layers v-else class="size-4 text-indigo-400" />
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-bold text-white">{{ st.title }}</span>
                <span class="text-[10px] text-white/50 mt-1 leading-relaxed">{{ st.desc }}</span>
              </div>
            </button>
          </div>

          <!-- Launch Progress Bar when launching -->
          <div v-if="isLaunching" class="flex flex-col gap-2 pt-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-accent font-semibold flex items-center gap-2">
                <svg class="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Initializing {{ studioName }}...
              </span>
              <span class="font-mono text-white/60">{{ launchProgress }}%</span>
            </div>
            <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-accent via-indigo-500 to-emerald-400 transition-all duration-200" :style="{ width: `${launchProgress}%` }" />
            </div>
          </div>
        </div>

        <!-- Wizard Navigation Footer -->
        <div class="flex items-center justify-between border-t border-white/10 pt-5 mt-6">
          <button
            v-if="currentStep > 1"
            :disabled="isLaunching"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40"
            @click="prevStep"
          >
            <icon-lucide-arrow-left class="size-3.5" />
            <span>Back</span>
          </button>
          <div v-else />

          <button
            :disabled="!canProceed || isLaunching"
            class="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/25 cursor-pointer"
            @click="nextStep"
          >
            <span v-if="currentStep < 4">Continue to Step {{ currentStep + 1 }}</span>
            <span v-else>Launch NexDesign Studio</span>
            <icon-lucide-arrow-right class="size-3.5" />
          </button>
        </div>

      </div>
    </main>

    <!-- Footer Branding -->
    <footer class="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-white/40 border-t border-white/5">
      <div class="flex items-center gap-2">
        <span>Powered by <strong>Nexus Design Studios</strong></span>
        <span class="opacity-40">·</span>
        <span>CanvasKit Skia WASM</span>
      </div>
      <div class="flex items-center gap-4">
        <span>Figma Plugin API Compatible</span>
        <span class="opacity-40">·</span>
        <span class="font-mono">Local & Cloud Ready</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
