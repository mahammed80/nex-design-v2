<script setup lang="ts">
import { watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { useI18n } from '@nex-design/vue'
import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'

import CollabPanel from '@/components/CollabPanel/CollabPanel.vue'
import ChatPanel from './ChatPanel.vue'
import DevInspectorPanel from './DevMode/DevInspectorPanel.vue'
import DesignPanel from './DesignPanel.vue'
import PrototypePanel from './properties/PrototypePanel/PrototypePanel.vue'
import ZoomDropdown from './ZoomDropdown.vue'

const { activeTab } = useAIChat()
const { panels } = useI18n()
const editor = useEditorStore()
const isCollapsed = useLocalStorage('nex-design:properties-collapsed', false)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function selectTab(tab: 'design' | 'prototype' | 'code' | 'ai') {
  activeTab.value = tab
  isCollapsed.value = false
}

watch(activeTab, (tab) => {
  if (editor) {
    if (tab === 'design') editor.state.mode = 'DESIGN'
    else if (tab === 'prototype') editor.state.mode = 'PROTOTYPE'
    else if (tab === 'code') editor.state.mode = 'DEVELOPER'
  }
})

watch(
  () => editor?.state?.mode,
  (mode) => {
    if (mode === 'DESIGN') activeTab.value = 'design'
    else if (mode === 'PROTOTYPE') activeTab.value = 'prototype'
    else if (mode === 'DEVELOPER') {
      activeTab.value = 'code'
      isCollapsed.value = false
    }
  }
)
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="relative flex flex-col overflow-hidden rounded-[26px] border border-white/15 bg-black/75 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(121,40,202,0.15)] transition-all duration-300 select-none pointer-events-auto mt-7 mb-4 mr-6 h-[calc(100%-2.75rem)]"
    :class="isCollapsed ? 'w-14 min-w-[56px] max-w-[56px] items-center' : 'w-72 min-w-[288px] max-w-[320px]'"
    style="contain: paint layout style"
  >
    <!-- ── 1. COMPRESSED / SLIM ICON RAIL MODE ── -->
    <div
      v-if="isCollapsed"
      class="flex flex-1 flex-col items-center justify-between py-3 w-full h-full text-white/80"
    >
      <!-- Top Section: Expand Toggle & Collab -->
      <div class="flex flex-col items-center gap-3 w-full">
        <!-- Expand Button -->
        <button
          class="flex size-8 items-center justify-center rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 transition-all cursor-pointer group shadow-sm text-zinc-300"
          title="Expand Properties (click)"
          @click="toggleCollapse"
        >
          <icon-lucide-chevron-left class="size-4 transition-transform group-hover:-translate-x-0.5" />
        </button>

        <CollabPanel />

        <div class="w-6 h-px bg-white/10 my-1" />

        <!-- Vertical Icon Navigation -->
        <div class="flex flex-col items-center gap-2 w-full px-2">
          <!-- Design Tab -->
          <button
            class="flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer"
            :class="
              activeTab === 'design'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="Design Properties"
            @click="selectTab('design')"
          >
            <icon-lucide-sliders class="size-4.5" />
          </button>

          <!-- Prototype Tab -->
          <button
            class="flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer"
            :class="
              activeTab === 'prototype'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="Prototype Interactions"
            @click="selectTab('prototype')"
          >
            <icon-lucide-play class="size-4.5" />
          </button>

          <!-- Dev Mode Tab -->
          <button
            class="flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer"
            :class="
              activeTab === 'code'
                ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="Dev Mode Code Inspector (Shift+D)"
            @click="selectTab('code')"
          >
            <icon-lucide-code-2 class="size-4.5" />
          </button>

          <!-- AI Assistant Tab -->
          <button
            class="flex size-10 items-center justify-center rounded-xl transition-all cursor-pointer"
            :class="
              activeTab === 'ai'
                ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            "
            title="NexDesign AI Chat"
            @click="selectTab('ai')"
          >
            <icon-lucide-sparkles class="size-4.5" />
          </button>

          <!-- Creative Notes -->
          <button
            class="flex size-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Creative Notes (⌘⌥N)"
            @click="editor.state.showCreativeNotes = true"
          >
            <icon-lucide-notebook-pen class="size-4.5" />
          </button>
        </div>
      </div>

      <!-- Bottom Zoom Status -->
      <div class="text-[9px] font-mono font-bold text-zinc-400 pb-1">
        {{ Math.round((editor?.state?.zoom ?? 1) * 100) }}%
      </div>
    </div>

    <!-- ── 2. EXPANDED GLASS PROPERTIES MODE ── -->
    <template v-else>
      <!-- Header with Collab, Notes & Collapse Button -->
      <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div class="flex items-center gap-2">
          <CollabPanel />
          <button
            data-test-id="creative-notes-open"
            class="flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white border border-white/10"
            aria-label="Open creative notes"
            title="Creative Notes (⌘⌥N)"
            @click="editor.state.showCreativeNotes = true"
          >
            <icon-lucide-notebook-pen class="size-3.5 text-rose-400" />
            <span>Notes</span>
          </button>
        </div>

        <!-- Collapse Toggle Button -->
        <button
          class="flex size-6 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Collapse properties sidebar"
          @click="toggleCollapse"
        >
          <icon-lucide-chevron-right class="size-4" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <TabsRoot v-model="activeTab" class="flex min-h-0 flex-1 flex-col">
        <TabsList class="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-2 bg-black/20">
          <div class="flex items-center gap-1">
            <TabsTrigger
              value="design"
              data-test-id="properties-tab-design"
              class="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-all data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:bg-white/10"
            >
              {{ panels.design }}
            </TabsTrigger>
            <TabsTrigger
              value="prototype"
              data-test-id="properties-tab-prototype"
              class="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-all data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:bg-white/10"
            >
              Prototype
            </TabsTrigger>
            <TabsTrigger
              value="code"
              data-test-id="properties-tab-code"
              class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-all data-[state=active]:font-bold data-[state=active]:text-emerald-300 data-[state=active]:bg-emerald-950/40"
            >
              <icon-lucide-code-2 class="size-3 text-emerald-400" />
              <span>Dev</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              data-test-id="properties-tab-ai"
              class="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-all data-[state=active]:font-bold data-[state=active]:text-cyan-300 data-[state=active]:bg-cyan-950/40"
            >
              <icon-lucide-sparkles class="size-3 text-cyan-400" />
              {{ panels.ai }}
            </TabsTrigger>
          </div>
          <ZoomDropdown v-if="activeTab === 'design'" />
        </TabsList>

        <TabsContent
          value="design"
          class="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin"
          :force-mount="true"
          :hidden="activeTab !== 'design'"
        >
          <DesignPanel />
        </TabsContent>

        <TabsContent
          value="prototype"
          class="flex min-h-0 flex-1 flex-col pb-4 overflow-y-auto scrollbar-thin"
          :force-mount="true"
          :hidden="activeTab !== 'prototype'"
        >
          <PrototypePanel />
        </TabsContent>

        <TabsContent
          value="code"
          class="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin"
          :force-mount="true"
          :hidden="activeTab !== 'code'"
        >
          <DevInspectorPanel />
        </TabsContent>

        <TabsContent
          value="ai"
          class="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin"
          :force-mount="true"
          :hidden="activeTab !== 'ai'"
        >
          <ChatPanel />
        </TabsContent>
      </TabsRoot>
    </template>
  </aside>
</template>
