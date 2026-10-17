import type { LanguageModel } from 'ai'

import type { EditorContext } from '#core/editor'
import type { LayoutMode } from '#core/scene-graph'
import type { Color, Vector } from '#core/types'

import { generatePlan, buildFallbackPlan } from './plan'
import { runSubtask } from './subtask'
import type { OrchestratorOptions, OrchestratorPlan, RunSummary } from './types'

const GENERATED_SCREEN_GAP = 120

export async function runOrchestrator(
  ctx: EditorContext,
  prompt: string,
  model: LanguageModel,
  options: OrchestratorOptions = {}
): Promise<RunSummary> {
  const validationEnabled = options.validationEnabled ?? true

  let plan: OrchestratorPlan
  try {
    plan = await generatePlan(prompt, model, options)
  } catch {
    plan = buildFallbackPlan(prompt)
  }

  const rootId = scaffoldRoot(ctx, plan.rootFrame)

  const warnings: string[] = []
  const subtaskIds: string[] = []

  for (const subtask of plan.subtasks) {
    const result = await runSubtask(ctx, subtask, rootId, model, options)
    if (result.nodeId) {
      subtaskIds.push(result.nodeId)
      warnings.push(...result.warnings)
    }
  }

  if (validationEnabled) {
    runCleanup(ctx, rootId)
  }

  return {
    rootId,
    subtaskIds,
    warnings,
    totalNodes: countNodes(ctx.graph, rootId)
  }
}

function nextScreenPosition(ctx: EditorContext): Vector {
  const page = ctx.graph.getNode(ctx.state.currentPageId)
  if (!page) return { x: 0, y: 0 }
  const siblings = page.childIds
    .map((id) => ctx.graph.getNode(id))
    .filter((node): node is NonNullable<typeof node> => node?.type === 'FRAME')
  if (siblings.length === 0) return { x: 0, y: 0 }
  return {
    x: Math.max(...siblings.map((node) => node.x + node.width)) + GENERATED_SCREEN_GAP,
    y: Math.min(...siblings.map((node) => node.y))
  }
}

function scaffoldRoot(
  ctx: EditorContext,
  spec: {
    id: string
    name: string
    width: number
    height: number
    layout?: string
    gap?: number
    padding?: number
    fill?: string
  }
): string {
  const pageId = ctx.state.currentPageId
  const position = nextScreenPosition(ctx)
  const layoutMode = resolveLayoutMode(spec.layout)
  const root = ctx.graph.createNode('FRAME', pageId, {
    name: spec.name,
    x: position.x,
    y: position.y,
    width: spec.width,
    height: spec.height,
    layoutMode,
    itemSpacing: spec.gap ?? 24,
    paddingLeft: spec.padding ?? 24,
    paddingRight: spec.padding ?? 24,
    paddingTop: spec.padding ?? 24,
    paddingBottom: spec.padding ?? 24,
    fills: spec.fill
      ? [
          {
            type: 'SOLID',
            color: hexToColor(spec.fill),
            opacity: 1,
            visible: true,
            blendMode: 'NORMAL'
          }
        ]
      : []
  })

  ctx.runLayoutForNode(root.id)
  return root.id
}

function resolveLayoutMode(layout?: string): LayoutMode {
  if (layout === 'horizontal') return 'HORIZONTAL'
  if (layout === 'vertical') return 'VERTICAL'
  return 'NONE'
}

function runCleanup(_ctx: EditorContext, _rootId: string): void {
  // Placeholder for deterministic refinement passes.
  // Recompute layout for auto-layout frames if needed.
}

function countNodes(graph: EditorContext['graph'], rootId: string): number {
  return graph.countDescendants(rootId)
}

function hexToColor(hex: string): Color {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const a = c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}
