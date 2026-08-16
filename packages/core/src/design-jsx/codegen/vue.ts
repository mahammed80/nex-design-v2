import type { SceneGraph, SceneNode } from '#core/scene-graph'
import { generateTailwindSnippet } from './tailwind'

export function generateVueComponent(node: SceneNode, graph: SceneGraph): string {
  const markup = generateTailwindSnippet(node, graph, 1)

  return `<script setup lang="ts">
// ${node.name || 'Component'}
</script>

<template>
${markup}
</template>
`
}
