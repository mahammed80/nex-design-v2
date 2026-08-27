import { describe, expect, test } from 'bun:test'

import { parseParityRegistry, registryCoverageLine } from '#scripts/parity/registry'

const MATRIX = `# Matrix

## Editing

| Feature | Status | Notes |
| --- | --- | --- |
| Frames | ✅ | End-to-end |
| Masks | 🔲 | Missing |
| Keyboard shortcuts | 🟡 | Core only |
| Verified export | 🧪 | Fixture-backed |
`

describe('parity registry', () => {
  test('parses capabilities with stable IDs and totals', () => {
    const registry = parseParityRegistry(MATRIX)

    expect(registry.capabilities.map((capability) => capability.id)).toEqual([
      'EDITING.FRAMES',
      'EDITING.MASKS',
      'EDITING.KEYBOARD-SHORTCUTS',
      'EDITING.VERIFIED-EXPORT'
    ])
    expect(registry.summary).toEqual({
      total: 4,
      addressed: 3,
      missing: 1,
      partial: 1,
      supported: 1,
      verified: 1
    })
    expect(registryCoverageLine(registry)).toContain('3 of 4')
    expect(registry.confidenceScore).toBe(56.3)
  })

  test('does not change its hash when only the generated coverage line changes', () => {
    const first = parseParityRegistry(MATRIX)
    const second = parseParityRegistry(`${MATRIX}\n**Coverage:** stale\n`)
    expect(first.sourceHash).toBe(second.sourceHash)
  })
})
