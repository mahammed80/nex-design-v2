<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useFileDialog, useObjectUrl } from '@vueuse/core'

import AppSelect from './ui/AppSelect.vue'
import PickerSlider from './PickerSlider.vue'

import { useEditorStore } from '@/app/editor/active-store'

import type {
  Fill,
  ImageScaleMode,
  ImageFilters,
  BgRemovalSettings,
  BlendSettings
} from '@nex-design/core/scene-graph'

const IMAGE_SCALE_MODES: { value: ImageScaleMode; label: string }[] = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

const { fill } = defineProps<{ fill: Fill }>()
const emit = defineEmits<{ update: [fill: Fill] }>()

const store = useEditorStore()

const imageBlob = shallowRef<Blob | null>(null)
const imagePreviewUrl = useObjectUrl(imageBlob)

// Collapsible menus state
const showBasic = ref(true)
const showColorCorrection = ref(false)
const showCMYK = ref(false)
const showCurves = ref(true)

const colorInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => fill.imageHash,
  (hash) => {
    if (!hash) {
      imageBlob.value = null
      return
    }
    const data = store.getImage(hash)
    imageBlob.value = data ? new Blob([data as BlobPart]) : null
  },
  { immediate: true }
)

// Auto-detect background color when a new image is loaded and background removal is enabled
watch(imageBlob, async (newBlob) => {
  if (newBlob && bgRemovalEnabled.value) {
    try {
      const color = await detectBackgroundColor(newBlob)
      updateBgRemovalSetting('targetColor', color)
    } catch (e) {
      console.error('Failed to auto-detect background color on image change:', e)
    }
  }
})

const { open: pickImage, onChange: onFileChange } = useFileDialog({
  accept: 'image/png,image/jpeg,image/webp',
  multiple: false
})

onFileChange(async (files) => {
  const file = files?.[0]
  if (!file) return
  const bytes = new Uint8Array(await file.arrayBuffer())
  const hash = store.storeImage(bytes)
  emit('update', {
    ...fill,
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: fill.imageScaleMode ?? 'FILL'
  })
})

const scaleMode = computed({
  get: () => fill.imageScaleMode ?? ('FILL' as ImageScaleMode),
  set: (mode: ImageScaleMode) => emit('update', { ...fill, imageScaleMode: mode })
})

// Filters & Adjustments
const activeChannel = ref<'RGB' | 'R' | 'G' | 'B'>('RGB')
const svgRef = ref<SVGSVGElement | null>(null)

// Basic Adjustments
const brightness = computed({
  get: () => Math.round((fill.filters?.brightness ?? 0) * 100),
  set: (val: number) => updateFilter('brightness', val / 100)
})

const contrast = computed({
  get: () => Math.round((fill.filters?.contrast ?? 0) * 100),
  set: (val: number) => updateFilter('contrast', val / 100)
})

const exposure = computed({
  get: () => Math.round((fill.filters?.exposure ?? 0) * 100),
  set: (val: number) => updateFilter('exposure', val / 100)
})

const highlights = computed({
  get: () => Math.round((fill.filters?.highlights ?? 0) * 100),
  set: (val: number) => updateFilter('highlights', val / 100)
})

const shadows = computed({
  get: () => Math.round((fill.filters?.shadows ?? 0) * 100),
  set: (val: number) => updateFilter('shadows', val / 100)
})

const whites = computed({
  get: () => Math.round((fill.filters?.whites ?? 0) * 100),
  set: (val: number) => updateFilter('whites', val / 100)
})

const blacks = computed({
  get: () => Math.round((fill.filters?.blacks ?? 0) * 100),
  set: (val: number) => updateFilter('blacks', val / 100)
})

const gamma = computed({
  get: () => Math.round((fill.filters?.gamma ?? 0) * 100),
  set: (val: number) => updateFilter('gamma', Math.max(-0.9, Math.min(2.0, val / 100)))
})

// Color Correction
const hue = computed({
  get: () => Math.round((fill.filters?.hue ?? 0) * 100),
  set: (val: number) => updateFilter('hue', val / 100)
})

const saturation = computed({
  get: () => Math.round((fill.filters?.saturation ?? 0) * 100),
  set: (val: number) => updateFilter('saturation', val / 100)
})

const vibrance = computed({
  get: () => Math.round((fill.filters?.vibrance ?? 0) * 100),
  set: (val: number) => updateFilter('vibrance', val / 100)
})

const temperature = computed({
  get: () => Math.round((fill.filters?.temperature ?? 0) * 100),
  set: (val: number) => updateFilter('temperature', val / 100)
})

const tint = computed({
  get: () => Math.round((fill.filters?.tint ?? 0) * 100),
  set: (val: number) => updateFilter('tint', val / 100)
})

// CMYK Adjustments
const cyan = computed({
  get: () => Math.round((fill.filters?.cyan ?? 0) * 100),
  set: (val: number) => updateFilter('cyan', val / 100)
})

const magenta = computed({
  get: () => Math.round((fill.filters?.magenta ?? 0) * 100),
  set: (val: number) => updateFilter('magenta', val / 100)
})

const yellow = computed({
  get: () => Math.round((fill.filters?.yellow ?? 0) * 100),
  set: (val: number) => updateFilter('yellow', val / 100)
})

const key = computed({
  get: () => Math.round((fill.filters?.key ?? 0) * 100),
  set: (val: number) => updateFilter('key', val / 100)
})

// Background Removal State & Utilities
const bgRemovalEnabled = computed({
  get: () => fill.filters?.bgRemoval?.enabled ?? false,
  set: (val: boolean) => updateBgRemovalSetting('enabled', val)
})

import { IS_BROWSER } from '@/constants'

const bgTargetColorHex = computed(() => {
  return rgbToHex(fill.filters?.bgRemoval?.targetColor ?? [0, 1, 0])
})

const hasEyeDropper = IS_BROWSER && 'EyeDropper' in window

async function startEyeDropper() {
  if (!hasEyeDropper) return
  try {
    const EyeDropperClass = (
      window as Window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper
    if (!EyeDropperClass) return
    const eyeDropper = new EyeDropperClass()
    const result = await eyeDropper.open()
    updateBgTargetColor(result.sRGBHex)
  } catch (err) {
    console.error('Failed to open eye dropper:', err)
  }
}

function updateBgTargetColor(hex: string) {
  updateBgRemovalSetting('targetColor', hexToRgb(hex))
}

async function toggleBgRemoval() {
  const nextVal = !bgRemovalEnabled.value

  if (nextVal) {
    // Auto-detect color from image corners
    if (imageBlob.value) {
      try {
        const color = await detectBackgroundColor(imageBlob.value)
        updateBgRemovalSetting('targetColor', color)
      } catch (e) {
        console.error('Failed to auto-detect background color:', e)
        updateBgRemovalSetting('targetColor', [1.0, 1.0, 1.0])
      }
    }
  }

  updateBgRemovalSetting('enabled', nextVal)
}

function updateBgRemovalSetting(key: keyof BgRemovalSettings, value: unknown) {
  const currentFilters = fill.filters ?? {}
  const currentBg = currentFilters.bgRemoval ?? {}
  const newBg = { ...currentBg, [key]: value }
  const newFilters = { ...currentFilters, bgRemoval: newBg }
  emit('update', { ...fill, filters: newFilters })
}

const showBlend = ref(false)
const blendColorInputRef = ref<HTMLInputElement | null>(null)

const blendEnabled = computed({
  get: () => fill.filters?.blend?.enabled ?? false,
  set: (val: boolean) => updateBlendSetting('enabled', val)
})

const blendMode = computed({
  get: () => fill.filters?.blend?.mode ?? 'multiply',
  set: (val: string) => updateBlendSetting('mode', val)
})

const blendColorHex = computed(() => {
  return rgbToHex(fill.filters?.blend?.color ?? [1, 1, 1])
})

const blendOpacity = computed({
  get: () => Math.round((fill.filters?.blend?.opacity ?? 1.0) * 100),
  set: (val: number) => updateBlendSetting('opacity', val / 100)
})

function updateBlendColor(hex: string) {
  updateBlendSetting('color', hexToRgb(hex))
}

function updateBlendSetting(key: keyof BlendSettings, value: unknown) {
  const currentFilters = fill.filters ?? {}
  const currentBlend = currentFilters.blend ?? {}
  const newBlend = { ...currentBlend, [key]: value }
  const newFilters = { ...currentFilters, blend: newBlend }
  emit('update', { ...fill, filters: newFilters })
}

const lumaThresholdEnabled = computed({
  get: () => fill.filters?.lumaThresholdEnabled ?? false,
  set: (val: boolean) => updateFilter('lumaThresholdEnabled', val)
})

const lumaThreshold = computed({
  get: () => Math.round((fill.filters?.lumaThreshold ?? 0.1) * 100),
  set: (val: number) => updateFilter('lumaThreshold', val / 100)
})

const lumaTolerance = computed({
  get: () => Math.round((fill.filters?.lumaTolerance ?? 0.05) * 100),
  set: (val: number) => updateFilter('lumaTolerance', val / 100)
})

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return [r, g, b]
}

function rgbToHex(rgb: [number, number, number]): string {
  const r = Math.round(rgb[0] * 255)
    .toString(16)
    .padStart(2, '0')
  const g = Math.round(rgb[1] * 255)
    .toString(16)
    .padStart(2, '0')
  const b = Math.round(rgb[2] * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${r}${g}${b}`
}

function detectBackgroundColor(blob: Blob): Promise<[number, number, number]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.src = url
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve([1.0, 1.0, 1.0])
        return
      }
      ctx.drawImage(img, 0, 0)

      const w = img.width
      const h = img.height

      // Sample the four corners (inset slightly)
      const corners = [
        ctx.getImageData(Math.min(4, w - 1), Math.min(4, h - 1), 1, 1).data,
        ctx.getImageData(Math.max(0, w - 5), Math.min(4, h - 1), 1, 1).data,
        ctx.getImageData(Math.min(4, w - 1), Math.max(0, h - 5), 1, 1).data,
        ctx.getImageData(Math.max(0, w - 5), Math.max(0, h - 5), 1, 1).data
      ]

      // Find average background color
      let r = 0,
        g = 0,
        b = 0
      for (const c of corners) {
        r += c[0]
        g += c[1]
        b += c[2]
      }

      resolve([r / 4 / 255, g / 4 / 255, b / 4 / 255])
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
  })
}

// Curves logic
const currentCurvePoints = computed((): [number, number][] => {
  const f = fill.filters
  let pts: [number, number][] = []
  if (activeChannel.value === 'R')
    pts = f?.pointsR ?? [
      [0, 0],
      [1, 1]
    ]
  else if (activeChannel.value === 'G')
    pts = f?.pointsG ?? [
      [0, 0],
      [1, 1]
    ]
  else if (activeChannel.value === 'B')
    pts = f?.pointsB ?? [
      [0, 0],
      [1, 1]
    ]
  else
    pts = f?.pointsR ?? [
      [0, 0],
      [1, 1]
    ]
  return [...pts].sort((a, b) => a[0] - b[0])
})

const curvePath = computed(() => {
  const pts = currentCurvePoints.value
  if (pts.length === 0) return ''
  let d = `M ${pts[0][0] * 180} ${180 - pts[0][1] * 180}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0] * 180} ${180 - pts[i][1] * 180}`
  }
  return d
})

function updateFilter(key: keyof ImageFilters, value: unknown) {
  const currentFilters = fill.filters ?? {}
  const newFilters = { ...currentFilters, [key]: value }

  // Cleanup defaults to keep scene graph thin
  if (value === 0) {
    delete newFilters[key]
  }

  emit('update', {
    ...fill,
    filters: Object.keys(newFilters).length > 0 ? newFilters : undefined
  })
}

function updateCurvePoints(newPoints: [number, number][]) {
  const currentFilters = fill.filters ?? {}
  const sorted = [...newPoints].sort((a, b) => a[0] - b[0])
  const newFilters = { ...currentFilters }

  if (activeChannel.value === 'RGB' || activeChannel.value === 'R') {
    newFilters.pointsR = sorted
  }
  if (activeChannel.value === 'RGB' || activeChannel.value === 'G') {
    newFilters.pointsG = sorted
  }
  if (activeChannel.value === 'RGB' || activeChannel.value === 'B') {
    newFilters.pointsB = sorted
  }

  emit('update', { ...fill, filters: newFilters })
}

function handleSvgPointerDown(event: PointerEvent) {
  event.preventDefault()
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const clickX = (event.clientX - rect.left) / rect.width
  const clickY = 1.0 - (event.clientY - rect.top) / rect.height

  const pts = [...currentCurvePoints.value]

  let closestIndex = -1
  let minDistance = 0.07

  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i][0] - clickX
    const dy = pts[i][1] - clickY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDistance) {
      minDistance = dist
      closestIndex = i
    }
  }

  if (event.detail === 2 && closestIndex !== -1) {
    if (closestIndex !== 0 && closestIndex !== pts.length - 1) {
      pts.splice(closestIndex, 1)
      updateCurvePoints(pts)
    }
    return
  }

  if (closestIndex === -1 && pts.length < 8) {
    const newPt: [number, number] = [clickX, clickY]
    pts.push(newPt)
    pts.sort((a, b) => a[0] - b[0])
    closestIndex = pts.indexOf(newPt)
    updateCurvePoints(pts)
  }

  if (closestIndex === -1) return

  const s = svgRef.value
  if (!s) return

  s.setPointerCapture(event.pointerId)

  function onPointerMove(e: PointerEvent) {
    let x = (e.clientX - rect.left) / rect.width
    let y = 1.0 - (e.clientY - rect.top) / rect.height

    x = Math.max(0, Math.min(1, x))
    y = Math.max(0, Math.min(1, y))

    if (closestIndex === 0) {
      x = 0
    } else if (closestIndex === pts.length - 1) {
      x = 1
    } else {
      const prevX = pts[closestIndex - 1]?.[0] ?? 0
      const nextX = pts[closestIndex + 1]?.[0] ?? 1
      x = Math.max(prevX + 0.01, Math.min(nextX - 0.01, x))
    }

    pts[closestIndex] = [x, y]
    updateCurvePoints(pts)
  }

  function onPointerUp(e: PointerEvent) {
    const currentSvg = svgRef.value
    if (currentSvg) {
      currentSvg.releasePointerCapture(e.pointerId)
      currentSvg.removeEventListener('pointermove', onPointerMove)
      currentSvg.removeEventListener('pointerup', onPointerUp)
    }
  }

  s.addEventListener('pointermove', onPointerMove)
  s.addEventListener('pointerup', onPointerUp)
}

function resetAdjustments() {
  emit('update', { ...fill, filters: undefined })
}

function checkNumericFilters(f: ImageFilters): boolean {
  const numericKeys: (keyof ImageFilters)[] = [
    'brightness',
    'contrast',
    'exposure',
    'highlights',
    'shadows',
    'whites',
    'blacks',
    'gamma',
    'hue',
    'saturation',
    'vibrance',
    'temperature',
    'tint',
    'cyan',
    'magenta',
    'yellow',
    'key'
  ]
  return numericKeys.some((k) => ((f[k] as number | undefined) ?? 0) !== 0)
}

const hasAnyFilters = computed(() => {
  const f = fill.filters
  if (!f) return false
  if (checkNumericFilters(f)) return true
  if (f.pointsR || f.pointsG || f.pointsB) return true
  return Boolean(f.bgRemoval?.enabled || f.blend?.enabled)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Image Selector & Preview -->
    <div class="space-y-2">
      <div
        v-if="imagePreviewUrl"
        class="flex h-24 items-center justify-center overflow-hidden rounded border border-border bg-input"
      >
        <img :src="imagePreviewUrl" class="max-h-full max-w-full object-contain" />
      </div>
      <div class="flex gap-2">
        <button
          class="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded border border-border bg-input text-xs text-surface hover:bg-hover transition-colors"
          data-test-id="fill-picker-choose-image"
          @click="pickImage()"
        >
          <icon-lucide-image class="size-3" />
          {{ fill.imageHash ? 'Replace' : 'Choose' }}
        </button>
        <button
          v-if="fill.imageHash"
          class="flex h-7 px-2 cursor-pointer items-center justify-center gap-1 rounded border transition-colors text-xs select-none"
          :class="
            bgRemovalEnabled
              ? 'bg-accent text-[#151b18] border-accent font-medium'
              : 'border-border bg-input text-surface hover:bg-hover'
          "
          title="Remove Background"
          @click="toggleBgRemoval"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-3"
          >
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
            />
          </svg>
          Bg Removal
        </button>
        <button
          v-if="hasAnyFilters"
          class="flex h-7 px-2 cursor-pointer items-center justify-center rounded border border-border bg-input text-xs text-accent hover:bg-hover transition-colors"
          @click="resetAdjustments"
        >
          Reset
        </button>
      </div>
      <AppSelect
        :model-value="scaleMode"
        :options="IMAGE_SCALE_MODES"
        @update:model-value="(m) => (scaleMode = m as ImageScaleMode)"
      />

      <!-- Auto Detected background color and Eyedropper override -->
      <div
        v-if="bgRemovalEnabled"
        class="flex items-center justify-between border-t border-border pt-2 pb-1"
      >
        <span class="text-[10px] text-muted font-bold uppercase tracking-wider"
          >Detected Color</span
        >
        <div class="flex items-center gap-2">
          <!-- Swatch button triggers hidden color input -->
          <button
            class="w-5 h-5 rounded border border-border cursor-pointer transition-transform hover:scale-105"
            :style="{ backgroundColor: bgTargetColorHex }"
            @click="colorInputRef?.click()"
            title="Adjust background color"
          />
          <input
            ref="colorInputRef"
            type="color"
            :value="bgTargetColorHex"
            @input="updateBgTargetColor(($event.target as HTMLInputElement).value)"
            class="sr-only"
          />

          <!-- Eyedropper button (if supported) -->
          <button
            v-if="hasEyeDropper"
            class="flex size-5 items-center justify-center rounded border border-border bg-input hover:bg-hover transition-colors text-surface cursor-pointer"
            title="Pick color from screen"
            @click="startEyeDropper"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              class="size-2.5"
            >
              <path d="m15 4 5 5v0a2 2 0 0 1 0 3L11 21H3v-8L12 4a2 2 0 0 1 3 0Z" />
              <path d="M17 11 11 5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 1. Basic Adjustments Folder -->
    <div class="border-t border-border pt-3">
      <div
        class="flex items-center justify-between cursor-pointer select-none pb-1"
        @click="showBasic = !showBasic"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center">
          <span
            class="mr-1.5 inline-block transition-transform duration-100 font-mono text-[8px]"
            :style="{ transform: showBasic ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >▶</span
          >
          Basic Adjustments
        </span>
      </div>

      <div v-show="showBasic" class="space-y-2 mt-1 pl-2">
        <PickerSlider
          label="Brightness"
          v-model="brightness"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-brightness"
        />
        <PickerSlider
          label="Contrast"
          v-model="contrast"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-contrast"
        />
        <PickerSlider
          label="Exposure"
          v-model="exposure"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-exposure"
        />
        <PickerSlider
          label="Highlights"
          v-model="highlights"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-highlights"
        />
        <PickerSlider
          label="Shadows"
          v-model="shadows"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-shadows"
        />
        <PickerSlider
          label="Whites"
          v-model="whites"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-whites"
        />
        <PickerSlider
          label="Blacks"
          v-model="blacks"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-blacks"
        />
        <PickerSlider
          label="Gamma"
          v-model="gamma"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-gamma"
        />
      </div>
    </div>

    <!-- 2. Color Correction Folder -->
    <div class="border-t border-border pt-3">
      <div
        class="flex items-center justify-between cursor-pointer select-none pb-1"
        @click="showColorCorrection = !showColorCorrection"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center">
          <span
            class="mr-1.5 inline-block transition-transform duration-100 font-mono text-[8px]"
            :style="{ transform: showColorCorrection ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >▶</span
          >
          Color Correction
        </span>
      </div>

      <div v-show="showColorCorrection" class="space-y-2 mt-1 pl-2">
        <PickerSlider
          label="Hue"
          v-model="hue"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-hue"
        />
        <PickerSlider
          label="Saturation"
          v-model="saturation"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-saturation"
        />
        <PickerSlider
          label="Vibrance"
          v-model="vibrance"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-vibrance"
        />
        <PickerSlider
          label="Temp"
          v-model="temperature"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-temp"
        />
        <PickerSlider
          label="Tint"
          v-model="tint"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-tint"
        />
      </div>
    </div>

    <!-- 3. CMYK Adjustments Folder -->
    <div class="border-t border-border pt-3">
      <div
        class="flex items-center justify-between cursor-pointer select-none pb-1"
        @click="showCMYK = !showCMYK"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center">
          <span
            class="mr-1.5 inline-block transition-transform duration-100 font-mono text-[8px]"
            :style="{ transform: showCMYK ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >▶</span
          >
          CMYK Balances
        </span>
      </div>

      <div v-show="showCMYK" class="space-y-2 mt-1 pl-2">
        <PickerSlider
          label="Cyan"
          v-model="cyan"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-cyan"
        />
        <PickerSlider
          label="Magenta"
          v-model="magenta"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-magenta"
        />
        <PickerSlider
          label="Yellow"
          v-model="yellow"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-yellow"
        />
        <PickerSlider
          label="Key (Black)"
          v-model="key"
          :min="-100"
          :max="100"
          :step="1"
          testId="image-filter-key"
        />
      </div>
    </div>

    <!-- Luma Threshold Blend Settings Folder -->
    <div class="border-t border-border pt-3">
      <div
        class="flex items-center justify-between cursor-pointer select-none pb-1"
        @click="showBlend = !showBlend"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center">
          <span
            class="mr-1.5 inline-block transition-transform duration-100 font-mono text-[8px]"
            :style="{ transform: showBlend ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >▶</span
          >
          Luma Threshold Blend Settings
        </span>
      </div>

      <div v-show="showBlend" class="space-y-3 mt-1 pl-2">
        <!-- Luma Keying -->
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted"
            >Enable Luma Key</span
          >
          <input
            type="checkbox"
            v-model="lumaThresholdEnabled"
            class="rounded border-border bg-input text-accent focus:ring-0 cursor-pointer"
          />
        </div>

        <div v-if="lumaThresholdEnabled" class="space-y-3 pt-1">
          <PickerSlider label="Threshold" v-model="lumaThreshold" :min="0" :max="100" :step="1" />
          <PickerSlider label="Tolerance" v-model="lumaTolerance" :min="0" :max="100" :step="1" />
        </div>

        <div class="border-t border-border/40 my-2" />

        <!-- Blending -->
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted"
            >Enable Blend</span
          >
          <input
            type="checkbox"
            v-model="blendEnabled"
            class="rounded border-border bg-input text-accent focus:ring-0 cursor-pointer"
          />
        </div>

        <div v-if="blendEnabled" class="space-y-3 pt-1">
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted uppercase font-semibold">Mode</span>
            <select
              v-model="blendMode"
              class="w-full h-7 rounded border border-border bg-input text-xs text-surface px-1.5 focus:outline-none focus:border-accent"
            >
              <optgroup label="Darken Group">
                <option value="darken">Darken</option>
                <option value="multiply">Multiply</option>
                <option value="color-burn">Color Burn</option>
                <option value="linear-burn">Linear Burn</option>
              </optgroup>
              <optgroup label="Lighten Group">
                <option value="lighten">Lighten</option>
                <option value="screen">Screen</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="linear-dodge">Linear Dodge (Add)</option>
              </optgroup>
              <optgroup label="Contrast Group">
                <option value="overlay">Overlay</option>
                <option value="soft-light">Soft Light</option>
                <option value="hard-light">Hard Light</option>
                <option value="vivid-light">Vivid Light</option>
              </optgroup>
              <optgroup label="Difference Group">
                <option value="difference">Difference</option>
                <option value="exclusion">Exclusion</option>
                <option value="subtract">Subtract</option>
                <option value="divide">Divide</option>
              </optgroup>
              <optgroup label="Color Group">
                <option value="hue">Hue</option>
                <option value="saturation">Saturation</option>
                <option value="color">Color</option>
                <option value="luminosity">Luminosity</option>
              </optgroup>
            </select>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-surface">Blend Color</span>
            <div class="flex items-center gap-2">
              <button
                class="w-5 h-5 rounded border border-border cursor-pointer transition-transform hover:scale-105"
                :style="{ backgroundColor: blendColorHex }"
                @click="blendColorInputRef?.click()"
              />
              <input
                ref="blendColorInputRef"
                type="color"
                :value="blendColorHex"
                @input="updateBlendColor(($event.target as HTMLInputElement).value)"
                class="sr-only"
              />
            </div>
          </div>

          <PickerSlider label="Opacity" v-model="blendOpacity" :min="0" :max="100" :step="1" />
        </div>
      </div>
    </div>

    <!-- 4. Curves Section -->
    <div class="border-t border-border pt-3">
      <div
        class="flex items-center justify-between cursor-pointer select-none pb-1"
        @click="showCurves = !showCurves"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center">
          <span
            class="mr-1.5 inline-block transition-transform duration-100 font-mono text-[8px]"
            :style="{ transform: showCurves ? 'rotate(90deg)' : 'rotate(0deg)' }"
            >▶</span
          >
          Curves
        </span>
      </div>

      <div v-show="showCurves" class="space-y-2 mt-1">
        <!-- Channel Tabs -->
        <div class="flex gap-1">
          <button
            v-for="ch in ['RGB', 'R', 'G', 'B'] as const"
            :key="ch"
            class="flex-1 py-0.5 rounded text-[10px] border transition-colors cursor-pointer text-center"
            :class="
              activeChannel === ch
                ? 'bg-accent text-[#151b18] border-accent font-medium'
                : 'border-border text-muted hover:bg-hover hover:text-surface'
            "
            @click="activeChannel = ch"
          >
            {{ ch }}
          </button>
        </div>

        <!-- Curves Grid / SVG Graph -->
        <div class="flex items-center justify-center py-1">
          <svg
            ref="svgRef"
            width="180"
            height="180"
            class="bg-input border border-border rounded overflow-visible touch-none select-none"
            @pointerdown="handleSvgPointerDown"
          >
            <!-- Grid lines -->
            <line
              x1="45"
              y1="0"
              x2="45"
              y2="180"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <line
              x1="90"
              y1="0"
              x2="90"
              y2="180"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <line
              x1="135"
              y1="0"
              x2="135"
              y2="180"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <line
              x1="0"
              y1="45"
              x2="180"
              y2="45"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <line
              x1="0"
              y1="90"
              x2="180"
              y2="90"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />
            <line
              x1="0"
              y1="135"
              x2="180"
              y2="135"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 2"
            />

            <!-- Diagonal guide -->
            <line
              x1="0"
              y1="180"
              x2="180"
              y2="0"
              stroke="var(--color-border)"
              stroke-width="1"
              opacity="0.5"
            />

            <!-- Piecewise Linear Spline Line -->
            <path :d="curvePath" fill="none" stroke="var(--color-accent)" stroke-width="2.5" />

            <!-- Interactive Handles -->
            <template v-for="(pt, idx) in currentCurvePoints" :key="idx">
              <!-- Visual handle dot -->
              <circle
                :cx="pt[0] * 180"
                :cy="180 - pt[1] * 180"
                r="4.5"
                fill="var(--color-accent)"
                stroke="#ffffff"
                stroke-width="1.5"
                pointer-events="none"
              />
            </template>
          </svg>
        </div>
        <div class="text-[9px] text-muted text-center italic">
          Click on grid to add node. Double click a node to delete.
        </div>
      </div>
    </div>
  </div>
</template>
