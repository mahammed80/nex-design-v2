import type { SceneGraph } from '#core/scene-graph'

import { applyDesignPlan } from './apply/apply'
import { extractDesignTokens } from './apply/extract'
import { planDesignApply, type DesignApplyPlan } from './apply/plan'
import { parseDesignMd } from './codec/parse'
import { serializeDesignMd } from './codec/serialize'
import { getStoredDesignMd, setStoredDesignMd } from './storage'
import { emptyDesignSystem, type DesignSystemDoc } from './types'

/**
 * The document's design system: prose, description and components from the stored DESIGN.md,
 * token sections from the live variables (variables are the source of truth for values).
 */
export function readDesignSystem(graph: SceneGraph, fallbackName?: string): DesignSystemDoc {
  const stored = getStoredDesignMd(graph)
  const base = stored ? parseDesignMd(stored).doc : emptyDesignSystem(fallbackName)
  return { ...base, ...extractDesignTokens(graph) }
}

export function buildDesignMd(graph: SceneGraph, fallbackName?: string): string {
  return serializeDesignMd(readDesignSystem(graph, fallbackName))
}

export interface DesignApplyResult {
  plan: DesignApplyPlan
  collectionId: string
}

/** Apply DESIGN.md tokens to variables and store the source (normalized to v2) in the document. */
export function applyDesignSystem(graph: SceneGraph, doc: DesignSystemDoc): DesignApplyResult {
  const plan = planDesignApply(graph, doc)
  const collectionId = applyDesignPlan(graph, plan)
  setStoredDesignMd(graph, serializeDesignMd(doc))
  return { plan, collectionId }
}
