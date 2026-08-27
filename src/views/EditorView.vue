<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useViewportKind } from '@nex-design/vue'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { useMenu } from '@/app/shell/menu/use'
import { useCollab, COLLAB_KEY } from '@/app/collab/use'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { isTauri } from '@/app/tauri/env'
import { createDemoShapes } from '@/app/demo/document'
import { useEditorStore } from '@/app/editor/active-store'
import { createTab, activeTab, getActiveStore, tabCount } from '@/app/tabs'
import { getActiveProfileId } from '@/app/dashboard/accounts/session'
import { createProjectRepository } from '@/app/dashboard/projects/repository'
import { readFigFile } from '@nex-design/core/io/formats/fig'

import CommandPalette from '@/components/CommandPalette/CommandPalette.vue'
import CreativeNotesPanel from '@/components/CreativeNotes/CreativeNotesPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import FindReplaceModal from '@/components/FindReplace/FindReplaceModal.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import FloatingPromptBar from '@/components/FloatingPromptBar.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import ToolTutorial from '@/components/ToolTutorial/ToolTutorial.vue'

const route = useRoute()
const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)

const createdInitialTab = tabCount() === 0
const firstTab = createdInitialTab ? createTab() : (activeTab.value ?? createTab())
const store = useEditorStore()
const { isMobile } = useViewportKind()
const activeProfileId = getActiveProfileId()
const projectRepository = activeProfileId ? createProjectRepository(activeProfileId) : null

if (createdInitialTab && route.meta.demo && !('test' in params)) {
  createDemoShapes(firstTab.store)
}

useHead({ title: route.meta.demo ? 'Demo' : undefined })
useKeyboard()
useMenu()

const collab = useCollab(getActiveStore)
provide(COLLAB_KEY, collab)

useEventListener(
  document,
  'wheel',
  (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  },
  { passive: false }
)

const automationCleanup = ref<(() => void) | null>(null)
const mcpCleanup = ref<(() => void) | null>(null)

watch(
  () => store.state.documentName,
  async (newName) => {
    if (store.state.activeProjectId && newName) {
      await projectRepository?.update(store.state.activeProjectId, {
        name: newName,
        updatedAt: Date.now()
      })
    }
  }
)

onMounted(async () => {
  const projectId = route.query.id as string
  if (projectId) {
    store.state.loading = true
    try {
      const project = await projectRepository?.get(projectId)
      if (project) {
        store.state.activeProjectId = project.id
        store.state.autosaveEnabled = true
        store.state.documentName = project.name

        // Load the document using readFigFile
        const file = new File([project.document], `${project.name}.fig`)
        const graph = await readFigFile(file, { populate: 'first-page' })

        store.replaceGraph(graph)
        store.undo.clear()
        store.clearSelection()
        const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
        await store.switchPage(pageId)
        await store.fitCurrentPageToViewport()
      } else {
        console.error('Project not found in DB:', projectId)
      }
    } catch (err) {
      console.error('Failed to load project from DB:', err)
    } finally {
      store.state.loading = false
    }
  }

  try {
    const mcp = await spawnMCPIfNeeded()
    mcpCleanup.value = mcp?.disconnect ?? null
    const tauri = isTauri()
    if (import.meta.env.DEV || tauri) {
      automationCleanup.value = connectAutomation(getActiveStore, mcp?.authToken ?? null).disconnect
    }
  } catch (e) {
    console.warn('[MCP]', e)
    if (isTauri()) {
      const { toast } = await import('@/app/shell/ui')
      toast.warning('MCP server failed to start. Install with: npm i -g @nex-design/mcp')
    }
  }
})

onUnmounted(() => {
  mcpCleanup.value?.()
  automationCleanup.value?.()
})
</script>

<template>
  <div data-test-id="editor-root" class="relative flex h-screen w-screen flex-col">
    <SafariBanner />
    <TabBar />
    <div
      v-if="store.state.activeProjectId"
      class="pointer-events-none fixed top-2 right-3 z-50 rounded-full border border-border bg-panel/90 px-2.5 py-1 text-[10px] text-muted shadow-sm backdrop-blur"
      role="status"
    >
      <span v-if="store.state.projectSaveStatus === 'saving'">Saving locally…</span>
      <span v-else-if="store.state.projectSaveStatus === 'error'" class="text-red-400"
        >Local save failed</span
      >
      <span v-else>Saved locally</span>
    </div>

    <!-- Desktop layout -->
    <div
      v-if="!isMobile && showChrome && store.state.showUI"
      :key="activeTab?.id"
      class="relative flex flex-1 overflow-hidden"
    >
      <EditorCanvas />
      <!-- Floating Glass Left Sidebar Island (Layers & Pages) -->
      <div class="absolute top-0 bottom-0 left-0 z-30 pointer-events-none flex">
        <LayersPanel />
      </div>
      <!-- Floating Glass Right Sidebar Island (Properties, Dev Mode, AI) -->
      <div class="absolute top-0 bottom-0 right-0 z-30 pointer-events-none flex">
        <PropertiesPanel />
      </div>
      <!-- Centered Bottom Controls Stack (Prompt Bar + Toolbar aligned parallel on same axis) -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 pointer-events-none">
        <div v-if="showChrome && store.state.showUI && !isMobile" class="pointer-events-auto">
          <FloatingPromptBar />
        </div>
        <div class="pointer-events-auto">
          <Toolbar />
        </div>
      </div>
    </div>

    <!-- Mobile layout -->
    <div
      v-else-if="isMobile && showChrome && store.state.showUI"
      :key="'mobile-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <MobileHud />
        <Toolbar />
      </div>
      <MobileDrawer />
    </div>

    <!-- Collapsed UI (showUI=false) -->
    <div
      v-else-if="showChrome"
      :key="'collapsed-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <div
          v-if="!isMobile"
          class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm"
        >
          <router-link
            to="/"
            class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            title="Back to Home Page"
          >
            <icon-lucide-home class="size-3.5" />
          </router-link>
          <img
            src="/logo.png"
            class="h-5 w-auto invert object-contain opacity-90"
            alt="NexDesign"
          />
          <span data-test-id="editor-document-name" class="text-xs text-surface">{{
            store.state.documentName
          }}</span>
          <button
            data-test-id="editor-show-ui"
            class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            title="Show UI (⌘\)"
            @click="store.state.showUI = true"
          >
            <icon-lucide-sidebar class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bare canvas (no chrome, e.g. ?no-chrome) -->
    <div v-else :key="'bare-' + activeTab?.id" class="flex flex-1 overflow-hidden">
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>

    <CreativeNotesPanel
      v-if="showChrome"
      :key="`creative-notes-${activeTab?.id}`"
      :show-launcher="isMobile || !store.state.showUI"
    />
    <ToolTutorial v-if="showChrome && store.state.showUI" />
    <CommandPalette v-model:open="store.state.showCommandPalette" />
    <FindReplaceModal v-model:open="store.state.showFindReplace" />
  </div>
</template>
