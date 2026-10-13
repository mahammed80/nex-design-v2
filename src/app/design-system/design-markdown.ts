import {
  applyDesignSystem,
  buildDesignMd,
  parseDesignMd,
  planDesignApply,
  restoreDesignState,
  snapshotDesignState,
  type DesignApplyPlan,
  type ParsedDesignMd
} from '@nex-design/core/design-system'
import type { SceneGraph, Variable, VariableValue } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

/**
 * App wrapper over the core DESIGN.md v2 codec (`@nex-design/core/design-system`): adds undo and
 * the document name. The Style Guide, AI agent, and presets all go through these entry points.
 */

const FALLBACK_NAME = 'NexDesign System'

/** Value in the collection's default mode, falling back to the first stored mode. */
export function defaultModeValue(
  graph: Pick<SceneGraph, 'variableCollections'>,
  variable: Variable
): VariableValue | undefined {
  const modeId = graph.variableCollections.get(variable.collectionId)?.defaultModeId
  const values = variable.valuesByMode ?? {}
  return (modeId ? values[modeId] : undefined) ?? Object.values(values)[0]
}

/** The document's current DESIGN.md: stored prose + components, tokens from live variables. */
export function serializeDesignMarkdown(store: Pick<EditorStore, 'graph' | 'state'>): string {
  return buildDesignMd(store.graph, store.state.documentName || FALLBACK_NAME)
}

export interface DesignMarkdownPreview {
  parsed: ParsedDesignMd
  plan: DesignApplyPlan
}

/** Parse and plan without touching the document (for the apply diff preview). */
export function previewDesignMarkdown(
  store: Pick<EditorStore, 'graph'>,
  markdown: string
): DesignMarkdownPreview {
  const parsed = parseDesignMd(markdown)
  return { parsed, plan: planDesignApply(store.graph, parsed.doc) }
}

/** Apply DESIGN.md tokens to variables and store its source, as one undo step. */
export function applyDesignMarkdown(editor: EditorStore, markdown: string): DesignMarkdownPreview {
  const parsed = parseDesignMd(markdown)
  const before = snapshotDesignState(editor.graph)
  const { plan } = applyDesignSystem(editor.graph, parsed.doc)
  const after = snapshotDesignState(editor.graph)
  const restore = (snapshot: typeof before) => {
    restoreDesignState(editor.graph, snapshot)
    editor.requestRender()
  }
  editor.undo.push({
    label: 'Apply DESIGN.md',
    forward: () => restore(after),
    inverse: () => restore(before)
  })
  editor.requestRender()
  return { parsed, plan }
}
