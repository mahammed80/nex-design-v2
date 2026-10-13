import { colorToCSS, colorToHex, parseColor } from '@nex-design/core/color'
import type { Fill, Variable, VariableValue } from '@nex-design/core/scene-graph'
import type { Color } from '@nex-design/core/types'

export interface VariableItem {
  id: string
  name: string
  type: string
  resolvedType?: string
  valuesByMode: Record<string, unknown>
  /** Value in the collection's default mode (resolved by the Style Guide root). */
  value?: unknown
}

/** A document variable plus its resolved default-mode value. */
export type StyleGuideVariable = Variable & { value: VariableValue | undefined }

function isColor(value: unknown): value is Color {
  return typeof value === 'object' && value !== null && 'r' in value && typeof value.r === 'number'
}

/** Serialize a token value for CSS/Tailwind/JSON export (colors as hex, gradients verbatim). */
export function tokenCssValue(v: VariableItem): string {
  if (isColor(v.value)) return colorToHex(v.value)
  return String(v.value ?? '')
}

export function parseLinearGradient(css: unknown): {
  angle: number
  color1: string
  color2: string
} {
  if (typeof css !== 'string') return { angle: 135, color1: '#12B07A', color2: '#76C693' }
  const regex =
    /linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s*\d+%\)/i
  const match = css.match(regex)
  if (match) {
    return {
      angle: parseInt(match[1], 10),
      color1: match[2],
      color2: match[3]
    }
  }
  return { angle: 135, color1: '#12B07A', color2: '#76C693' }
}

export function fillToGradientString(fill: Fill): string {
  if (fill.type !== 'GRADIENT_LINEAR' || !fill.gradientStops) {
    return 'linear-gradient(135deg, #12B07A 0%, #76C693 100%)'
  }

  let angle = 135
  if (fill.gradientTransform) {
    const t = fill.gradientTransform
    angle = Math.round(Math.atan2(t.m10, t.m00) * (180 / Math.PI)) + 90
    if (angle < 0) angle += 360
  }

  const stopsStr = fill.gradientStops
    .map((s) => `${colorToCSS(s.color)} ${Math.round(s.position * 100)}%`)
    .join(', ')

  return `linear-gradient(${angle}deg, ${stopsStr})`
}

export function gradientStringToFill(css: string): Fill {
  const fallbackFill: Fill = {
    type: 'GRADIENT_LINEAR',
    color: { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: [
      { position: 0, color: { r: 0.07, g: 0.69, b: 0.48, a: 1 } },
      { position: 1, color: { r: 0.46, g: 0.78, b: 0.58, a: 1 } }
    ],
    gradientTransform: {
      m00: 0.707,
      m01: -0.707,
      m02: 0.15,
      m10: 0.707,
      m11: 0.707,
      m12: 0.15
    }
  }

  if (typeof css !== 'string') return fallbackFill

  const mainRegex = /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(.*)\s*\)/i
  const match = css.match(mainRegex)
  if (!match) return fallbackFill

  const angle = parseInt(match[1], 10)
  const stopsText = match[2]

  const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)\s+(\d+)%/g
  const stops: Array<{ position: number; color: Color }> = []

  let stopMatch
  while ((stopMatch = stopRegex.exec(stopsText)) !== null) {
    const colorStr = stopMatch[1]
    const pos = parseInt(stopMatch[2], 10) / 100
    const parsed = parseColor(colorStr)
    stops.push({ position: pos, color: parsed })
  }

  if (stops.length < 2) return fallbackFill

  const rad = ((angle - 90) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return {
    type: 'GRADIENT_LINEAR',
    color: { r: 1, g: 1, b: 1, a: 1 },
    opacity: 1,
    visible: true,
    gradientStops: stops,
    gradientTransform: {
      m00: Number(cos.toFixed(3)),
      m01: Number((-sin).toFixed(3)),
      m02: 0.15,
      m10: Number(sin.toFixed(3)),
      m11: Number(cos.toFixed(3)),
      m12: 0.15
    }
  }
}

export function getFillFromVariable(v: VariableItem): Fill {
  if (v.type === 'COLOR' && isColor(v.value)) {
    return {
      type: 'SOLID',
      visible: true,
      opacity: 1,
      color: v.value
    }
  } else if (
    v.type === 'STRING' &&
    typeof v.value === 'string' &&
    v.value.startsWith('linear-gradient')
  ) {
    return gradientStringToFill(v.value)
  }
  return {
    type: 'SOLID',
    visible: true,
    opacity: 1,
    color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
  }
}

export interface DesignPreset {
  id: string
  name: string
  subtitle: string
  icon: string
  gradient: string
  markdown: string
}

export const STYLE_GUIDE_PRESETS: DesignPreset[] = [
  {
    id: 'nexdesign-crimson',
    name: 'NexDesign Signature Crimson',
    subtitle: 'Signature brand palette: deep obsidian glass, ruby crimson & crisp monochrome',
    icon: '🔴',
    gradient: 'from-rose-500/20 via-red-500/15 to-black/60 border-red-500/30',
    markdown: `# NexDesign System

## Direction
- Signature NexDesign brand identity: deep obsidian frosted glass, razor-sharp vector precision, and vibrant crimson ruby accents.

## Colors
- \`brand-primary\`: \`#e11d48\`
- \`brand-accent\`: \`#f43f5e\`
- \`brand-crimson\`: \`#be123c\`
- \`surface-base\`: \`#09090b\`
- \`surface-card\`: \`#141418\`
- \`surface-elevated\`: \`#1c1c22\`
- \`text-primary\`: \`#ffffff\`
- \`text-muted\`: \`#a1a1aa\`
- \`border-subtle\`: \`#27272a\`
- \`success\`: \`#10b981\`
- \`warning\`: \`#f59e0b\`
- \`danger\`: \`#ef4444\`

## Typography
- \`font-family-primary\`: \`Inter\`
- \`font-size-display\`: 48
- \`font-size-h1\`: 36
- \`font-size-h2\`: 24
- \`font-size-h3\`: 20
- \`font-size-body\`: 16
- \`font-size-small\`: 14
- \`font-size-caption\`: 12

## Spacing
- \`space-xs\`: 4
- \`space-sm\`: 8
- \`space-md\`: 16
- \`space-lg\`: 24
- \`space-xl\`: 32
- \`space-2xl\`: 48
- \`space-3xl\`: 64
`
  },
  {
    id: 'scarlet-dashboard',
    name: 'Scarlet High-Performance',
    subtitle: 'Vibrant scarlet red on pitch black for high-density modern dashboards',
    icon: '🩸',
    gradient: 'from-red-600/20 via-rose-600/15 to-black/60 border-red-500/30',
    markdown: `# Scarlet Design System

## Direction
- High-performance, high-density web application with pitch-black surfaces and vibrant scarlet red interactive cues.

## Colors
- \`brand-primary\`: \`#ef4444\`
- \`brand-secondary\`: \`#dc2626\`
- \`brand-highlight\`: \`#f87171\`
- \`surface-base\`: \`#000000\`
- \`surface-card\`: \`#121215\`
- \`surface-border\`: \`#222228\`
- \`text-primary\`: \`#f4f4f5\`
- \`text-muted\`: \`#71717a\`
- \`success\`: \`#22c55e\`
- \`danger\`: \`#ef4444\`

## Typography
- \`font-family-primary\`: \`Inter\`
- \`font-size-display\`: 44
- \`font-size-h1\`: 32
- \`font-size-h2\`: 24
- \`font-size-h3\`: 18
- \`font-size-body\`: 15
- \`font-size-small\`: 13

## Spacing
- \`space-xs\`: 4
- \`space-sm\`: 8
- \`space-md\`: 16
- \`space-lg\`: 24
- \`space-xl\`: 32
- \`space-2xl\`: 48
`
  },
  {
    id: 'monochrome-red',
    name: 'Monochrome Luxury with Red',
    subtitle: 'Minimalist white & charcoal surfaces with focused red brand highlights',
    icon: '🎯',
    gradient: 'from-zinc-300/15 via-red-500/10 to-black/60 border-zinc-500/30',
    markdown: `# Luxury Monochrome System

## Direction
- Clean luxury editorial design: high-contrast monochrome foundation with targeted ruby-red callouts and generous spacing.

## Colors
- \`brand-primary\`: \`#e11d48\`
- \`brand-dark\`: \`#18181b\`
- \`surface-base\`: \`#09090b\`
- \`surface-card\`: \`#18181b\`
- \`border-subtle\`: \`#27272a\`
- \`text-primary\`: \`#fafafa\`
- \`text-muted\`: \`#71717a\`

## Typography
- \`font-family-primary\`: \`Inter\`
- \`font-size-display\`: 52
- \`font-size-h1\`: 38
- \`font-size-h2\`: 26
- \`font-size-h3\`: 20
- \`font-size-body\`: 16
- \`font-size-small\`: 13

## Spacing
- \`space-xs\`: 4
- \`space-sm\`: 8
- \`space-md\`: 16
- \`space-lg\`: 24
- \`space-xl\`: 32
- \`space-2xl\`: 48
`
  },
  {
    id: 'swiss-precision',
    name: 'Swiss Precision Red',
    subtitle: 'Structured international typographic grid with iconic Swiss red tokens',
    icon: '🇨🇭',
    gradient: 'from-red-500/20 via-zinc-800/20 to-black/60 border-red-500/30',
    markdown: `# Swiss Precision System

## Direction
- International typographic style: strict geometric alignment, mathematical modular rhythm, and iconic Swiss red accents.

## Colors
- \`brand-primary\`: \`#ff0033\`
- \`brand-secondary\`: \`#cc0029\`
- \`surface-base\`: \`#0a0a0c\`
- \`surface-card\`: \`#141416\`
- \`text-primary\`: \`#ffffff\`
- \`text-muted\`: \`#8e8e93\`
- \`border-grid\`: \`#2c2c2e\`

## Typography
- \`font-family-primary\`: \`Inter\`
- \`font-size-display\`: 56
- \`font-size-h1\`: 40
- \`font-size-h2\`: 28
- \`font-size-h3\`: 22
- \`font-size-body\`: 16
- \`font-size-small\`: 14

## Spacing
- \`space-xs\`: 4
- \`space-sm\`: 8
- \`space-md\`: 16
- \`space-lg\`: 24
- \`space-xl\`: 32
- \`space-2xl\`: 48
`
  }
]

export interface TutorialStep {
  step: number
  title: string
  icon: string
  summary: string
  points: string[]
  proTip: string
}

export const DESIGN_SYSTEM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 1,
    title: 'Brand Vision & Direction (DESIGN.md)',
    icon: '📝',
    summary:
      'Define your design system single source of truth in portable, human-readable markdown format.',
    points: [
      'Encapsulates visual personality, target audience, density, and brand philosophy.',
      'Propagates directly into the canvas scene graph and connected component libraries.',
      'Provides a portable file that can be committed to Git and shared across design and frontend teams.'
    ],
    proTip:
      'Keep your direction description focused on brand tone, visual density, contrast standards, and elevation hierarchy.'
  },
  {
    step: 2,
    title: 'Color Palette & 60-30-10 Distribution',
    icon: '🎨',
    summary:
      'Structure a predictable color system: neutral surfaces, primary brand colors, and functional states.',
    points: [
      '60% Neutral Canvas & Surfaces: Base backgrounds, card surfaces, and subtle border lines.',
      '30% Brand & Interactive: Primary actions, interactive highlights, and active selection frames.',
      '10% Semantic States: Success, warning, danger/error badges, and high-priority indicators.'
    ],
    proTip:
      'Always name tokens semantically (e.g. `brand-primary`, `surface-card`, `text-primary`) rather than literal colors.'
  },
  {
    step: 3,
    title: 'Modular Typography Scale',
    icon: '🔤',
    summary:
      'Establish a mathematically proportional hierarchy from small captions up to hero displays.',
    points: [
      'Standardize on a clean primary font family (e.g. Inter) and consistent weights.',
      'Maintain modular step ratios (12px, 14px, 16px, 20px, 24px, 36px, 48px).',
      'Enforce proportionate line heights (1.5 for body copy, 1.2 for compact headlines).'
    ],
    proTip:
      'Stick to 1 primary typeface for standard UI and at most 1 display/mono accent font for technical blocks.'
  },
  {
    step: 4,
    title: '8pt Spacing Grid & Spatial Rhythm',
    icon: '📐',
    summary:
      'Use 4px & 8px multiples to guarantee consistent layout alignment across screens and devices.',
    points: [
      'Micro Spacing (4px, 8px): Padding inside buttons, icon gaps, and input insets.',
      'Macro Spacing (16px, 24px, 32px): Card internal padding, stack gaps, and column gutters.',
      'Layout Spacing (48px, 64px): Section separations and page container margins.'
    ],
    proTip:
      'Avoid arbitrary odd values (like 17px). Consistent 8pt multiples produce instant visual harmony.'
  },
  {
    step: 5,
    title: 'Binding to Canvas & Code Generation',
    icon: '⚡',
    summary: 'Variables automatically bind to your shapes and export to code instantly.',
    points: [
      'Editing any variable here automatically updates all connected shapes, text nodes, and components.',
      'Export production-ready CSS Custom Properties, Tailwind CSS theme configs, or JSON design tokens.',
      'Ensure total parity between design deliverables and production frontend codebases.'
    ],
    proTip:
      'Use the "Starter Presets" button above to load a complete production-grade token architecture in one click.'
  }
]
