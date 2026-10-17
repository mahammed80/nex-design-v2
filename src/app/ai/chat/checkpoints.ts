import { shallowReactive } from 'vue'

import type { SceneNode } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

type PageSnapshot = Map<string, SceneNode>
export type AgentCheckpointVersion = 'before' | 'result'

export interface AgentRunCheckpoint {
  id: string
  label: string
  createdAt: number
  before: PageSnapshot
  result: PageSnapshot
}

const MAX_CHECKPOINTS = 10
const checkpointsByStore = new WeakMap<EditorStore, AgentRunCheckpoint[]>()

function checkpointId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function snapshotsMatch(left: PageSnapshot, right: PageSnapshot): boolean {
  if (left.size !== right.size) return false
  for (const [id, leftNode] of left) {
    const rightNode = right.get(id)
    if (!rightNode || JSON.stringify(leftNode) !== JSON.stringify(rightNode)) return false
  }
  return true
}

export function getAgentRunCheckpoints(store: EditorStore): AgentRunCheckpoint[] {
  const existing = checkpointsByStore.get(store)
  if (existing) return existing
  const created = shallowReactive<AgentRunCheckpoint[]>([])
  checkpointsByStore.set(store, created)
  return created
}

export function recordAgentRunCheckpoint(
  store: EditorStore,
  request: string,
  before: PageSnapshot,
  result: PageSnapshot
): AgentRunCheckpoint | null {
  if (snapshotsMatch(before, result)) return null
  const checkpoint: AgentRunCheckpoint = {
    id: checkpointId(),
    label: request.trim().slice(0, 64) || 'AI design run',
    createdAt: Date.now(),
    before,
    result
  }
  const checkpoints = getAgentRunCheckpoints(store)
  checkpoints.unshift(checkpoint)
  if (checkpoints.length > MAX_CHECKPOINTS) checkpoints.splice(MAX_CHECKPOINTS)
  return checkpoint
}

export function restoreAgentRunCheckpoint(
  store: EditorStore,
  checkpoint: AgentRunCheckpoint,
  version: AgentCheckpointVersion
): void {
  const previous = store.snapshotPage()
  const target = version === 'before' ? checkpoint.before : checkpoint.result
  store.restorePageFromSnapshot(target)
  store.pushUndoEntry({
    label: `AI checkpoint: ${version}`,
    forward: () => store.restorePageFromSnapshot(target),
    inverse: () => store.restorePageFromSnapshot(previous)
  })
  store.requestRender()
}
