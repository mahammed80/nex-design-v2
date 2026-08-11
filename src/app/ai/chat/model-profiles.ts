export function resolveEffectiveModelId(modelId: string, customModelId: string): string {
  return customModelId.trim() || modelId
}
