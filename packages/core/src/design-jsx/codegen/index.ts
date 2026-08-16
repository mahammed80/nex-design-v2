import type { SceneGraph, SceneNode } from '#core/scene-graph'
import { generateCssSnippet } from './css'
import { generateFlutterSnippet } from './flutter'
import { generateReactComponent } from './react'
import { generateSwiftUISnippet } from './swiftui'
import { generateTailwindSnippet } from './tailwind'
import type { CodegenLanguage, CodegenResult } from './types'
import { generateVueComponent } from './vue'

export * from './types'
export { generateTailwindSnippet, nodeToTailwindClasses } from './tailwind'
export { generateCssSnippet, generateCssRules } from './css'
export { generateReactComponent } from './react'
export { generateVueComponent } from './vue'
export { generateFlutterSnippet } from './flutter'
export { generateSwiftUISnippet } from './swiftui'

export function generateCodeForNode(
  node: SceneNode,
  graph: SceneGraph,
  language: CodegenLanguage
): CodegenResult {
  switch (language) {
    case 'tailwind':
      return {
        language: 'tailwind',
        code: generateTailwindSnippet(node, graph),
        syntax: 'html',
        filename: 'Component.html'
      }
    case 'css':
      return {
        language: 'css',
        code: generateCssSnippet(node, graph),
        syntax: 'css',
        filename: 'styles.css'
      }
    case 'react':
      return {
        language: 'react',
        code: generateReactComponent(node, graph),
        syntax: 'jsx',
        filename: 'Component.tsx'
      }
    case 'vue':
      return {
        language: 'vue',
        code: generateVueComponent(node, graph),
        syntax: 'html',
        filename: 'Component.vue'
      }
    case 'flutter':
      return {
        language: 'flutter',
        code: generateFlutterSnippet(node, graph),
        syntax: 'dart',
        filename: 'widget.dart'
      }
    case 'swiftui':
      return {
        language: 'swiftui',
        code: generateSwiftUISnippet(node, graph),
        syntax: 'swift',
        filename: 'View.swift'
      }
  }
}
