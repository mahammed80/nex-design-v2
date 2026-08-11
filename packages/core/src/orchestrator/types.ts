export interface Region {
  width: number
  height: number
}

export interface Subtask {
  id: string
  label: string
  region: Region
  idPrefix: string
  parentFrameId?: string
  screen?: string
  elements?: string
  existingSectionLabels?: string[]
  retryFeedback?: string
}

export interface RootFrameSpec {
  id: string
  name: string
  width: number
  height: number
  layout?: 'none' | 'horizontal' | 'vertical'
  gap?: number
  padding?: number
  fill?: string
}

export interface OrchestratorPlan {
  rootFrame: RootFrameSpec
  subtasks: Subtask[]
  styleGuideName?: string
}

export interface OrchestratorOptions {
  concurrency?: number
  validationEnabled?: boolean
  appendContext?: boolean
  model?: string
  provider?: string
}

export interface RunSummary {
  rootId: string
  subtaskIds: string[]
  warnings: string[]
  totalNodes: number
}
