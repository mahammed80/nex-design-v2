import { colorToHex, parseColor } from '@nex-design/core/color'
import { randomHex } from '@nex-design/core/random'
import type { Variable, VariableValue } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

export interface DesignMarkdownDocument {
  name: string
  direction: string
  colors: Record<string, string>
  typography: Record<string, string | number>
  spacing: Record<string, number>
  principles: string[]
}

const EMPTY_DESIGN: DesignMarkdownDocument = {
  name: 'NexDesign System',
  direction: '',
  colors: {},
  typography: {},
  spacing: {},
  principles: []
}

function lineEntries(markdown: string, heading: string): string[] {
  const section = markdown.match(new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i'))
  if (!section) return []
  return section[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
}

function parsePairs(lines: string[]): Record<string, string> {
  const pairs: Record<string, string> = {}
  for (const line of lines) {
    const match = line.match(/^-\s+`?([^`:]+)`?\s*:\s*`?([^`]+?)`?\s*$/)
    if (match) pairs[match[1].trim()] = match[2].trim()
  }
  return pairs
}

export function parseDesignMarkdown(markdown: string): DesignMarkdownDocument {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? EMPTY_DESIGN.name
  const direction = lineEntries(markdown, 'Direction')[0]?.replace(/^-\s*/, '') ?? ''
  const colors = parsePairs(lineEntries(markdown, 'Colors'))
  const rawTypography = parsePairs(lineEntries(markdown, 'Typography'))
  const rawSpacing = parsePairs(lineEntries(markdown, 'Spacing'))

  return {
    name: title,
    direction,
    colors,
    typography: Object.fromEntries(
      Object.entries(rawTypography).map(([key, value]) => [key, Number(value) || value])
    ),
    spacing: Object.fromEntries(
      Object.entries(rawSpacing)
        .map(([key, value]) => [key, Number(value)])
        .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
    ),
    principles: lineEntries(markdown, 'Principles').map((line) => line.replace(/^-\s*/, ''))
  }
}

function formatEntries(values: Record<string, string | number>): string {
  const entries = Object.entries(values)
  return entries.length > 0
    ? entries.map(([name, value]) => `- \`${name}\`: \`${value}\``).join('\n')
    : '- None defined'
}

export function serializeDesignMarkdown(store: Pick<EditorStore, 'graph' | 'state'>): string {
  const colors: Record<string, string> = {}
  const typography: Record<string, string | number> = {}
  const spacing: Record<string, number> = {}

  for (const variable of store.graph.variables.values()) {
    const value = variable.valuesByMode.default
    if (variable.type === 'COLOR') colors[variable.name] = colorToHex(value as never)
    else if (variable.name.startsWith('font-')) typography[variable.name] = value as string | number
    else if (variable.type === 'FLOAT') spacing[variable.name] = value as number
  }

  return [
    `# ${store.state.documentName || 'NexDesign System'}`,
    '',
    '## Direction',
    '',
    '- Describe the intended visual personality and audience.',
    '',
    '## Colors',
    '',
    formatEntries(colors),
    '',
    '## Typography',
    '',
    formatEntries(typography),
    '',
    '## Spacing',
    '',
    formatEntries(spacing),
    '',
    '## Principles',
    '',
    '- Prefer clear hierarchy, consistent spacing, accessible contrast, and purposeful motion.'
  ].join('\n')
}

function variableFor(
  collectionId: string,
  name: string,
  type: Variable['type'],
  value: VariableValue
): Variable {
  return {
    id: `var:${randomHex(8)}`,
    name,
    type,
    collectionId,
    valuesByMode: { default: value },
    description: 'Imported from DESIGN.md',
    hiddenFromPublishing: false
  }
}

export function applyDesignMarkdown(editor: EditorStore, markdown: string): DesignMarkdownDocument {
  const design = parseDesignMarkdown(markdown)
  const collection =
    editor.getCollections()[0] ??
    ({
      id: `col:${randomHex(8)}`,
      name: design.name,
      modes: [{ modeId: 'default', name: 'Default' }],
      defaultModeId: 'default',
      variableIds: []
    } as const)

  editor.undo.beginBatch('Import DESIGN.md')
  if (!editor.getCollection(collection.id)) editor.addCollection(collection)

  const upsert = (name: string, type: Variable['type'], value: VariableValue) => {
    const existing = [...editor.graph.variables.values()].find((variable) => variable.name === name)
    if (existing) editor.updateVariableValue(existing.id, 'default', value)
    else editor.addVariable(variableFor(collection.id, name, type, value))
  }

  for (const [name, value] of Object.entries(design.colors))
    upsert(name, 'COLOR', parseColor(value))
  for (const [name, value] of Object.entries(design.typography)) {
    upsert(name, typeof value === 'number' ? 'FLOAT' : 'STRING', value)
  }
  for (const [name, value] of Object.entries(design.spacing)) upsert(name, 'FLOAT', value)

  editor.undo.commitBatch()
  editor.requestRender()
  return design
}
