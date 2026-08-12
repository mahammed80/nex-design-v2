import { AGENT_SKILLS } from './registry'
import type { AgentSkillContext, ResolvedAgentSkills } from './types'

const FULL_SKILL_BUDGET = 3400

export function resolveAgentSkills(context: AgentSkillContext): ResolvedAgentSkills {
  const selected = AGENT_SKILLS.filter((skill) => skill.matches(context)).sort(
    (a, b) => b.priority - a.priority
  )
  const accepted = []
  let usedBudget = 0

  for (const skill of selected) {
    if (usedBudget + skill.tokenBudget > FULL_SKILL_BUDGET) continue
    accepted.push(skill)
    usedBudget += skill.tokenBudget
  }

  return {
    ids: accepted.map((skill) => skill.id),
    instructions: accepted
      .map((skill) => `### Skill: ${skill.id}\n\n${skill.instructions.trim()}`)
      .join('\n\n'),
    tokenBudget: usedBudget
  }
}
