import { describe, expect, test } from 'bun:test'

import type { LanguageModel } from 'ai'

import { createEditor } from '@nex-design/core/editor'
import { runOrchestrator } from '@nex-design/core/orchestrator'

describe('design orchestrator screen placement', () => {
  test('places each generated screen to the right of existing screens', async () => {
    const editor = createEditor()
    const unavailableModel = {} as LanguageModel

    const first = await runOrchestrator(editor.ctx, 'Create a dashboard', unavailableModel)
    const second = await runOrchestrator(editor.ctx, 'Create settings', unavailableModel)
    const firstFrame = editor.graph.getNode(first.rootId)
    const secondFrame = editor.graph.getNode(second.rootId)

    expect(firstFrame).toBeDefined()
    expect(secondFrame).toBeDefined()
    expect(firstFrame?.x).toBe(0)
    expect(secondFrame?.x).toBe((firstFrame?.width ?? 0) + 120)
    expect(secondFrame?.y).toBe(firstFrame?.y)
  })
})
