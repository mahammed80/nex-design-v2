<script setup lang="ts">
import { watch } from 'vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { useI18n } from '@nex-design/vue'
import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'

import ChatPanel from './ChatPanel.vue'
import DevInspectorPanel from './DevMode/DevInspectorPanel.vue'
import DesignPanel from './DesignPanel.vue'
import PrototypePanel from './properties/PrototypePanel.vue'
import ZoomDropdown from './ZoomDropdown.vue'

const { activeTab } = useAIChat()
const { panels } = useI18n()
const editor = useEditorStore()

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
    else if (mode === 'DEVELOPER') activeTab.value = 'code'
  }
)
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
    style="contain: paint layout style"
  >
    <TabsRoot v-model="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabsList class="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
        <TabsTrigger
          value="design"
          data-test-id="properties-tab-design"
          class="rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
        >
          {{ panels.design }}
        </TabsTrigger>
        <TabsTrigger
          value="prototype"
          data-test-id="properties-tab-prototype"
          class="rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
        >
          Prototype
        </TabsTrigger>
        <TabsTrigger
          value="code"
          data-test-id="properties-tab-code"
          class="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
        >
          <icon-lucide-code-2 class="size-3 text-accent" />
          <span>Dev Mode</span>
        </TabsTrigger>
        <TabsTrigger
          value="ai"
          data-test-id="properties-tab-ai"
          class="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
        >
          <icon-lucide-sparkles class="size-3" />
          {{ panels.ai }}
        </TabsTrigger>
        <ZoomDropdown v-if="activeTab === 'design'" />
      </TabsList>

      <TabsContent
        value="design"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'design'"
      >
        <DesignPanel />
      </TabsContent>

      <TabsContent
        value="prototype"
        class="flex min-h-0 flex-1 flex-col pb-4"
        :force-mount="true"
        :hidden="activeTab !== 'prototype'"
      >
        <PrototypePanel />
      </TabsContent>

      <TabsContent
        value="code"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'code'"
      >
        <DevInspectorPanel />
      </TabsContent>

      <TabsContent
        value="ai"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'ai'"
      >
        <ChatPanel />
      </TabsContent>
    </TabsRoot>
  </aside>
</template>
