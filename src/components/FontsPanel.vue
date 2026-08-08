<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSelectionState, useEditorFontPicker } from '@nex-design/vue'
import { listAllFamilies, requestLocalFontAccess } from '@/app/editor/fonts'

const { selectedNode: node } = useSelectionState()
const { previewFont, restoreFont, applyFont: doApplyFont } = useEditorFontPicker()

const allFamilies = ref<string[]>([])
const searchQuery = ref('')
const previewSize = ref(16)
const emit = defineEmits<{ (e: 'select', family: string): void }>()

onMounted(async () => {
  try {
    await requestLocalFontAccess()
  } catch {}
  const entries = await listAllFamilies()
  allFamilies.value = entries.map((e) => e.family)
})

const filteredFamilies = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const list = allFamilies.value
  if (!query) return list.slice(0, 100)

  const results = []
  for (let i = 0; i < list.length; i++) {
    const f = list[i]
    if (f.toLowerCase().includes(query)) {
      results.push(f)
      if (results.length >= 100) break
    }
  }
  return results
})

async function applyFont(family: string) {
  await doApplyFont(family)
  emit('select', family)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-panel">
    <!-- Controls: Search and Size Slider -->
    <div class="p-3 border-b border-border flex flex-col gap-2.5 shrink-0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search fonts..."
        class="w-full rounded border border-border bg-input px-2.5 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
      />
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-[10px] text-muted uppercase font-medium flex-1">
          <span>Preview Size</span>
          <input
            v-model.number="previewSize"
            type="range"
            min="10"
            max="36"
            class="flex-1 accent-accent"
          />
          <span class="w-8 text-right">{{ previewSize }}px</span>
        </div>
        <button
          class="text-[10px] text-accent hover:underline px-1 py-0.5"
          title="Enable System Local Fonts"
          @click="
            requestLocalFontAccess()
              .then(listAllFamilies)
              .then((res) => (allFamilies = res.map((e) => e.family)))
          "
        >
          + Local Fonts
        </button>
      </div>
    </div>

    <!-- Font List -->
    <div class="flex-1 overflow-y-auto scrollbar-thin p-1.5 flex flex-col gap-1">
      <div v-if="filteredFamilies.length === 0" class="py-6 text-center text-xs text-muted">
        No fonts found.
      </div>
      <button
        v-for="family in filteredFamilies"
        :key="family"
        class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-hover transition-colors flex flex-col gap-1.5 border border-transparent hover:border-border cursor-pointer"
        :class="{
          'border-accent/40 bg-accent/5': node?.type === 'TEXT' && node.fontFamily === family
        }"
        @mouseenter="previewFont(family)"
        @mouseleave="restoreFont()"
        @click="applyFont(family)"
      >
        <span class="text-[9px] text-muted uppercase font-semibold tracking-wider">{{
          family
        }}</span>
        <span
          :style="{ fontFamily: `'${family}', sans-serif`, fontSize: `${previewSize}px` }"
          class="text-surface truncate leading-tight"
        >
          {{ family }}
        </span>
      </button>
    </div>
  </div>
</template>
