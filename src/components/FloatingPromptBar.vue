<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'

const editor = useEditorStore()
const { sendMessage, isGenerating, activeTab } = useAIChat()

const promptText = ref('')
const isFocused = ref(false)
const showAttachmentMenu = ref(false)

const selectedNode = computed(() => {
  if (!editor?.state?.selectedIds) return null
  const ids = Array.from(editor.state.selectedIds)
  if (ids.length === 0) return null
  return editor.graph?.getNode(ids[0]) ?? null
})

function handleSend() {
  const text = promptText.value.trim()
  if (!text || isGenerating.value) return

  let enrichedPrompt = text
  if (selectedNode.value) {
    enrichedPrompt = `[Context: Selected layer "${selectedNode.value.name}" (type: ${selectedNode.value.type}, size: ${Math.round(selectedNode.value.width)}x${Math.round(selectedNode.value.height)})] ${text}`
  }

  sendMessage(enrichedPrompt)
  promptText.value = ''
  activeTab.value = 'ai'
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function insertPreset(preset: string) {
  promptText.value = preset
  showAttachmentMenu.value = false
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-2 pointer-events-auto select-none">
    <div
      v-if="showAttachmentMenu"
      class="flex flex-col gap-1 p-2 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-2xl shadow-2xl text-xs text-white/90 w-80"
    >
      <div class="px-2 py-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">NexDesign AI Presets</div>
      <button
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
        @click="insertPreset('Generate a modern glassmorphic SaaS dashboard hero with aurora mesh glow')"
      >
        <icon-lucide-sparkles class="size-3.5 text-cyan-400 shrink-0" />
        <span class="truncate">Glassmorphic SaaS Hero</span>
      </button>
      <button
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
        @click="insertPreset('Create a responsive 3-column pricing card grid with frosted glass cards')"
      >
        <icon-lucide-layout-grid class="size-3.5 text-purple-400 shrink-0" />
        <span class="truncate">3-Column Glass Pricing Grid</span>
      </button>
      <button
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
        @click="insertPreset('Design a sleek mobile crypto wallet card with transaction list')"
      >
        <icon-lucide-smartphone class="size-3.5 text-emerald-400 shrink-0" />
        <span class="truncate">Mobile Glass Crypto Card</span>
      </button>
    </div>

    <div
      class="relative flex items-center gap-2 h-12 w-[480px] max-w-[calc(100vw-3rem)] px-3 rounded-full border border-white/15 bg-black/60 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(121,40,202,0.15)] transition-all duration-300"
      :class="{
        'border-white/30 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_32px_rgba(121,40,202,0.3)] bg-black/75': isFocused,
        'ring-1 ring-cyan-400/40': isFocused
      }"
    >
      <button
        class="flex size-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer shrink-0"
        :class="{ 'bg-white/25 text-white': showAttachmentMenu }"
        title="Quick Presets"
        @click="showAttachmentMenu = !showAttachmentMenu"
      >
        <icon-lucide-plus class="size-4" />
      </button>

      <div
        v-if="selectedNode"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-[10px] font-medium text-accent truncate max-w-[100px] shrink-0"
        :title="selectedNode.name"
      >
        <span class="size-1.5 rounded-full bg-accent animate-pulse" />
        <span class="truncate">{{ selectedNode.name }}</span>
      </div>

      <input
        v-model="promptText"
        type="text"
        placeholder="Ask NexDesign to generate UI, components, or layouts..."
        class="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none px-1 font-sans"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      />

      <button
        class="flex size-7 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-sm"
        :disabled="!promptText.trim() || isGenerating"
        title="Generate with NexDesign AI"
        @click="handleSend"
      >
        <icon-lucide-loader-2 v-if="isGenerating" class="size-3.5 animate-spin" />
        <icon-lucide-arrow-up v-else class="size-3.5 stroke-[2.5]" />
      </button>
    </div>
  </div>
</template>
