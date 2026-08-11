import type { LanguageModel } from 'ai'

import type { EditorContext } from '#core/editor'
import type { Fill, Stroke } from '#core/scene-graph'
import type { Subtask } from './types'

import { generateObject } from 'ai'
import { z } from 'zod'

export interface SubtaskResult {
  nodeId?: string
  warnings: string[]
  attempts: number
}

export async function runSubtask(
  ctx: EditorContext,
  subtask: Subtask,
  rootId: string,
  model: LanguageModel,
  _options?: { concurrency?: number }
): Promise<SubtaskResult> {
  const maxAttempts = 3
  const warnings: string[] = []
  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await attemptSubtask(ctx, subtask, rootId, model, attempt, lastError)
      if (result.nodeId) {
        return { ...result, attempts: attempt, warnings: [...warnings, ...result.warnings] }
      }
      lastError = result.warnings.join('; ') || 'no nodes generated'
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'unknown error'
    }
  }

  return { warnings: [`Failed after ${maxAttempts} attempts: ${lastError}`], attempts: maxAttempts }
}

async function attemptSubtask(
  ctx: EditorContext,
  subtask: Subtask,
  rootId: string,
  model: LanguageModel,
  attempt: number,
  previousError: string | null
): Promise<SubtaskResult> {
  const parentId = subtask.parentFrameId ?? rootId
  const parent = ctx.graph.getNode(parentId)
  if (!parent) {
    return { warnings: [`Parent frame ${parentId} not found`], attempts: 1 }
  }

  const skills = skillLevelForAttempt(attempt)
  const prompt = buildSubtaskPrompt(subtask, attempt, previousError)

  const result = await generateNodesForSubtask(ctx, model, subtask, skills, prompt, parentId, rootId)
  return {
    nodeId: result.nodeIds[0] ?? parentId,
    warnings: result.warnings,
    attempts: 1
  }
}

function skillLevelForAttempt(attempt: number): string {
  if (attempt === 1) return 'full'
  if (attempt === 2) return 'basic'
  return 'schema-only'
}

function layoutModeFor(layout?: string): 'HORIZONTAL' | 'VERTICAL' | 'NONE' {
  if (layout === 'horizontal') return 'HORIZONTAL'
  if (layout === 'vertical') return 'VERTICAL'
  return 'NONE'
}

function complexityLabel(attempt: number): string {
  if (attempt === 1) return 'detailed'
  if (attempt === 2) return 'simplified'
  return 'minimal'
}

interface GeneratedNodes {
  nodeIds: string[]
  warnings: string[]
}

async function generateNodesForSubtask(
  ctx: EditorContext,
  model: LanguageModel,
  subtask: Subtask,
  skills: string,
  prompt: string,
  _parentId: string,
  _rootId: string
): Promise<GeneratedNodes> {
  const schema = z.object({
    nodes: z.array(
      z.object({
        type: z.string(),
        name: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        layout: z.string().optional(),
        content: z.string().optional(),
        fills: z.array(z.unknown()).optional(),
        strokes: z.array(z.unknown()).optional()
      })
    )
  })

  const { object } = await generateObject({
    model,
    schema,
    system: `You are a design agent generating nodes for section "${subtask.label}". Skills: ${skills}. Return only valid JSON.`,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 4096
  })

  const warnings: string[] = []
  const nodeIds: string[] = []

  for (const nodeSpec of object.nodes) {
    try {
      const nodeType = (nodeSpec.type as 'FRAME' | 'RECTANGLE' | 'TEXT' | 'ELLIPSE' | 'GROUP') || 'FRAME'
      const node = ctx.graph.createNode(
        nodeType,
        subtask.parentFrameId ?? _rootId,
        {
          name: nodeSpec.name ?? `${subtask.label} Node`,
          x: nodeSpec.x ?? 0,
          y: nodeSpec.y ?? 0,
          width: nodeSpec.width ?? 200,
          height: nodeSpec.height ?? 100,
          layoutMode: layoutModeFor(nodeSpec.layout),
          fills: (nodeSpec.fills ?? []) as Fill[],
          strokes: (nodeSpec.strokes ?? []) as Stroke[]
        }
      )
      nodeIds.push(node.id)

      if (node.type === 'TEXT' && nodeSpec.content) {
        ctx.graph.updateNode(node.id, { text: nodeSpec.content } as Parameters<typeof ctx.graph.updateNode>[1])
      }

      ctx.runLayoutForNode(node.id)
    } catch (e) {
      warnings.push(`Failed to create ${nodeSpec.type}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return { nodeIds, warnings }
}

function buildSubtaskPrompt(subtask: Subtask, attempt: number, previousError: string | null): string {
  const retryContext = previousError ? `\n\nPrevious attempt failed: ${previousError}. Try a simpler approach.` : ''
  const complexity = complexityLabel(attempt)

  return `Generate ${complexity} UI for section: "${subtask.label}"\n` +
    `Elements needed: ${subtask.elements ?? 'general content'}\n` +
    `Region: ${subtask.region.width}% x ${subtask.region.height}%\n` +
    `Return an array of node objects. Each node needs: type (FRAME, RECTANGLE, TEXT, ELLIPSE), name, x, y, width, height, optional layout ("horizontal"/"vertical"), optional content for TEXT nodes.` +
    retryContext
}
