import { useLocalStorage } from '@vueuse/core'

import type { SceneGraph } from '@nex-design/core/scene-graph'

export interface AgentGenerationMemory {
  request: string
  fingerprint: string
  timestamp: number
}

const MEMORY_PREFIX = 'nex-design:agent-memory:'
const MAX_GENERATIONS = 12
const pendingRequests = new WeakMap<object, string>()
const generationMemory = useLocalStorage<Record<string, AgentGenerationMemory[]>>(MEMORY_PREFIX, {})

export function setAgentMemoryRequest(owner: object, request: string): void {
  pendingRequests.set(owner, request.trim())
}

export function getAgentMemoryRequest(owner: object): string {
  return pendingRequests.get(owner) ?? ''
}

function storageKey(documentName: string): string {
  return `${MEMORY_PREFIX}${encodeURIComponent(documentName || 'Untitled')}`
}

export function designFingerprint(graph: SceneGraph, pageId: string): string {
  const page = graph.getNode(pageId)
  if (!page) return 'empty'
  return (
    page.childIds
      .map((id) => graph.getNode(id))
      .filter((node) => !!node)
      .slice(0, 16)
      .map(
        (node) =>
          `${node.type}:${Math.round(node.width / 20)}x${Math.round(node.height / 20)}:${node.childIds.length}`
      )
      .join('|') || 'empty'
  )
}

export function readGenerationMemory(documentName: string): AgentGenerationMemory[] {
  return (generationMemory.value[storageKey(documentName)] ?? []).slice(-MAX_GENERATIONS)
}

export function recordGenerationMemory(options: {
  documentName: string
  request: string
  graph: SceneGraph
  pageId: string
}): void {
  if (!options.request.trim()) return
  const entries = readGenerationMemory(options.documentName)
  const next = {
    request: options.request.trim().slice(0, 500),
    fingerprint: designFingerprint(options.graph, options.pageId),
    timestamp: Date.now()
  }
  const previous = entries.at(-1)
  if (previous?.request === next.request && previous.fingerprint === next.fingerprint) return
  entries.push(next)
  generationMemory.value = {
    ...generationMemory.value,
    [storageKey(options.documentName)]: entries.slice(-MAX_GENERATIONS)
  }
}

export function buildGenerationMemoryContext(documentName: string): string {
  const recent = readGenerationMemory(documentName).slice(-4)
  if (recent.length === 0) {
    return 'No prior accepted generation patterns are recorded for this document.'
  }
  return [
    'Recent document generations:',
    ...recent.map((entry) => `- ${entry.request} [structure ${entry.fingerprint}]`),
    'Avoid repeating a recent structure unless the brief or existing document requires it.'
  ].join('\n')
}

export function clearGenerationMemory(documentName: string): void {
  const next = { ...generationMemory.value }
  Reflect.deleteProperty(next, storageKey(documentName))
  generationMemory.value = next
}
