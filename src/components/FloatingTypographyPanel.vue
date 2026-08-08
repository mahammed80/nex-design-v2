<script setup lang="ts">
import { computed } from 'vue'
import { PopoverRoot, PopoverContent, PopoverAnchor, PopoverPortal } from 'reka-ui'
import { useEditorStore } from '@/app/editor/active-store'
import TypographySection from './properties/TypographySection.vue'
import FontsPanel from './FontsPanel.vue'
import FillSection from './properties/FillSection.vue'

const store = useEditorStore()

const textNode = computed(() => {
  if (store.state.selectedIds.size !== 1) return null
  const id = [...store.state.selectedIds][0]
  const node = store.graph.getNode(id)
  return node?.type === 'TEXT' ? node : null
})

const virtualAnchor = computed(() => {
  if (!textNode.value) return null
  const node = textNode.value
  const abs = store.graph.getAbsolutePosition(node.id)

  // Transform to screen coordinates
  const screenX = abs.x * store.state.zoom + store.state.panX
  const screenY = abs.y * store.state.zoom + store.state.panY
  const screenW = node.width * store.state.zoom
  const screenH = node.height * store.state.zoom

  return {
    getBoundingClientRect: () =>
      DOMRect.fromRect({ x: screenX, y: screenY, width: screenW, height: screenH })
  }
})
</script>

<template>
  <PopoverRoot :open="!!textNode" :modal="false">
    <PopoverAnchor :virtual-element="virtualAnchor" v-if="virtualAnchor" />
    <PopoverPortal>
      <PopoverContent
        v-if="textNode"
        side="right"
        :side-offset="24"
        align="start"
        @interact-outside="(e) => e.preventDefault()"
        class="z-50 w-[280px] rounded-xl border border-white/10 bg-panel/95 p-0 shadow-2xl backdrop-blur-md overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div class="flex-1 flex flex-col h-[400px]">
          <div class="flex-1 overflow-hidden min-h-[200px]">
            <FontsPanel />
          </div>
          <div class="h-px bg-white/5 shrink-0" />
          <div class="overflow-y-auto max-h-[250px] scrollbar-thin p-3">
            <TypographySection />
            <FillSection />
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
