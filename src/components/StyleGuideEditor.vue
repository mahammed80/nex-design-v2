<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/app/editor/active-store'
import FontPicker from '@/components/FontPicker.vue'
import FillPicker from '@/components/FillPicker.vue'
import { parseColor, colorToHex, colorToCSS } from '@nex-design/core/color'
import type { Fill } from '@nex-design/core/scene-graph'
import type { Color } from '@nex-design/core/types'

const store = useEditorStore()

// Reactivity on sceneVersion changes
const variables = computed(() => {
  void store.state.sceneVersion
  return [...store.graph.variables.values()]
})

// Unified Color & Gradient Palette variables
const colorPaletteVariables = computed(() => {
  return variables.value.filter(
    (v) => v.type === 'COLOR' || (v.type === 'STRING' && v.name.startsWith('gradient-'))
  )
})

// Segment FLOAT variables into spacing vs font size
const fontSizeVariables = computed(() =>
  variables.value.filter((v) => v.type === 'FLOAT' && v.name.startsWith('font-size-'))
)
const spacingVariables = computed(() =>
  variables.value.filter((v) => v.type === 'FLOAT' && !v.name.startsWith('font-size-'))
)

const fontVariables = computed(() =>
  variables.value.filter(
    (v) =>
      v.type === 'STRING' &&
      (v.name.startsWith('font-') || v.name.startsWith('font-family-')) &&
      !v.name.startsWith('font-size-')
  )
)
const logoVariables = computed(() =>
  variables.value.filter((v) => v.type === 'STRING' && v.name.startsWith('logo-'))
)

const previewFontFamily = computed(() => {
  if (fontVariables.value.length > 0) {
    return fontVariables.value[0].valuesByMode.default as string
  }
  return 'Inter'
})

function randomHex(length = 8) {
  const arr = new Uint8Array(length / 2)
  crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, '0')).join('')
}

function ensureCollection() {
  let col = store.getCollections()[0]
  if (!col) {
    const colId = `col:default`
    col = {
      id: colId,
      name: 'Default',
      modes: [{ modeId: 'default', name: 'Mode 1' }],
      defaultModeId: 'default',
      variableIds: []
    }
    store.addCollection(col)
  }
  return col
}

// Initialize standard typography scale variables if missing
function initTypographyVariables() {
  const col = ensureCollection()
  const defaults = [
    { name: 'font-size-display-1', val: 72 },
    { name: 'font-size-heading-1', val: 54 },
    { name: 'font-size-heading-2', val: 40 },
    { name: 'font-size-heading-3', val: 32 },
    { name: 'font-size-body', val: 16 },
    { name: 'font-size-button', val: 14 }
  ]

  store.undo.beginBatch('Initialize typography variables')
  let changed = false
  for (const item of defaults) {
    const exists = variables.value.find((v) => v.type === 'FLOAT' && v.name === item.name)
    if (!exists) {
      const id = `var:${randomHex(8)}`
      store.addVariable({
        id,
        name: item.name,
        type: 'FLOAT',
        collectionId: col.id,
        valuesByMode: { default: item.val },
        description: '',
        hiddenFromPublishing: false
      })
      changed = true
    }
  }
  store.undo.commitBatch()
  if (changed) {
    store.requestRender()
    store.state.sceneVersion++
  }
}

initTypographyVariables()

function addColorVariable() {
  const col = ensureCollection()
  const id = `var:${randomHex(8)}`

  store.undo.beginBatch('Add color variable')
  store.addVariable({
    id,
    name: 'color-' + randomHex(4),
    type: 'COLOR',
    collectionId: col.id,
    valuesByMode: {
      default: { r: 0.9, g: 0.2, b: 0.2, a: 1 }
    },
    description: '',
    hiddenFromPublishing: false
  })
  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

function addSpacingVariable() {
  const col = ensureCollection()
  const id = `var:${randomHex(8)}`

  store.undo.beginBatch('Add float variable')
  store.addVariable({
    id,
    name: 'spacing-' + randomHex(4),
    type: 'FLOAT',
    collectionId: col.id,
    valuesByMode: {
      default: 16
    },
    description: '',
    hiddenFromPublishing: false
  })
  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

function removeVariable(id: string) {
  store.undo.beginBatch('Remove variable')
  store.removeVariable(id)
  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

function updateVariableName(id: string, name: string) {
  store.renameVariable(id, name)
  store.state.sceneVersion++
}

function updateVariableValue(id: string, val: any) {
  store.updateVariableValue(id, 'default', val)
  store.state.sceneVersion++
}

// Linear Gradient Parser & Serializer helpers
function parseLinearGradient(css: any): { angle: number; color1: string; color2: string } {
  if (typeof css !== 'string') return { angle: 135, color1: '#12B07A', color2: '#76C693' }
  const regex =
    /linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\)/i
  const match = css.match(regex)
  if (match) {
    return {
      angle: parseInt(match[1], 10),
      color1: match[2],
      color2: match[3]
    }
  }
  return { angle: 135, color1: '#12B07A', color2: '#76C693' }
}

function fillToGradientString(fill: Fill): string {
  if (fill.type !== 'GRADIENT_LINEAR' || !fill.gradientStops) {
    return 'linear-gradient(135deg, #12B07A 0%, #76C693 100%)'
  }

  let angle = 135
  if (fill.gradientTransform) {
    const t = fill.gradientTransform
    angle = Math.round(Math.atan2(t.m10, t.m00) * (180 / Math.PI)) + 90
    if (angle < 0) angle += 360
  }

  const stopsStr = fill.gradientStops
    .map((s) => `${colorToCSS(s.color)} ${Math.round(s.position * 100)}%`)
    .join(', ')

  return `linear-gradient(${angle}deg, ${stopsStr})`
}

function gradientStringToFill(css: string): Fill {
  const fallbackFill: Fill = {
    type: 'GRADIENT_LINEAR',
    color: { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: [
      { position: 0, color: { r: 0.07, g: 0.69, b: 0.48, a: 1 } },
      { position: 1, color: { r: 0.46, g: 0.78, b: 0.58, a: 1 } }
    ],
    gradientTransform: {
      m00: 0.707,
      m01: -0.707,
      m02: 0.15,
      m10: 0.707,
      m11: 0.707,
      m12: 0.15
    }
  }

  if (typeof css !== 'string') return fallbackFill

  const mainRegex = /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(.*)\s*\)/i
  const match = css.match(mainRegex)
  if (!match) return fallbackFill

  const angle = parseInt(match[1], 10)
  const stopsText = match[2]

  const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)\s+(\d+)%/g
  const stops: Array<{ position: number; color: Color }> = []

  let stopMatch
  while ((stopMatch = stopRegex.exec(stopsText)) !== null) {
    const colorStr = stopMatch[1]
    const pos = parseInt(stopMatch[2], 10) / 100
    try {
      const parsed = parseColor(colorStr)
      if (parsed) {
        stops.push({ position: pos, color: parsed })
      }
    } catch (e) {
      // Ignore invalid colors
    }
  }

  if (stops.length < 2) return fallbackFill

  const theta = ((angle - 90) * Math.PI) / 180
  const dx = Math.cos(theta)
  const dy = Math.sin(theta)

  const startX = 0.5 - dx / 2
  const startY = 0.5 - dy / 2
  const gradientTransform = {
    m00: dx,
    m01: -dy,
    m02: startX,
    m10: dy,
    m11: dx,
    m12: startY
  }

  return {
    type: 'GRADIENT_LINEAR',
    color: stops[0]?.color || { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: stops,
    gradientTransform
  }
}

function getFillFromVariable(v: any): Fill {
  if (v.type === 'COLOR') {
    return {
      type: 'SOLID',
      visible: true,
      opacity: 1,
      color: v.valuesByMode.default
    }
  } else if (
    v.type === 'STRING' &&
    (v.valuesByMode.default as string).startsWith('linear-gradient')
  ) {
    return gradientStringToFill(v.valuesByMode.default)
  }
  return {
    type: 'SOLID',
    visible: true,
    opacity: 1,
    color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
  }
}

function getSwatchBackground(v: any): string {
  if (v.type === 'COLOR') {
    return colorToCSS(v.valuesByMode.default)
  } else if (
    v.type === 'STRING' &&
    (v.valuesByMode.default as string).startsWith('linear-gradient')
  ) {
    return v.valuesByMode.default
  }
  return 'transparent'
}

function getVariableValueText(v: any): string {
  if (v.type === 'COLOR') {
    return colorToHex(v.valuesByMode.default)
  } else if (
    v.type === 'STRING' &&
    (v.valuesByMode.default as string).startsWith('linear-gradient')
  ) {
    const parsed = parseLinearGradient(v.valuesByMode.default)
    return `${parsed.color1} → ${parsed.color2}`
  }
  return String(v.valuesByMode.default)
}

function handleFillUpdate(id: string, newFill: Fill) {
  const v = store.graph.variables.get(id)
  if (!v) return

  store.undo.beginBatch('Update palette style')

  if (newFill.type === 'SOLID' && newFill.color) {
    if (v.type !== 'COLOR') {
      v.type = 'COLOR'
      if (v.name.startsWith('gradient-')) {
        const baseName = v.name.substring(9)
        store.renameVariable(id, 'color-' + baseName)
      }
    }
    store.updateVariableValue(id, 'default', newFill.color)
  } else if (newFill.type.startsWith('GRADIENT')) {
    const cssGradient = fillToGradientString(newFill)
    if (v.type !== 'STRING') {
      v.type = 'STRING'
      if (v.name.startsWith('color-')) {
        const baseName = v.name.substring(6)
        store.renameVariable(id, 'gradient-' + baseName)
      }
    }
    store.updateVariableValue(id, 'default', cssGradient)
  }

  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

function getFontSizeVal(name: string): number {
  const v = variables.value.find((v) => v.type === 'FLOAT' && v.name === name)
  return v ? (v.valuesByMode.default as number) : 16
}

function getFontSizeLabel(name: string): string {
  return name
    .replace('font-size-', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Typography Font Family variable helpers
function addFontVariable() {
  const col = ensureCollection()
  const id = `var:${randomHex(8)}`

  store.undo.beginBatch('Add font variable')
  store.addVariable({
    id,
    name: 'font-' + randomHex(4),
    type: 'STRING',
    collectionId: col.id,
    valuesByMode: {
      default: 'Inter'
    },
    description: '',
    hiddenFromPublishing: false
  })
  store.undo.commitBatch()
  store.requestRender()
  store.state.sceneVersion++
}

// Brand Logos variable helpers
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
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  store.undo.beginBatch(replacingLogoId.value ? 'Replace logo image' : 'Add logo variable')
  const hash = store.storeImage(bytes)

  if (replacingLogoId.value) {
    const prevVal = store.graph.variables.get(replacingLogoId.value)?.valuesByMode.default as string
    updateVariableValue(replacingLogoId.value, hash)
    // Clean up old object URL if any
    if (prevVal && imageSrcs[prevVal]) {
      URL.revokeObjectURL(imageSrcs[prevVal])
      delete imageSrcs[prevVal]
    }
    replacingLogoId.value = null
  } else {
    const col = ensureCollection()
    const id = `var:${randomHex(8)}`
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
      valuesByMode: {
        default: hash
      },
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
    if (text.includes('<svg') || text.includes('<?xml')) {
      mime = 'image/svg+xml'
    }
  }
  const blob = new Blob([bytes as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  imageSrcs[hash] = url
  return url
}

function deleteLogoVariable(id: string) {
  const v = store.graph.variables.get(id)
  if (v && v.type === 'STRING') {
    const hash = v.valuesByMode.default as string
    if (imageSrcs[hash]) {
      URL.revokeObjectURL(imageSrcs[hash])
      delete imageSrcs[hash]
    }
  }
  removeVariable(id)
}

onBeforeUnmount(() => {
  // Clean up all cached object URLs
  for (const url of Object.values(imageSrcs)) {
    URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <div class="absolute inset-0 flex flex-col bg-canvas p-8 overflow-y-auto z-40 select-none">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between border-b border-border pb-4 shrink-0">
      <div>
        <h1 class="text-xl font-bold flex items-center gap-2 text-surface">
          <icon-lucide-sparkles class="text-accent size-5 animate-pulse" />
          Style Guide Variables
        </h1>
        <p class="text-xs text-muted mt-1">
          Define global design styles as variables. Changes here automatically update all connected
          shapes across your pages.
        </p>
      </div>
    </div>

    <!-- Hidden File Input for Logo upload -->
    <input
      type="file"
      ref="logoInputRef"
      accept="image/*"
      class="hidden"
      @change="handleLogoUpload"
    />

    <!-- Style Guide Sections Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl flex-1 pb-16">
      <!-- LEFT COLUMN (Colors, Gradients & Logos) - 7 cols on large screens -->
      <div class="lg:col-span-7 flex flex-col gap-8">
        <!-- Colors & Gradients Palette Section -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2
              class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
            >
              <icon-lucide-palette class="size-4 text-accent" />
              Color & Gradient Palette
            </h2>
            <button
              class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
              @click="addColorVariable"
            >
              <icon-lucide-plus class="size-3" />
              Add Swatch
            </button>
          </div>

          <div
            v-if="colorPaletteVariables.length === 0"
            class="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted"
          >
            No colors or gradients defined. Click "+ Add Swatch" to begin.
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
            <div
              v-for="v in colorPaletteVariables"
              :key="v.id"
              class="flex flex-col gap-2.5 p-3 rounded-xl bg-panel border border-border/80 shadow-sm relative group hover:border-accent/40 hover:shadow-md transition-all duration-200"
            >
              <!-- Swatch Preview Block -->
              <div
                class="w-full aspect-video rounded-lg border border-border bg-checkerboard relative overflow-hidden transition-all group-hover:scale-[1.01]"
                :style="{ background: getSwatchBackground(v) }"
              >
                <!-- Delete button on hover -->
                <button
                  class="absolute top-2 right-2 hidden group-hover:flex cursor-pointer items-center justify-center p-1.5 rounded-md bg-panel/90 border border-border hover:text-red-500 hover:border-red-500/20 shadow-sm transition-all"
                  title="Delete style"
                  @click="removeVariable(v.id)"
                >
                  <icon-lucide-trash-2 class="size-3.5" />
                </button>
              </div>

              <!-- Swatch Details -->
              <div class="flex flex-col gap-1">
                <!-- Variable Name input -->
                <input
                  type="text"
                  :value="v.name"
                  placeholder="style-name"
                  class="w-full bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
                  @change="updateVariableName(v.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- Value and Picker Controls -->
                <div
                  class="flex items-center justify-between gap-2 mt-1 border-t border-border/40 pt-2"
                >
                  <span class="text-[9px] font-mono text-muted uppercase truncate max-w-[70%]">
                    {{ getVariableValueText(v) }}
                  </span>

                  <FillPicker
                    :fill="getFillFromVariable(v)"
                    :swatch-background="getSwatchBackground(v)"
                    @update="handleFillUpdate(v.id, $event)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Brand Logos Section -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2
              class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
            >
              <icon-lucide-image class="size-4 text-accent" />
              Brand Logos
            </h2>
            <button
              class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
              @click="triggerLogoUpload"
            >
              <icon-lucide-plus class="size-3" />
              Add Logo
            </button>
          </div>

          <div
            v-if="logoVariables.length === 0"
            class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
          >
            No logos uploaded. Click "+ Add Logo" to upload your brand assets.
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
            <div
              v-for="v in logoVariables"
              :key="v.id"
              class="card-bubble flex flex-col items-center relative group/logo p-3 rounded-lg bg-panel border border-border shadow-sm hover:shadow-md transition-all"
            >
              <!-- Checkerboard wrapper for transparent logos -->
              <div
                class="relative flex items-center justify-center w-full aspect-video rounded bg-checkerboard border border-border/80 overflow-hidden mb-3"
              >
                <img
                  v-if="v.valuesByMode.default"
                  :src="resolveImageHash(String(v.valuesByMode.default))"
                  alt="Brand Logo"
                  class="max-w-[85%] max-h-[85%] object-contain"
                />

                <!-- Replace overlay on hover -->
                <button
                  class="absolute inset-0 bg-black/60 text-white text-xs font-semibold opacity-0 group-hover/logo:opacity-100 flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
                  @click="triggerLogoReplace(v.id)"
                >
                  <icon-lucide-upload class="size-3.5" />
                  Replace Logo
                </button>
              </div>

              <!-- Logo Details (Name input + Delete) -->
              <div class="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  :value="v.name"
                  placeholder="logo-name"
                  class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0 text-center"
                  @change="updateVariableName(v.id, ($event.target as HTMLInputElement).value)"
                />

                <button
                  class="cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none shrink-0"
                  title="Delete logo"
                  @click="deleteLogoVariable(v.id)"
                >
                  <icon-lucide-trash-2 class="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN (Typography & Spacing) - 5 cols on large screens -->
      <div class="lg:col-span-5 flex flex-col gap-8">
        <!-- Typography & Font Families -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2
              class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
            >
              <icon-lucide-type class="size-4 text-accent" />
              Typography & Fonts
            </h2>
            <button
              class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
              @click="addFontVariable"
            >
              <icon-lucide-plus class="size-3" />
              Add Font
            </button>
          </div>

          <div
            v-if="fontVariables.length === 0"
            class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
          >
            No font families defined. Click "+ Add Font" to begin.
          </div>

          <div v-else class="flex flex-col gap-6 mt-2">
            <!-- Font Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="v in fontVariables"
                :key="v.id"
                class="card-bubble flex flex-col items-center relative group/font p-4 rounded-lg bg-panel border border-border shadow-sm"
              >
                <!-- Aa Box preview -->
                <div
                  class="w-full aspect-video rounded bg-input border border-border flex items-center justify-center flex-col gap-1 mb-3"
                  :style="{ fontFamily: `'${v.valuesByMode.default}', sans-serif` }"
                >
                  <span class="text-4xl font-semibold text-surface">Aa</span>
                  <span class="text-[10px] text-muted">{{ v.valuesByMode.default }}</span>
                </div>

                <!-- Font Details (Variable name, Picker, Delete) -->
                <div class="flex flex-col gap-2 w-full">
                  <div class="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      :value="v.name"
                      placeholder="font-name"
                      class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
                      @change="updateVariableName(v.id, ($event.target as HTMLInputElement).value)"
                    />
                    <button
                      class="cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none shrink-0"
                      title="Delete font variable"
                      @click="removeVariable(v.id)"
                    >
                      <icon-lucide-trash-2 class="size-3.5" />
                    </button>
                  </div>

                  <FontPicker
                    class="w-full bg-input"
                    :model-value="String(v.valuesByMode.default)"
                    @select="updateVariableValue(v.id, $event)"
                  />
                </div>
              </div>
            </div>

            <!-- Typography Scale Font Sizes -->
            <div class="flex flex-col gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted/80">
                Typography Scale Font Sizes (px)
              </h3>
              <div
                class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-panel border border-border/80 shadow-sm"
              >
                <div
                  v-for="v in fontSizeVariables"
                  :key="v.id"
                  class="flex flex-col gap-1.5 p-2 rounded bg-input border border-border/40 hover:border-accent/30 transition-all"
                >
                  <span class="text-[9px] text-muted font-bold tracking-wide truncate">{{
                    getFontSizeLabel(v.name)
                  }}</span>
                  <div class="flex items-center gap-1.5">
                    <input
                      type="number"
                      :value="v.valuesByMode.default"
                      class="w-full bg-transparent text-xs font-mono text-surface border-none outline-none p-0 focus:ring-0"
                      @change="
                        updateVariableValue(v.id, Number(($event.target as HTMLInputElement).value))
                      "
                    />
                    <span class="text-[8px] text-muted font-bold">PX</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Typography Scale Preview -->
            <div class="flex flex-col gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted/80">
                Typography Scale Preview
              </h3>
              <div
                class="flex flex-col gap-6 p-6 rounded-lg bg-panel border border-border shadow-sm"
                :style="{ fontFamily: `'${previewFontFamily}', sans-serif` }"
              >
                <div class="flex flex-col border-b border-border/40 pb-4">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Display 1 ({{ getFontSizeVal('font-size-display-1') }}px, Bold)</span
                  >
                  <h1
                    :style="{ fontSize: getFontSizeVal('font-size-display-1') + 'px' }"
                    class="font-bold leading-none tracking-tight text-surface"
                  >
                    Display 1
                  </h1>
                </div>

                <div class="flex flex-col border-b border-border/40 pb-4">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Heading 1 ({{ getFontSizeVal('font-size-heading-1') }}px, Bold)</span
                  >
                  <h2
                    :style="{ fontSize: getFontSizeVal('font-size-heading-1') + 'px' }"
                    class="font-bold leading-tight text-surface"
                  >
                    Heading 1
                  </h2>
                </div>

                <div class="flex flex-col border-b border-border/40 pb-4">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Heading 2 ({{ getFontSizeVal('font-size-heading-2') }}px, Bold)</span
                  >
                  <h3
                    :style="{ fontSize: getFontSizeVal('font-size-heading-2') + 'px' }"
                    class="font-bold leading-snug text-surface"
                  >
                    Heading 2
                  </h3>
                </div>

                <div class="flex flex-col border-b border-border/40 pb-4">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Heading 3 ({{ getFontSizeVal('font-size-heading-3') }}px, Bold)</span
                  >
                  <h4
                    :style="{ fontSize: getFontSizeVal('font-size-heading-3') + 'px' }"
                    class="font-bold leading-normal text-surface"
                  >
                    Heading 3
                  </h4>
                </div>

                <div class="flex flex-col border-b border-border/40 pb-4">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Paragraph ({{ getFontSizeVal('font-size-body') }}px, Regular)</span
                  >
                  <p
                    :style="{ fontSize: getFontSizeVal('font-size-body') + 'px' }"
                    class="font-normal text-muted leading-relaxed"
                  >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                    incididunt ut labore et dolore magna aliqua.
                  </p>
                </div>

                <div class="flex flex-col">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-wider mb-1"
                    >Button / Link ({{ getFontSizeVal('font-size-button') }}px, Semibold)</span
                  >
                  <div class="flex items-center gap-4 mt-2">
                    <button
                      :style="{ fontSize: getFontSizeVal('font-size-button') + 'px' }"
                      class="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded shadow transition-colors cursor-default"
                    >
                      Button
                    </button>
                    <a
                      href="#"
                      :style="{ fontSize: getFontSizeVal('font-size-button') + 'px' }"
                      class="text-accent hover:underline font-semibold"
                      @click.prevent
                      >Hyperlink</a
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacings & Sizing Section -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2
              class="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5"
            >
              <icon-lucide-layout-grid class="size-4 text-accent" />
              Spacings & Sizes
            </h2>
            <button
              class="flex cursor-pointer items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-accent/90 transition-colors"
              @click="addSpacingVariable"
            >
              <icon-lucide-plus class="size-3" />
              Add Spacing
            </button>
          </div>

          <div
            v-if="spacingVariables.length === 0"
            class="rounded border border-dashed border-border p-8 text-center text-xs text-muted"
          >
            No spacing/size variables defined. Click "+ Add Spacing" to begin.
          </div>

          <div v-else class="flex flex-col gap-3 mt-2">
            <div
              v-for="v in spacingVariables"
              :key="v.id"
              class="flex items-center gap-3 w-full group/spacing"
            >
              <!-- Sizing graphic representation -->
              <div
                class="flex items-center justify-center size-8 rounded-lg bg-panel border border-border shrink-0"
              >
                <icon-lucide-move-horizontal class="text-muted size-4" />
              </div>

              <!-- Figma Comment Speech Bubble Style for sizing -->
              <div
                class="figma-comment-bubble flex-1 flex items-center justify-between gap-4 p-2 px-3 rounded-lg bg-panel border border-border shadow-sm relative"
              >
                <!-- Label name input -->
                <input
                  type="text"
                  :value="v.name"
                  placeholder="variable-name"
                  class="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-surface border-none outline-none focus:ring-0 p-0"
                  @change="updateVariableName(v.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- Size value input -->
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    :value="v.valuesByMode.default"
                    class="w-14 bg-input text-right text-xs font-mono text-surface border border-border rounded px-1 py-0.5 outline-none focus:border-accent"
                    @change="
                      updateVariableValue(v.id, Number(($event.target as HTMLInputElement).value))
                    "
                  />
                  <span class="text-[9px] text-muted uppercase font-semibold">px</span>

                  <button
                    class="ml-1 cursor-pointer text-muted hover:text-red-500 transition-colors focus:outline-none"
                    title="Delete spacing"
                    @click="removeVariable(v.id)"
                  >
                    <icon-lucide-trash-2 class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.figma-comment-bubble {
  position: relative;
  background: var(--color-bg-panel, #ffffff);
}
/* Speech bubble pointer arrow at bottom center */
.figma-comment-bubble::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: inherit;
  border-right: 1px solid var(--color-border, #e2e8f0);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.card-bubble {
  background: var(--color-bg-panel, #ffffff);
}

.bg-checkerboard {
  background-color: var(--color-bg-panel, #ffffff);
  background-image:
    linear-gradient(45deg, var(--color-border, #e2e8f0) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-border, #e2e8f0) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-border, #e2e8f0) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-border, #e2e8f0) 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0;
}
</style>
