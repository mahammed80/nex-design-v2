export type AgentSkillPhase = 'planning' | 'generation' | 'validation' | 'reference'
export type AgentTaskIntent = 'create' | 'modify' | 'inspect' | 'reference'

export interface AgentSkillContext {
  intent: AgentTaskIntent
  request: string
  hasSelection: boolean
  hasStyleGuide: boolean
}

export interface AgentSkillDefinition {
  id: string
  phase: AgentSkillPhase
  priority: number
  tokenBudget: number
  instructions: string
  matches: (context: AgentSkillContext) => boolean
}

export interface ResolvedAgentSkills {
  ids: string[]
  instructions: string
  tokenBudget: number
}
