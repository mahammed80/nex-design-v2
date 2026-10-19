<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import AppMenu from './AppMenu.vue'
import LayerTree from './LayerTree.vue'
import PagesPanel from './PagesPanel.vue'

const editor = useEditorStore()
const isCollapsed = useLocalStorage('nex-design:layers-collapsed', false)
const activeRailTab = ref<'pages' | 'layers' | 'search'>('layers')

const pageCount = computed(() => {
  void editor?.state?.sceneVersion
  return editor?.graph?.getPages?.()?.length ?? 0
})
const layerCount = computed(() => {
  void editor?.state?.sceneVersion
  if (!editor?.graph || !editor?.state?.currentPageId) return 0
  const page = editor.graph.getNode(editor.state.currentPageId)
  return page?.childIds?.length ?? 0
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function createQuickFrame() {
  editor.setTool('FRAME')
}
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="relative flex flex-col overflow-hidden rounded-[26px] border border-white/15 bg-black/75 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(121,40,202,0.15)] transition-all duration-300 select-none pointer-events-auto mt-7 mb-4 ml-8 self-start max-h-[calc(100%-2.75rem)]"
    :class="isCollapsed ? 'w-14 min-w-[56px] max-w-[56px] items-center' : 'w-72 min-w-[288px] max-w-[320px] min-h-80'"
    style="contain: paint layout style"
  >
    <!-- ── 1. COMPRESSED / SLIM ICON RAIL MODE ── -->
    <div
      v-if="isCollapsed"
      class="flex flex-1 flex-col items-center gap-4 py-3 w-full text-white/80"
    >
      <!-- Top Section: Home & Avatar -->
      <div class="flex flex-col items-center gap-3 w-full">
        <router-link
          to="/"
          data-test-id="layers-panel-rail-home"
          class="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Back to Home Page"
        >
          <icon-lucide-home class="size-4" />
        </router-link>

        <!-- Avatar / Project Icon with Expand Toggle -->
        <button
          class="relative flex size-9 items-center justify-center rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 transition-all cursor-pointer group shadow-sm"
          title="Expand sidebar (click)"
          @click="toggleCollapse"
        >
          <img src="/logo.png" class="size-5 invert object-contain opacity-90 transition-transform group-hover:scale-110" alt="Logo" />
          <div class="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-rose-600 border border-black text-[8px] font-bold text-white">
            <icon-lucide-chevron-right class="size-2.5" />
          </div>
        </button>

        <div class="w-6 h-px bg-white/10 my-1" />

        <!-- Vertical Icon Navigation -->
        <div class="flex flex-col items-center gap-2 w-full px-2">
          <!-- Pages Rail Button -->
          <button
            class="relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer group"
            :class="
              activeRailTab === 'pages'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="Pages"
            @click="activeRailTab = 'pages'; isCollapsed = false"
          >
            <icon-lucide-file-text class="size-4.5" />
            <span
              v-if="pageCount > 1"
              class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-950 border border-rose-500/50 text-[9px] font-mono font-bold text-rose-300"
            >
              {{ pageCount }}
            </span>
          </button>

          <!-- Layers Rail Button -->
          <button
            class="relative flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer group"
            :class="
              activeRailTab === 'layers'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="Layers & Hierarchy"
            @click="activeRailTab = 'layers'; isCollapsed = false"
          >
            <icon-lucide-layers class="size-4.5" />
            <span
              v-if="layerCount > 0"
              class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-zinc-800 border border-white/15 text-[9px] font-mono font-semibold text-zinc-300"
            >
              {{ layerCount }}
            </span>
          </button>

          <!-- Search / Command Palette Rail Button -->
          <button
            class="flex size-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Search & Commands (⌘K)"
            @click="editor.state.showCommandPalette = true"
          >
            <icon-lucide-search class="size-4.5" />
          </button>
        </div>
      </div>

      <!-- Bottom Floating '+' Quick Button -->
      <div class="flex flex-col items-center gap-2">
        <button
          class="flex size-10 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all hover:scale-105 cursor-pointer"
          title="Draw Frame Container (F)"
          @click="createQuickFrame"
        >
          <icon-lucide-plus class="size-5 stroke-[2.5]" />
        </button>
      </div>
    </div>

    <!-- ── 2. EXPANDED GLASS SIDEBAR MODE ── -->
    <template v-else>
      <!-- App identity, rename & menus; collapse toggle rides in its trailing slot -->
      <AppMenu>
        <template #trailing>
          <button
            data-test-id="layers-panel-collapse"
            class="flex size-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Collapse sidebar"
            @click="toggleCollapse"
          >
            <icon-lucide-chevron-left class="size-4" />
          </button>
        </template>
      </AppMenu>

      <!-- 1. PAGES SECTION (hugs its pages, scrolls past the cap) -->
      <div class="flex max-h-56 shrink-0 flex-col overflow-hidden border-b border-white/10 bg-black/20 pb-1">
        <PagesPanel />
      </div>

      <!-- 2. LAYERS SECTION -->
      <div class="flex min-h-0 flex-auto flex-col overflow-hidden">
          <!-- Tabs Header -->
          <div class="shrink-0 border-b border-white/10 px-3 py-2 flex items-center justify-between bg-white/5">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold tracking-wider uppercase text-zinc-400">Layers & Elements</span>
              <span
                data-test-id="layers-panel-count"
                class="px-1.5 py-px rounded-full bg-white/10 text-[9px] font-mono text-zinc-300"
              >{{ layerCount }}</span>
            </div>
            <button
              class="flex size-5 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Add Frame"
              @click="createQuickFrame"
            >
              <icon-lucide-plus class="size-3.5" />
            </button>
          </div>

          <LayerTree data-test-id="layers-tree" class="min-h-24" />
      </div>
    </template>
  </aside>
</template>
