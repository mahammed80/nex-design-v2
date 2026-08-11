export interface Skill {
  id: string
  name: string
  phase: 'Planning' | 'Generation' | 'Validation' | 'Maintenance'
  category: 'base' | 'domain' | 'knowledge'
  priority: number
  keywords?: string[]
  flags?: string[]
  content: string
}

export interface SkillContext {
  phase: 'Planning' | 'Generation' | 'Validation' | 'Maintenance'
  prompt: string
  flags?: string[]
  budgetTokens: number
}

export interface ResolvedSkills {
  skills: Skill[]
  totalTokens: number
  remainingBudget: number
}
