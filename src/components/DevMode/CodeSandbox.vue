<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-dart'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-css'
import { generateCodeForNode, type CodegenLanguage } from '@nex-design/core/design-jsx'
import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'

const { node, graph } = defineProps<{
  node: SceneNode
  graph: SceneGraph
}>()

const selectedLang = ref<CodegenLanguage>('tailwind')
const { copy, copied } = useClipboard({ copiedDuring: 2000 })

const languages: Array<{ id: CodegenLanguage; label: string }> = [
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue 3' },
  { id: 'css', label: 'CSS' },
  { id: 'flutter', label: 'Flutter' },
  { id: 'swiftui', label: 'SwiftUI' }
]

const codegenResult = computed(() => {
  return generateCodeForNode(node, graph, selectedLang.value)
})

const highlightedCode = computed(() => {
  const code = codegenResult.value.code
  const lang = codegenResult.value.syntax
  const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.html
  return Prism.highlight(code, grammar, lang)
})

function copyCode() {
  copy(codegenResult.value.code)
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-border bg-input/20 overflow-hidden">
    <!-- Header & Language Tabs -->
    <div class="flex items-center justify-between border-b border-border bg-input/40 px-2.5 py-1.5">
      <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          v-for="l in languages"
          :key="l.id"
          class="px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0"
          :class="selectedLang === l.id ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-surface'"
          @click="selectedLang = l.id"
        >
          {{ l.label }}
        </button>
      </div>

      <button
        class="flex items-center gap-1 px-2 py-0.5 rounded bg-hover hover:bg-hover/80 text-[11px] font-medium text-surface transition-colors cursor-pointer shrink-0 ml-2"
        @click="copyCode"
      >
        <icon-lucide-check v-if="copied" class="size-3 text-emerald-400" />
        <icon-lucide-copy v-else class="size-3 text-muted" />
        <span>{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>

    <!-- Code Display Area -->
    <div class="p-2.5 overflow-x-auto max-h-72">
      <pre class="font-mono text-xs leading-relaxed text-surface/90 select-text"><code v-html="highlightedCode" /></pre>
    </div>
  </div>
</template>
