import type { ModelMessage } from 'ai'

import { findStyleGuidePage, readDesignSystem } from '@nex-design/core/design-system'
import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'

import SYSTEM_PROMPT from '@/app/ai/chat/system-prompt.md?raw'
import type { ChatRunMode } from '@/app/ai/chat/types'
import { buildGenerationMemoryContext } from '@/app/ai/memory/storage'
import { resolveAgentSkills } from '@/app/ai/skills/resolve'
import type { AgentTaskIntent } from '@/app/ai/skills/types'
import type { EditorStore } from '@/app/editor/active-store'

interface AgentDocumentState {
  graph: SceneGraph
  state: Pick<EditorStore['state'], 'currentPageId' | 'selectedIds'> & { documentName?: string }
}

const CREATE_PATTERN = /\b(create|design|build|make|generate|draft|new)\b/i
const INSPECT_PATTERN = /\b(analy[sz]e|audit|check|explain|inspect|review|what is|find)\b/i
const MODIFY_PATTERN = /\b(change|edit|fix|make the|modify|move|resize|replace|update)\b/i
const REFERENCE_PATTERN = /\b(reference|inspired by|study|from this (?:site|url)|https?:\/\/)/i
const URL_IMPORT_PATTERN =
  /\b(import|convert|turn|capture|recreate|url[- ]to[- ]design|website[- ]to[- ]design)\b/i
const URL_PATTERN = /https?:\/\//i

function messageText(message: ModelMessage): string {
  if (typeof message.content === 'string') return message.content
  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: 'text' }> => {
      return part.type === 'text'
    })
    .map((part) => part.text)
    .join('\n')
}

export function getLatestUserRequest(messages: ModelMessage[] | undefined): string {
  if (!messages) return ''
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === 'user') return messageText(message)
  }
  return ''
}

export function classifyAgentIntent(request: string): AgentTaskIntent {
  if (URL_IMPORT_PATTERN.test(request) && URL_PATTERN.test(request)) return 'create'
  if (REFERENCE_PATTERN.test(request)) return 'reference'
  if (INSPECT_PATTERN.test(request)) return 'inspect'
  if (MODIFY_PATTERN.test(request)) return 'modify'
  if (CREATE_PATTERN.test(request)) return 'create'
  return 'modify'
}

function nodeLabel(node: SceneNode): string {
  return `${node.name} (${node.type}, ${Math.round(node.width)}x${Math.round(node.height)}) at (${Math.round(node.x)}, ${Math.round(node.y)})`
}

function countDescendants(graph: SceneGraph, root: SceneNode): number {
  let count = 0
  const pending = [...root.childIds]
  while (pending.length > 0) {
    const id = pending.pop()
    if (!id) continue
    const node = graph.getNode(id)
    if (!node) continue
    count++
    pending.push(...node.childIds)
  }
  return count
}

export function buildAgentDocumentContext(store: AgentDocumentState): string {
  const page = store.graph.getNode(store.state.currentPageId)
  if (!page) return 'Current document: active page is unavailable.'

  const topLevel = page.childIds
    .map((id) => store.graph.getNode(id))
    .filter((node): node is SceneNode => !!node)
  const selected = [...store.state.selectedIds]
    .map((id) => store.graph.getNode(id))
    .filter((node): node is SceneNode => !!node)
  const styleGuide = findStyleGuidePage(store.graph)
  const tokens = designTokenSummary(store.graph)

  return [
    `Current page: ${page.name} (${countDescendants(store.graph, page)} nodes).`,
    `Top-level layers: ${topLevel.length > 0 ? topLevel.slice(0, 12).map(nodeLabel).join('; ') : 'none'}.`,
    `Selection: ${
      selected.length > 0
        ? selected
            .slice(0, 8)
            .map((node) => `${node.id}: ${nodeLabel(node)}`)
            .join('; ')
        : 'none'
    }.`,
    `Style guide: ${styleGuide ? `available as page ${styleGuide.id}` : 'not present'}.`,
    ...(tokens ? [tokens] : [])
  ].join('\n')
}

const TOKEN_SUMMARY_MAX_CHARS = 2000

function joinCapped(label: string, items: string[]): string | null {
  return items.length > 0 ? `- ${label}: ${items.join(', ')}` : null
}

/**
 * Compact design-token summary for the agent (variables named `colors/…`, `spacing/…`, etc.),
 * so generated designs reuse the document's tokens instead of inventing values.
 */
export function designTokenSummary(graph: SceneGraph): string | null {
  const system = readDesignSystem(graph)
  const colorValue = (value: (typeof system.colors)[string]) =>
    typeof value === 'string'
      ? value
      : Object.entries(value)
          .map(([mode, v]) => `${mode} ${v}`)
          .join(' / ')
  const lines = [
    joinCapped(
      'colors',
      Object.entries(system.colors).map(([name, value]) => `${name} ${colorValue(value)}`)
    ),
    joinCapped(
      'typography',
      Object.entries(system.typography).map(([name, t]) =>
        [
          name,
          t.fontFamily?.split(',')[0],
          t.fontSize && `${t.fontSize}px`,
          t.fontWeight,
          t.lineHeight && `lh ${t.lineHeight}`
        ]
          .filter(Boolean)
          .join(' ')
      )
    ),
    joinCapped(
      'rounded',
      Object.entries(system.rounded).map(([name, v]) => `${name} ${v}`)
    ),
    joinCapped(
      'spacing',
      Object.entries(system.spacing).map(([name, v]) => `${name} ${v}`)
    )
  ].filter((line): line is string => line !== null)
  if (lines.length === 0) return null

  const text = [
    `Design system "${system.name}" (bind these variables instead of hardcoding values; read the full spec with read_design_system):`,
    ...lines
  ].join('\n')
  return text.length > TOKEN_SUMMARY_MAX_CHARS
    ? `${text.slice(0, TOKEN_SUMMARY_MAX_CHARS)}… (truncated; call read_design_system)`
    : text
}

function workflowFor(intent: AgentTaskIntent): string {
  if (intent === 'reference') {
    return 'Study the authorized reference first. Extract a design specification, then create an original result and validate it.'
  }
  if (intent === 'inspect') {
    return 'Inspect before changing anything. Use describe for evidence. Do not mutate the document unless the user explicitly requested a correction.'
  }
  if (intent === 'modify') {
    return 'Modify the existing design in place. Inspect the target first, preserve unrelated layers, use replace_id or focused property tools, then describe the result.'
  }
  return [
    'Follow the four-phase workflow from the system prompt:',
    '0. Screen scope: a request for a new screen creates a new top-level frame without replacing unrelated work. Place it to the right of existing top-level screens with a 120px canvas gap. A multi-screen request creates one consistently named top-level frame per screen; it is not one page split into sections.',
    '1. Direction: state concept, type pairing, palette hexes, shape and density, section layout, and focal point before any tool call. Reuse Style Guide tokens when present.',
    '2. Build: render real content directly — one render for small screens, otherwise the root plus the first sections, then one render per remaining section with parent_id. No gray skeleton pass.',
    '3. Validate: call describe on the completed root once and fix errors and high-impact warnings in one batch_update.',
    '4. Polish: place stock photos in one batch, critique the result against the direction, fix the weakest point, and stop.'
  ].join('\n')
}

export function buildAgentInstructions(options: {
  store: AgentDocumentState
  request: string
  mode?: ChatRunMode
}): string {
  const intent = classifyAgentIntent(options.request)
  const base = SYSTEM_PROMPT
  const hasStyleGuide = designTokenSummary(options.store.graph) !== null
  const skills = resolveAgentSkills({
    intent,
    request: options.request,
    hasSelection: options.store.state.selectedIds.size > 0,
    hasStyleGuide
  })
  const memory = buildGenerationMemoryContext(options.store.state.documentName ?? 'Untitled')
  const skillBlock = skills.instructions ? `\n\n${skills.instructions}` : ''
  const runMode = options.mode ?? 'build'
  const modeInstructions =
    runMode === 'plan'
      ? [
          'Interaction mode: plan.',
          'Do not create, edit, delete, or move any design nodes.',
          'Use read-only inspection tools when useful, then return a concise implementation plan covering screens, states, reusable components, interactions, responsive behavior, accessibility, and validation.',
          'Call out assumptions and unresolved product decisions. End by asking the user to approve or refine the plan before building.'
        ].join('\n')
      : `Interaction mode: build.\n${workflowFor(intent)}`
  return `${base}${skillBlock}\n\n## Runtime design context\n\n${buildAgentDocumentContext(options.store)}\n\n## Local design memory\n\n${memory}\n\nTask mode: ${intent}.\n${modeInstructions}`
}
