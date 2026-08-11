import { describe, expect, test } from 'bun:test'

import { resolveAgentSkills } from '@/app/ai/skills/resolve'

describe('agent skill resolver', () => {
  test('loads creation guidance in priority order', () => {
    const result = resolveAgentSkills({
      intent: 'create',
      request: 'Build a dashboard',
      hasSelection: false,
      hasStyleGuide: true
    })

    expect(result.ids).toEqual([
      'design-foundation',
      'scoped-orchestration',
      'structural-variety',
      'design-validation'
    ])
    expect(result.tokenBudget).toBe(2200)
  })

  test('loads reference guidance for URL studies', () => {
    const result = resolveAgentSkills({
      intent: 'reference',
      request: 'Study https://example.com',
      hasSelection: false,
      hasStyleGuide: false
    })

    expect(result.ids).toEqual(['reference-study', 'scoped-orchestration'])
  })
})
