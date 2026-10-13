<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { applyDesignMarkdown, defaultModeValue } from '@/app/design-system/design-markdown'
import { DESIGN_TEMPLATES, designTemplateMarkdown } from '@/app/design-system/templates'
import StyleGuideColors from '@/components/StyleGuideEditor/StyleGuideColors.vue'
import StyleGuideDesignMarkdown from '@/components/StyleGuideEditor/StyleGuideDesignMarkdown.vue'
import StyleGuideLogos from '@/components/StyleGuideEditor/StyleGuideLogos.vue'
import StyleGuideSpacing from '@/components/StyleGuideEditor/StyleGuideSpacing.vue'
import StyleGuideTypography from '@/components/StyleGuideEditor/StyleGuideTypography.vue'
import {
  addColorVariable as addColor,
  addFontVariable as addFont,
  addSpacingVariable as addSpacing,
  ensureDefaultCollection,
  handleFillUpdate as handleFill,
  removeVariable as removeVar,
  updateVariableName as renameVar,
  updateVariableValue as updateVal
} from '@/components/StyleGuideEditor/store-helpers'
import { useStyleGuideCategories } from '@/components/StyleGuideEditor/useStyleGuideCategories'
import {
  DESIGN_SYSTEM_TUTORIAL_STEPS,
  STYLE_GUIDE_PRESETS,
  type DesignPreset,
  type StyleGuideVariable
} from '@/components/StyleGuideEditor/utils'
import {
  exportDesignTokens,
  findStyleGuidePage,
  readDesignSystem,
  type DesignExportFormat
} from '@nex-design/core/design-system'
import { randomHex } from '@nex-design/core/random'
import type { Fill, VariableValue } from '@nex-design/core/scene-graph'

const store = useEditorStore()

// ── Interactive Guide & Presets State ──
const showTutorial = ref(false)
const activeTutorialStep = ref(1)
const showPresetModal = ref(false)
const showExportModal = ref(false)
const exportFormat = ref<DesignExportFormat>('css')
const copiedCode = ref(false)

const variables = computed<StyleGuideVariable[]>(() => {
  void store.state.sceneVersion
  return [...store.graph.variables.values()].map((v) => ({
    ...v,
    value: defaultModeValue(store.graph, v)
  }))
})

const {
  colorPaletteVariables,
  fontSizeVariables,
  fontVariables,
  spacingVariables,
  logoVariables,
  getFontSizeVal,
  getFontSizeLabel
} = useStyleGuideCategories(variables)

const previewFontFamily = computed(() => {
  const value = fontVariables.value[0]?.value
  return typeof value === 'string' ? value : 'Inter'
})

function onAddColor() {
  addColor(store)
}
function onAddSpacing() {
  addSpacing(store)
}
function onAddFont() {
  addFont(store)
}
function onRemove(id: string) {
  removeVar(store, id)
}
function onRename(id: string, name: string) {
  renameVar(store, id, name)
}
function onUpdateVal(id: string, val: VariableValue) {
  updateVal(store, id, val)
}
function onUpdateFill(id: string, fill: Fill) {
  handleFill(store, id, fill)
}

// ── 1-Click Starter Preset / Template Loader ──
function loadPreset(preset: Pick<DesignPreset, 'markdown'>) {
  applyDesignMarkdown(store, preset.markdown)
  showPresetModal.value = false
}

// ── Return to Canvas / First Non-StyleGuide Page ──
function returnToCanvas() {
  const styleGuideId = findStyleGuidePage(store.graph)?.id
  const nonStyleGuidePage = store.graph.getPages().find((p) => p.id !== styleGuideId)
  if (nonStyleGuidePage) {
    void store.switchPage(nonStyleGuidePage.id)
  } else {
    const newPageId = store.addPage('Page 1')
    void store.switchPage(newPageId)
  }
}

// ── Code Generator (CSS / Tailwind v4 / JSON / W3C DTCG) ──
const generatedTokensCode = computed(() => {
  void store.state.sceneVersion
  return exportDesignTokens(readDesignSystem(store.graph), exportFormat.value)
})

function copyCode() {
  void navigator.clipboard.writeText(generatedTokensCode.value)
  copiedCode.value = true
  setTimeout(() => {
    copiedCode.value = false
  }, 1500)
}

const logoInputRef = ref<HTMLInputElement | null>(null)
const replacingLogoId = ref<string | null>(null)
const imageSrcs: Record<string, string> = {}

function triggerLogoUpload() {
  replacingLogoId.value = null
  logoInputRef.value?.click()
}

function triggerLogoReplace(id: string) {
  replacingLogoId.value = id
  logoInputRef.value?.click()
}

async function handleLogoUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  const file = files[0]
  const bytes = new Uint8Array(await file.arrayBuffer())

  store.undo.beginBatch(replacingLogoId.value ? 'Replace logo image' : 'Add logo variable')
  const hash = store.storeImage(bytes)

  if (replacingLogoId.value) {
    const prevVal = String(variables.value.find((v) => v.id === replacingLogoId.value)?.value ?? '')
    onUpdateVal(replacingLogoId.value, hash)
    if (prevVal && imageSrcs[prevVal]) {
      URL.revokeObjectURL(imageSrcs[prevVal])
      delete imageSrcs[prevVal]
    }
    replacingLogoId.value = null
  } else {
    const col = ensureDefaultCollection(store)
    const id = `var:${randomHex(4)}`
    const cleanName =
      'logo-' +
      file.name
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
    store.addVariable({
      id,
      name: cleanName,
      type: 'STRING',
      collectionId: col.id,
      valuesByMode: { [col.defaultModeId]: hash },
      description: '',
      hiddenFromPublishing: false
    })
  }

  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
  if (logoInputRef.value) logoInputRef.value.value = ''
}

function resolveImageHash(hash: string) {
  if (imageSrcs[hash]) return imageSrcs[hash]
  const bytes = store.graph.images.get(hash)
  if (!bytes) return ''
  let mime = 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mime = 'image/jpeg'
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    mime = 'image/png'
  } else {
    const text = new TextDecoder().decode(bytes.slice(0, 100))
    if (text.includes('<svg') || text.includes('<?xml')) mime = 'image/svg+xml'
  }
  const blob = new Blob([bytes as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  imageSrcs[hash] = url
  return url
}

function deleteLogoVariable(id: string) {
  const v = variables.value.find((item) => item.id === id)
  if (v && v.type === 'STRING') {
    const hash = String(v.value ?? '')
    if (imageSrcs[hash]) {
      URL.revokeObjectURL(imageSrcs[hash])
      delete imageSrcs[hash]
    }
  }
  onRemove(id)
}

onBeforeUnmount(() => {
  for (const url of Object.values(imageSrcs)) {
    URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <div
    class="absolute inset-0 flex flex-col bg-zinc-950/95 backdrop-blur-3xl p-6 lg:p-10 overflow-y-auto z-40 select-none scrollbar-thin text-white"
  >
    <!-- ── TOP GLASS NAV BAR ── -->
    <header
      class="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/15 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_16px_36px_rgba(0,0,0,0.5)] shrink-0"
    >
      <div class="flex items-center gap-3.5">
        <div
          class="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-[0_0_24px_rgba(225,29,72,0.45)]"
        >
          <icon-lucide-layers class="size-5" />
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Style Guide & Design Tokens
            </h1>
            <span
              class="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-mono font-bold text-rose-300 border border-rose-500/30"
            >
              {{ variables.length }} Tokens
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-0.5">
            Single source of truth. Changes instantly propagate to shapes and code generators across
            pages.
          </p>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-2.5">
        <!-- Tutorial Guide Button -->
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 text-xs font-semibold text-rose-300 shadow-sm transition-all hover:bg-rose-500/20 hover:scale-105 active:scale-95"
          @click="showTutorial = !showTutorial"
        >
          <icon-lucide-book-open class="size-4" />
          <span>{{ showTutorial ? 'Hide Architecture Guide' : 'Design System Guide' }}</span>
        </button>

        <!-- Starter Presets Button -->
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-white/15 hover:border-rose-500/40 hover:scale-105 active:scale-95"
          @click="showPresetModal = true"
        >
          <icon-lucide-sparkles class="size-4 text-rose-400" />
          <span>Starter Presets</span>
        </button>

        <!-- Export Code Button -->
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-white/15 hover:scale-105 active:scale-95"
          @click="showExportModal = true"
        >
          <icon-lucide-code-2 class="size-4 text-zinc-300" />
          <span>Export Code</span>
        </button>

        <!-- Return to Canvas Button -->
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 text-xs font-bold shadow-lg shadow-rose-600/20 transition-all hover:scale-105 active:scale-95"
          @click="returnToCanvas"
        >
          <icon-lucide-arrow-left class="size-4" />
          <span>Return to Canvas</span>
        </button>
      </div>
    </header>

    <!-- ── INTERACTIVE DESIGN SYSTEM TUTORIAL & WIZARD (EXPANDABLE) ── -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <section
        v-if="showTutorial"
        class="mb-8 rounded-[30px] border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-black/80 to-black/90 backdrop-blur-2xl p-6 shadow-[0_20px_50px_rgba(225,29,72,0.1)] relative overflow-hidden"
      >
        <div class="flex items-center justify-between border-b border-rose-500/20 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <div
              class="flex size-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30"
            >
              <icon-lucide-book-open class="size-4.5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-white tracking-tight">
                Design System Architecture & Engineering Principles
              </h2>
              <p class="text-xs text-zinc-400">
                Step-by-step principles for structuring bulletproof design tokens and scalable UI
                component libraries.
              </p>
            </div>
          </div>
          <button
            class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            @click="showTutorial = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </div>

        <!-- Step Tabs -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          <button
            v-for="step in DESIGN_SYSTEM_TUTORIAL_STEPS"
            :key="step.step"
            class="flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all text-xs font-semibold"
            :class="
              activeTutorialStep === step.step
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-sm'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            @click="activeTutorialStep = step.step"
          >
            <span class="text-rose-400 font-mono font-bold">{{ step.step }}.</span>
            <span class="truncate">{{ step.title.split('(')[0] }}</span>
          </button>
        </div>

        <!-- Active Step Details Card -->
        <div
          v-if="DESIGN_SYSTEM_TUTORIAL_STEPS[activeTutorialStep - 1]"
          class="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur-md"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span class="size-2 rounded-full bg-rose-500" />
                <span>{{ DESIGN_SYSTEM_TUTORIAL_STEPS[activeTutorialStep - 1].title }}</span>
              </h3>
              <p class="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                {{ DESIGN_SYSTEM_TUTORIAL_STEPS[activeTutorialStep - 1].summary }}
              </p>
            </div>
            <span
              class="rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-mono text-rose-300 font-bold shrink-0 border border-rose-500/30"
            >
              Step {{ activeTutorialStep }} of 5
            </span>
          </div>

          <ul class="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs text-zinc-400">
            <li
              v-for="(point, idx) in DESIGN_SYSTEM_TUTORIAL_STEPS[activeTutorialStep - 1].points"
              :key="idx"
              class="flex items-start gap-2"
            >
              <span class="text-rose-400 mt-0.5">▪</span>
              <span class="text-zinc-200">{{ point }}</span>
            </li>
          </ul>

          <div
            class="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-200"
          >
            <span class="font-bold shrink-0">Architecture Best Practice:</span>
            <span>{{ DESIGN_SYSTEM_TUTORIAL_STEPS[activeTutorialStep - 1].proTip }}</span>
          </div>

          <div class="mt-4 flex items-center justify-between pt-2">
            <button
              class="flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="activeTutorialStep <= 1"
              @click="activeTutorialStep--"
            >
              <icon-lucide-chevron-left class="size-4" />
              Previous Step
            </button>
            <button
              class="flex items-center gap-1 rounded-xl bg-rose-600 text-white px-4 py-1.5 text-xs font-bold cursor-pointer hover:bg-rose-500 transition-colors shadow-md shadow-rose-600/20"
              @click="activeTutorialStep < 5 ? activeTutorialStep++ : (showTutorial = false)"
            >
              <span>{{ activeTutorialStep < 5 ? 'Next Step' : 'Done & Close Guide' }}</span>
              <icon-lucide-chevron-right v-if="activeTutorialStep < 5" class="size-4" />
            </button>
          </div>
        </div>
      </section>
    </Transition>

    <input
      ref="logoInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleLogoUpload"
    />

    <!-- ── MAIN GLASS BENTO GRID ── -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl flex-1 pb-16">
      <!-- Left Column: Direction & Colors & Logos -->
      <div class="lg:col-span-7 flex flex-col gap-8">
        <StyleGuideDesignMarkdown />
        <StyleGuideColors
          :variables="colorPaletteVariables"
          @add="onAddColor"
          @remove="onRemove"
          @rename="onRename"
          @update-value="onUpdateVal"
          @update-fill="onUpdateFill"
        />

        <StyleGuideLogos
          :variables="logoVariables"
          :resolve-image-hash="resolveImageHash"
          @upload="triggerLogoUpload"
          @replace="triggerLogoReplace"
          @remove="deleteLogoVariable"
          @rename="onRename"
        />
      </div>

      <!-- Right Column: Typography & Spacing -->
      <div class="lg:col-span-5 flex flex-col gap-8">
        <StyleGuideTypography
          :font-variables="fontVariables"
          :font-size-variables="fontSizeVariables"
          :preview-font-family="previewFontFamily"
          :get-font-size-val="getFontSizeVal"
          :get-font-size-label="getFontSizeLabel"
          @add-font="onAddFont"
          @remove-font="onRemove"
          @rename-font="onRename"
          @update-value="onUpdateVal"
        />

        <StyleGuideSpacing
          :variables="spacingVariables"
          @add="onAddSpacing"
          @remove="onRemove"
          @rename="onRename"
          @update-value="onUpdateVal"
        />
      </div>
    </div>

    <!-- ── STARTER PRESETS MODAL ── -->
    <div
      v-if="showPresetModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
      @click="showPresetModal = false"
    >
      <div
        class="relative w-full max-w-2xl rounded-[32px] border border-white/20 bg-zinc-950/95 backdrop-blur-3xl p-6 shadow-2xl"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30"
            >
              <icon-lucide-layers class="size-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Starter Design System Presets</h3>
              <p class="text-xs text-zinc-400">
                Instantly apply brand colors, typography hierarchy, and spacing tokens.
              </p>
            </div>
          </div>
          <button
            class="flex size-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"
            @click="showPresetModal = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="preset in STYLE_GUIDE_PRESETS"
            :key="preset.id"
            class="group flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br"
            :class="preset.gradient"
            @click="loadPreset(preset)"
          >
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">{{ preset.icon }}</span>
                <h4
                  class="text-sm font-bold text-white group-hover:text-rose-300 transition-colors"
                >
                  {{ preset.name }}
                </h4>
              </div>
              <p class="text-xs text-zinc-300 leading-relaxed">{{ preset.subtitle }}</p>
            </div>

            <button
              class="mt-4 flex items-center justify-center gap-1.5 w-full rounded-xl bg-white/10 group-hover:bg-rose-600 group-hover:text-white py-2 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
            >
              <span>Apply Preset</span>
              <icon-lucide-arrow-right class="size-3.5" />
            </button>
          </div>
        </div>

        <h4 class="mt-6 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
          DESIGN.md templates
        </h4>
        <div class="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 scrollbar-thin">
          <button
            v-for="template in DESIGN_TEMPLATES"
            :key="template.id"
            :data-test-id="`style-guide-template-${template.id}`"
            class="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-rose-500/40 hover:bg-white/10 cursor-pointer"
            @click="loadPreset({ markdown: designTemplateMarkdown(template.file) })"
          >
            <span class="text-xs font-bold text-white">{{ template.name }}</span>
            <span class="text-[11px] leading-snug text-zinc-400">{{ template.description }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── CODE EXPORT MODAL ── -->
    <div
      v-if="showExportModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
      @click="showExportModal = false"
    >
      <div
        class="relative w-full max-w-2xl rounded-[32px] border border-white/20 bg-zinc-950/95 backdrop-blur-3xl p-6 shadow-2xl"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30"
            >
              <icon-lucide-code-2 class="size-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Export Design System Tokens</h3>
              <p class="text-xs text-zinc-400">
                Copy code for use in frontend codebases and stylesheets.
              </p>
            </div>
          </div>
          <button
            class="flex size-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"
            @click="showExportModal = false"
          >
            <icon-lucide-x class="size-4" />
          </button>
        </div>

        <!-- Format Switcher Tabs -->
        <div class="flex items-center gap-2 mb-4 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              exportFormat === 'css' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
            "
            @click="exportFormat = 'css'"
          >
            CSS Variables
          </button>
          <button
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              exportFormat === 'tailwind'
                ? 'bg-rose-600 text-white'
                : 'text-zinc-400 hover:text-white'
            "
            @click="exportFormat = 'tailwind'"
          >
            Tailwind v4
          </button>
          <button
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              exportFormat === 'json' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
            "
            @click="exportFormat = 'json'"
          >
            JSON Tokens
          </button>
          <button
            class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              exportFormat === 'dtcg' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
            "
            @click="exportFormat = 'dtcg'"
          >
            W3C DTCG
          </button>
        </div>

        <!-- Code Preview Box -->
        <pre
          class="h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-xs text-zinc-300 scrollbar-thin select-text"
          >{{ generatedTokensCode }}</pre
        >

        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-zinc-400 font-mono"
            >{{ variables.length }} variables exported</span
          >
          <button
            class="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold shadow-md cursor-pointer transition-all"
            @click="copyCode"
          >
            <icon-lucide-check v-if="copiedCode" class="size-4" />
            <icon-lucide-copy v-else class="size-4" />
            <span>{{ copiedCode ? 'Copied to Clipboard!' : 'Copy Code' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
