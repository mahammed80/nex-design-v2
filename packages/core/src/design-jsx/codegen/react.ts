import type { SceneGraph, SceneNode } from '#core/scene-graph'
import { generateTailwindSnippet } from './tailwind'

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase()) || 'Component'
}

export function generateReactComponent(node: SceneNode, graph: SceneGraph): string {
  const componentName = toPascalCase(node.name || 'Component')
  const markup = generateTailwindSnippet(node, graph, 2)

  return `import React from 'react';

export function ${componentName}() {
  return (
${markup}
  );
}
`
}
