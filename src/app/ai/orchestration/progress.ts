import { shallowReactive } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'

export type AgentRunPhase =
  | 'idle'
  | 'planning'
  | 'reference'
  | 'building'
  | 'refining'
  | 'validating'

export interface AgentRunProgress {
  phase: AgentRunPhase
  role: 'planner' | 'researcher' | 'builder' | 'refiner' | 'critic' | null
  completed: AgentRunPhase[]
  activeTool: string | null
}

const progressByStore = new WeakMap<EditorStore, AgentRunProgress>()

export function getAgentRunProgress(store: EditorStore): AgentRunProgress {
  const existing = progressByStore.get(store)
  if (existing) return existing
  const created = shallowReactive<AgentRunProgress>({
    phase: 'idle',
    role: null,
    completed: [],
    activeTool: null
  })
  progressByStore.set(store, created)
  return created
}

function phaseForTool(toolName: string): Pick<AgentRunProgress, 'phase' | 'role'> {
  if (toolName === 'study_reference') return { phase: 'reference', role: 'researcher' }
  if (toolName === 'render') return { phase: 'building', role: 'builder' }
  if (toolName === 'describe' || toolName === 'design_audit')
    return { phase: 'validating', role: 'critic' }
  return { phase: 'refining', role: 'refiner' }
}

export function startAgentRun(store: EditorStore): void {
  const progress = getAgentRunProgress(store)
  progress.phase = 'planning'
  progress.role = 'planner'
  progress.completed = []
  progress.activeTool = null
}

export function recordAgentToolProgress(store: EditorStore, toolName: string): void {
  const progress = getAgentRunProgress(store)
  if (progress.phase !== 'idle' && !progress.completed.includes(progress.phase)) {
    progress.completed = [...progress.completed, progress.phase]
  }
  Object.assign(progress, phaseForTool(toolName), { activeTool: toolName })
}

export function finishAgentToolProgress(store: EditorStore): void {
  getAgentRunProgress(store).activeTool = null
}
