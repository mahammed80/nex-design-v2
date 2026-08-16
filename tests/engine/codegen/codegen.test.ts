import { describe, expect, it } from 'bun:test'
import {
  generateCodeForNode,
  generateCssRules,
  generateFlutterSnippet,
  generateReactComponent,
  generateSwiftUISnippet,
  generateTailwindSnippet,
  generateVueComponent
} from '@nex-design/core/design-jsx'
import { SceneGraph } from '@nex-design/core/scene-graph'

describe('Dev Mode Code Generation Engine', () => {
  it('generates Tailwind CSS markup for a flex container with colors and padding', () => {
    const graph = new SceneGraph()
    const pageId = graph.createPage('Page 1')
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Primary Button',
      width: 200,
      height: 48,
      layoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
      paddingTop: 12,
      paddingRight: 24,
      paddingBottom: 12,
      paddingLeft: 24,
      itemSpacing: 8,
      cornerRadius: 8,
      fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, opacity: 1, visible: true }]
    })

    const twCode = generateTailwindSnippet(frame, graph)
    expect(twCode).toContain('flex flex-row')
    expect(twCode).toContain('justify-center')
    expect(twCode).toContain('items-center')
    expect(twCode).toContain('px-6')
    expect(twCode).toContain('py-3')
    expect(twCode).toContain('gap-2')
    expect(twCode).toContain('rounded-lg')
  })

  it('generates CSS rules matching box model and layout properties', () => {
    const graph = new SceneGraph()
    const pageId = graph.createPage('Page 1')
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Card',
      width: 320,
      height: 240,
      layoutMode: 'VERTICAL',
      cornerRadius: 16,
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      itemSpacing: 12
    })

    const cssRules = generateCssRules(frame)
    expect(cssRules['width']).toBe('320px')
    expect(cssRules['height']).toBe('240px')
    expect(cssRules['display']).toBe('flex')
    expect(cssRules['flex-direction']).toBe('column')
    expect(cssRules['border-radius']).toBe('16px')
    expect(cssRules['padding']).toBe('16px 16px 16px 16px')
    expect(cssRules['gap']).toBe('12px')
  })

  it('generates Flutter and SwiftUI widgets correctly', () => {
    const graph = new SceneGraph()
    const pageId = graph.createPage('Page 1')
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Badge',
      width: 80,
      height: 32,
      layoutMode: 'HORIZONTAL',
      cornerRadius: 6
    })

    const flutterCode = generateFlutterSnippet(frame, graph)
    expect(flutterCode).toContain('Row(')

    const swiftCode = generateSwiftUISnippet(frame, graph)
    expect(swiftCode).toContain('HStack')
    expect(swiftCode).toContain('.cornerRadius(6)')
  })

  it('generates full React and Vue components', () => {
    const graph = new SceneGraph()
    const pageId = graph.createPage('Page 1')
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Hero Section',
      width: 1200,
      height: 600,
      layoutMode: 'HORIZONTAL'
    })

    const reactCode = generateReactComponent(frame, graph)
    expect(reactCode).toContain('export function HeroSection()')

    const vueCode = generateVueComponent(frame, graph)
    expect(vueCode).toContain('<script setup lang="ts">')
    expect(vueCode).toContain('<template>')
  })

  it('handles multi-framework dispatch in generateCodeForNode', () => {
    const graph = new SceneGraph()
    const pageId = graph.createPage('Page 1')
    const textNode = graph.createNode('TEXT', pageId, {
      name: 'Title',
      text: 'Hello Dev Mode',
      fontSize: 24,
      fontWeight: 700
    })

    const result = generateCodeForNode(textNode, graph, 'react')
    expect(result.language).toBe('react')
    expect(result.syntax).toBe('jsx')
    expect(result.code).toContain('Hello Dev Mode')
  })
})
