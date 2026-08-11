import type { ModelMessage } from 'ai'

import type { SceneGraph, SceneNode } from '@nex-design/core/scene-graph'

import SYSTEM_PROMPT from '@/app/ai/chat/system-prompt.md?raw'
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
  if (REFERENCE_PATTERN.test(request)) return 'reference'
  if (INSPECT_PATTERN.test(request)) return 'inspect'
  if (MODIFY_PATTERN.test(request)) return 'modify'
  if (CREATE_PATTERN.test(request)) return 'create'
  return 'modify'
}

function nodeLabel(node: SceneNode): string {
  return `${node.name} (${node.type}, ${Math.round(node.width)}x${Math.round(node.height)})`
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
  const styleGuide = store.graph
    .getPages(true)
    .find((candidate) => candidate.name === 'Style Guide')

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
    `Style guide: ${styleGuide ? `available as page ${styleGuide.id}` : 'not present'}.`
  ].join('\n')
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
    'Use a layered design pass:',
    '1. Skeleton: create the root frame and named section placeholders with layout, hierarchy, and spatial boundaries.',
    '2. Content: fill one section at a time using render with parent_id or replace_id so each change stays spatially scoped.',
    '3. Refine: establish typography, color, spacing, icons, and visual hierarchy; reuse any relevant Style Guide tokens.',
    '4. Validate: call describe on the completed root, correct concrete layout issues, and stop when the requested design is complete.'
  ].join('\n')
}

export function buildAgentInstructions(options: {
  store: AgentDocumentState
  request: string
}): string {
  const intent = classifyAgentIntent(options.request)
  const base = SYSTEM_PROMPT
  const hasStyleGuide = options.store.graph
    .getPages(true)
    .some((page) => page.name === 'Style Guide')
  const skills = resolveAgentSkills({
    intent,
    request: options.request,
    hasSelection: options.store.state.selectedIds.size > 0,
    hasStyleGuide
  })
  const memory = buildGenerationMemoryContext(options.store.state.documentName ?? 'Untitled')
  const skillBlock = skills.instructions ? `\n\n${skills.instructions}` : ''
  return `${base}${skillBlock}\n\n## Runtime design context\n\n${buildAgentDocumentContext(options.store)}\n\n## Local design memory\n\n${memory}\n\nTask mode: ${intent}.\n${workflowFor(intent)}`
}
