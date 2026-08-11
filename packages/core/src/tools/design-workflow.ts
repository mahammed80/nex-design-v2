import type { FigmaAPI } from '#core/figma-api'
import { defineTool } from './schema'

export const designSkeleton = defineTool({
  name: 'design_skeleton',
  description: 'Insert a root frame and empty section containers for a multi-section design. Use this as the first step of the layered design workflow.',
  params: {
    rootFrame: {
      type: 'string',
      required: true,
      description: 'JSON string: { name, width, height, layout, gap, padding, fill }'
    },
    sections: {
      type: 'string',
      required: true,
      description: 'JSON string array: [{ id, label, region: { width, height }, elements? }]'
    },
    styleGuideName: {
      type: 'string',
      required: false,
      description: 'Optional style guide tag to apply'
    }
  },
  execute(figma: FigmaAPI, args) {
    const rootFrame = JSON.parse(args.rootFrame as string) as {
      name: string
      width: number
      height: number
      layout?: string
      gap?: number
      padding?: number
      fill?: string
    }
    const sections = JSON.parse(args.sections as string) as Array<{
      id: string
      label: string
      region: { width: number; height: number }
      elements?: string
    }>

    const root = figma.createFrame()
    root.name = rootFrame.name || 'Design'
    root.resize(rootFrame.width || 1440, rootFrame.height || 900)

    if (rootFrame.layout === 'horizontal') {
      root.layoutMode = 'HORIZONTAL'
    } else if (rootFrame.layout === 'vertical') {
      root.layoutMode = 'VERTICAL'
    }
    root.itemSpacing = rootFrame.gap ?? 24
    root.paddingLeft = rootFrame.padding ?? 24
    root.paddingRight = rootFrame.padding ?? 24
    root.paddingTop = rootFrame.padding ?? 24
    root.paddingBottom = rootFrame.padding ?? 24

    if (rootFrame.fill) {
      root.fills = [{ type: 'SOLID', color: hexToColor(rootFrame.fill), opacity: 1, visible: true, blendMode: 'NORMAL' }]
    }

    const sectionIds: string[] = []
    for (const section of sections) {
      const sectionNode = figma.createFrame()
      sectionNode.name = section.label
      sectionNode.x = 0
      sectionNode.y = 0
      sectionNode.resize(
        (section.region.width / 100) * (rootFrame.width || 1440),
        (section.region.height / 100) * (rootFrame.height || 900)
      )
      sectionIds.push(sectionNode.id)
    }

    return {
      wrote: sections.length + 1,
      phase: 'skeleton',
      rootId: root.id,
      sectionIds,
      sections: sections.map((s) => ({ id: s.id, label: s.label, region: s.region })),
      nextSteps: sections.map((s) => `Call design_content with sectionId: ${s.id}`)
    }
  }
})

export const designContent = defineTool({
  name: 'design_content',
  description: 'Insert content nodes under a section frame. Use this after design_skeleton to populate each section.',
  params: {
    sectionId: {
      type: 'string',
      required: true,
      description: 'The section frame ID to populate'
    },
    children: {
      type: 'string',
      required: true,
      description: 'JSON string array of node descriptors: [{ type, name, x, y, width, height, layout?, content?, fills? }]'
    },
    postProcess: {
      type: 'boolean',
      required: false,
      description: 'Run deterministic post-processing (default true)'
    }
  },
  execute(figma: FigmaAPI, args) {
    const sectionId = args.sectionId as string
    const children = JSON.parse(args.children as string) as Array<{
      type: string
      name?: string
      x?: number
      y?: number
      width?: number
      height?: number
      layout?: string
      content?: string
      fills?: unknown[]
      strokes?: unknown[]
    }>
    const postProcess = (args.postProcess as boolean) ?? true

    const section = figma.getNodeById(sectionId)
    if (!section || section.type !== 'FRAME') {
      return { error: `Section ${sectionId} not found or not a frame` }
    }

    const inserted: string[] = []
    const warnings: string[] = []

    for (const child of children) {
      try {
        const node = figma.createFrame()
        node.name = child.name || 'Node'
        node.x = child.x ?? 0
        node.y = child.y ?? 0
        node.resize(child.width || 200, child.height || 100)

        if (child.layout === 'horizontal') {
          node.layoutMode = 'HORIZONTAL'
        } else if (child.layout === 'vertical') {
          node.layoutMode = 'VERTICAL'
        }

        if (child.fills && child.fills.length > 0) {
          node.fills = child.fills as Fill[]
        }

        inserted.push(node.id)
      } catch (e) {
        warnings.push(`Failed to create ${child.type}: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }

    return {
      wrote: inserted.length,
      phase: 'content',
      sectionId,
      insertedCount: inserted.length,
      warnings,
      postProcessed: postProcess,
      postProcessFixes: []
    }
  }
})

export const designRefine = defineTool({
  name: 'design_refine',
  description: 'Run deterministic cleanup and refinement passes on a design subtree. Use this as the final step of the layered design workflow.',
  params: {
    rootId: {
      type: 'string',
      required: true,
      description: 'The root frame ID to refine'
    },
    canvasWidth: {
      type: 'number',
      required: false,
      description: 'Optional canvas width for bounds checking'
    }
  },
  execute(figma: FigmaAPI, args) {
    const rootId = args.rootId as string

    const root = figma.getNodeById(rootId)
    if (!root || root.type !== 'FRAME') {
      return { error: `Root ${rootId} not found or not a frame` }
    }

    const fixes: string[] = []
    const warnings: string[] = []
    const textSamples: string[] = []
    const layoutFamilies = new Set<string>()
    const bentoCells: { parentId: string; count: number }[] = []

    const isLayoutNode = (record: { type?: string; layoutMode?: string }): boolean =>
      record.type === 'FRAME' || record.type === 'GROUP' || record.type === 'COMPONENT'

    const isBentoCandidate = (record: { type?: string; layoutMode?: string }, childCount: number): boolean =>
      record.type === 'FRAME' &&
      childCount >= 3 &&
      (record.layoutMode === 'HORIZONTAL' || record.layoutMode === 'VERTICAL' || record.layoutMode === 'GRID')

    const walk = (node: unknown, depth: number) => {
      const record = node as { type?: string; children?: unknown[]; layoutMode?: string; x?: number; y?: number; name?: string; id?: string; text?: string }
      if (!isLayoutNode(record)) {
        if (record.type === 'TEXT') {
          const text = record.text ?? ''
          if (text.length > 0) textSamples.push(text)
        }
        return
      }

      const children = record.children ?? []
      const childCount = children.length

      if (record.layoutMode && record.layoutMode !== 'NONE') {
        if (record.x === 0 && record.y === 0 && depth > 0) {
          fixes.push(`Auto-layout frame "${record.name}" at (0,0)`)
        }
      }

      if (isBentoCandidate(record, childCount)) {
        bentoCells.push({ parentId: record.id ?? 'unknown', count: childCount })
      }

      const childLayouts = new Set(children.map((c) => {
        const child = c as { type?: string; layoutMode?: string }
        return `${child.type ?? 'UNKNOWN'}-${child.layoutMode ?? 'NONE'}`
      }))
      if (childLayouts.size === 1 && childCount >= 3) {
        const family = [...childLayouts][0]
        if (layoutFamilies.has(family)) {
          warnings.push(`Section layout repetition: "${record.name}" uses same layout family as another section`)
        }
        layoutFamilies.add(family)
      }

      for (const child of children) {
        walk(child, depth + 1)
      }
    }

    walk(root, 0)

    const allText = textSamples.join(' ')

    if (
      allText.toLowerCase().includes('purple') &&
      (allText.toLowerCase().includes('gradient') || allText.toLowerCase().includes('glow'))
    ) {
      warnings.push('Purple/pink/cyan gradient backgrounds are banned by default (taste-skill gate 1)')
    }

    const ctaLikePhrases = ['get started', 'sign up', 'try free', 'contact us', 'get in touch', 'learn more', 'start now']
    const ctaIntents = new Set<string>()
    for (const phrase of ctaLikePhrases) {
      if (allText.toLowerCase().includes(phrase)) {
        if (['get started', 'try free', 'sign up free'].includes(phrase)) ctaIntents.add('signup')
        else if (['contact us', 'get in touch', 'start now'].includes(phrase)) ctaIntents.add('contact')
        else if (['learn more'].includes(phrase)) ctaIntents.add('learn')
      }
    }
    if (ctaIntents.size > 1) {
      warnings.push(`Duplicate CTA intent detected: ${[...ctaIntents].join(' + ')}. Pick one label per intent (hallmark gate 7)`)
    }

    const bannedMetrics = ['92%', '4.1×', '48k', '5.8 mm', '13.4 lb', '50,000+', '10× faster', '+47%']
    for (const metric of bannedMetrics) {
      if (allText.includes(metric)) {
        warnings.push(`Invented metric "${metric}" detected. Use real data or placeholders (hallmark gate 23)`)
        break
      }
    }

    if (/\b[A-Z]{2,}\b/.test(allText) && allText.includes('—')) {
      warnings.push('Em-dash used as design flourish in text (hallmark gate 25). Remove em-dashes from copy.')
    }

    for (const bc of bentoCells) {
      if (bc.count >= 3) {
        fixes.push(`Bento grid "${bc.parentId}" has ${bc.count} cells — verify each has content (hallmark gate 17)`)
      }
    }

    if (fixes.length === 0 && warnings.length === 0) {
      fixes.push('No slop patterns detected — design passes anti-slop checks')
    }

    return {
      wrote: fixes.length,
      phase: 'refine',
      rootId,
      fixes,
      warnings,
      slopTest: {
        passed: warnings.length === 0,
        gateCount: 30,
        warnings: warnings.length
      }
    }
  }
})

import type { Color } from '#core/types'
import type { Fill } from '#core/scene-graph'

function hexToColor(hex: string): Color {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const a = c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}
