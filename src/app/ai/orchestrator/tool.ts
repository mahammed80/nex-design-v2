import { defineTool } from '@nex-design/core/tools'

import { getActiveEditorStore } from '@/app/editor/active-store'
import { runDesignOrchestrator } from './run'

export const runOrchestratorTool = defineTool({
  name: 'run_orchestrator',
  description:
    'Generate a complete multi-section design from a natural language prompt. Uses spatial decomposition to create a root frame with section containers, then populates each section. Use this for full-page or multi-section design requests.',
  params: {
    prompt: {
      type: 'string',
      description: 'The design request in natural language (e.g. "Create a landing page for a SaaS product with hero, features, and footer")',
      required: true
    },
    styleGuide: {
      type: 'string',
      description: 'Optional style guide tag (e.g. "glassmorphism", "brutalist", "retro")',
      required: false
    },
    concurrency: {
      type: 'number',
      description: 'Number of concurrent sections to generate (1-6, default 1)',
      required: false
    }
  },
  execute: async (_figma, args) => {
    const store = getActiveEditorStore()
    if (!store) {
      return { error: 'Editor not initialized' }
    }

    const prompt = args.prompt as string
    if (!prompt || typeof prompt !== 'string') {
      return { error: 'Prompt is required' }
    }

    try {
      const result = await runDesignOrchestrator(store, prompt, {
        concurrency: (args.concurrency as number) ?? 1,
        validationEnabled: true
      })

      return {
        wrote: result.totalNodes,
        rootId: result.rootId,
        warnings: result.warnings,
        phase: 'orchestrator'
      }
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Orchestration failed'
      }
    }
  }
})
