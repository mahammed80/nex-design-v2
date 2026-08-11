<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
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
  initDefaultTypographyVariables,
  removeVariable as removeVar,
  updateVariableName as renameVar,
  updateVariableValue as updateVal
} from '@/components/StyleGuideEditor/store-helpers'
import { randomHex } from '@/components/StyleGuideEditor/utils'
import type { Fill, VariableValue } from '@nex-design/core/scene-graph'

const store = useEditorStore()

const variables = computed(() => {
  void store.state.sceneVersion
  return [...store.graph.variables.values()]
})

const colorPaletteVariables = computed(() =>
  variables.value.filter(
    (v) => v.type === 'COLOR' || (v.type === 'STRING' && v.name.startsWith('gradient-'))
  )
)
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

initDefaultTypographyVariables(store, variables.value)

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
    const prevVal = store.graph.variables.get(replacingLogoId.value)?.valuesByMode.default as string
    onUpdateVal(replacingLogoId.value, hash)
    if (prevVal && imageSrcs[prevVal]) {
      URL.revokeObjectURL(imageSrcs[prevVal])
      delete imageSrcs[prevVal]
    }
    replacingLogoId.value = null
  } else {
    const col = ensureDefaultCollection(store)
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
      valuesByMode: { default: hash },
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
  const v = store.graph.variables.get(id)
  if (v && v.type === 'STRING') {
    const hash = v.valuesByMode.default as string
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
  <div class="absolute inset-0 flex flex-col bg-canvas p-8 overflow-y-auto z-40 select-none">
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

    <input
      type="file"
      ref="logoInputRef"
      accept="image/*"
      class="hidden"
      @change="handleLogoUpload"
    />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl flex-1 pb-16">
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
  </div>
</template>
