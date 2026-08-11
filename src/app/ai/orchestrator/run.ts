import { createLanguageModel } from '@/app/ai/chat/model'
import type { ModelConfig } from '@/app/ai/chat/model'
import { apiKey, customAPIType, customBaseURL, customModelID, modelID, providerID } from '@/app/ai/chat/storage'
import { runOrchestrator } from '@nex-design/core/orchestrator'
import type { OrchestratorOptions } from '@nex-design/core/orchestrator'
import type { EditorStore } from '@/app/editor/session'

function asEditor(store: EditorStore): EditorStore {
  return store
}

export async function runDesignOrchestrator(
  store: EditorStore,
  prompt: string,
  options: OrchestratorOptions = {}
): Promise<{ rootId: string; warnings: string[]; totalNodes: number }> {
  const editor = asEditor(store)
  if (!editor.ctx) {
    throw new Error('Editor not initialized')
  }

  const config: ModelConfig = {
    providerID: providerID.value,
    apiKey: apiKey.value,
    modelID: modelID.value,
    customModelID: customModelID.value,
    customBaseURL: customBaseURL.value,
    customAPIType: customAPIType.value
  }

  const languageModel = createLanguageModel(config)

  const result = await runOrchestrator(editor.ctx, prompt, languageModel, options)

  return {
    rootId: result.rootId,
    warnings: result.warnings,
    totalNodes: result.totalNodes
  }
}
