import DESIGN_FOUNDATION from './instructions/design-foundation.md?raw'
import DESIGN_VALIDATION from './instructions/design-validation.md?raw'
import ORCHESTRATION from './instructions/orchestration.md?raw'
import REFERENCE_STUDY from './instructions/reference-study.md?raw'
import STRUCTURAL_VARIETY from './instructions/structural-variety.md?raw'
import FRONTEND_DESIGN from './instructions/frontend-design.md?raw'
import UI_UX_PRO_MAX from './instructions/ui-ux-pro-max.md?raw'
import SENIOR_FRONTEND from './instructions/senior-frontend.md?raw'
import WEB_ACCESSIBILITY_AUDIT from './instructions/web-accessibility-audit.md?raw'
import HALLMARK from './instructions/hallmark.md?raw'
import type { AgentSkillDefinition } from './types'

export const AGENT_SKILLS: AgentSkillDefinition[] = [
  {
    id: 'scoped-orchestration',
    phase: 'planning',
    priority: 95,
    tokenBudget: 500,
    instructions: ORCHESTRATION,
    matches: () => true
  },
  {
    id: 'design-foundation',
    phase: 'planning',
    priority: 100,
    tokenBudget: 600,
    instructions: DESIGN_FOUNDATION,
    matches: ({ intent }) => intent === 'create' || intent === 'modify'
  },
  {
    id: 'structural-variety',
    phase: 'generation',
    priority: 90,
    tokenBudget: 600,
    instructions: STRUCTURAL_VARIETY,
    matches: ({ intent }) => intent === 'create'
  },
  {
    id: 'design-validation',
    phase: 'validation',
    priority: 80,
    tokenBudget: 500,
    instructions: DESIGN_VALIDATION,
    matches: ({ intent }) => intent !== 'reference'
  },
  {
    id: 'reference-study',
    phase: 'reference',
    priority: 110,
    tokenBudget: 800,
    instructions: REFERENCE_STUDY,
    matches: ({ intent }) => intent === 'reference'
  },
  {
    id: 'frontend-design',
    phase: 'planning',
    priority: 100,
    tokenBudget: 220,
    instructions: FRONTEND_DESIGN,
    matches: () => true
  },
  {
    id: 'ui-ux-pro-max',
    phase: 'planning',
    priority: 100,
    tokenBudget: 220,
    instructions: UI_UX_PRO_MAX,
    matches: () => true
  },
  {
    id: 'senior-frontend',
    phase: 'generation',
    priority: 100,
    tokenBudget: 220,
    instructions: SENIOR_FRONTEND,
    matches: () => true
  },
  {
    id: 'web-accessibility-audit',
    phase: 'generation',
    priority: 100,
    tokenBudget: 220,
    instructions: WEB_ACCESSIBILITY_AUDIT,
    matches: () => true
  },
  {
    id: 'hallmark',
    phase: 'generation',
    priority: 105,
    tokenBudget: 240,
    instructions: HALLMARK,
    matches: () => true
  }
]
