import type { OrchestratorOptions, OrchestratorPlan } from './types'

import { generateObject } from 'ai'
import { z } from 'zod'
import type { LanguageModel } from 'ai'

import PLAN_SYSTEM_PROMPT from './prompts.md'

const PLAN_USER_PROMPT = (prompt: string) => `Decompose this design request into a spatial plan:\n\n${prompt}`

const planSchema = z.object({
  rootFrame: z.object({
    id: z.string(),
    name: z.string(),
    width: z.number(),
    height: z.number(),
    layout: z.enum(['none', 'horizontal', 'vertical']).optional(),
    gap: z.number().optional(),
    padding: z.number().optional(),
    fill: z.string().optional()
  }),
  subtasks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      region: z.object({ width: z.number(), height: z.number() }),
      idPrefix: z.string(),
      parentFrameId: z.string().optional(),
      screen: z.string().optional(),
      elements: z.string().optional()
    })
  ),
  styleGuideName: z.string().optional()
})

export async function generatePlan(
  prompt: string,
  model: LanguageModel,
  _options?: OrchestratorOptions
): Promise<OrchestratorPlan> {
  const { object } = await generateObject({
    model,
    schema: planSchema,
    system: PLAN_SYSTEM_PROMPT,
    prompt: PLAN_USER_PROMPT(prompt),
    temperature: 0.2,
    maxOutputTokens: 4096
  })

  return {
    rootFrame: {
      id: object.rootFrame.id,
      name: object.rootFrame.name,
      width: object.rootFrame.width,
      height: object.rootFrame.height,
      layout: object.rootFrame.layout ?? 'vertical',
      gap: object.rootFrame.gap ?? 24,
      padding: object.rootFrame.padding ?? 24,
      fill: object.rootFrame.fill ?? '#ffffff'
    },
    subtasks: object.subtasks.map((s) => ({
      id: s.id,
      label: s.label,
      region: s.region,
      idPrefix: s.idPrefix,
      parentFrameId: s.parentFrameId,
      screen: s.screen,
      elements: s.elements
    })),
    styleGuideName: object.styleGuideName
  }
}

export function buildFallbackPlan(prompt: string): OrchestratorPlan {
  const label = prompt.trim().slice(0, 40) || 'Design'
  const sectionId = (index: number) => `section-${index + 1}`

  return {
    rootFrame: {
      id: 'root',
      name: `${label} Page`,
      width: 1440,
      height: 900,
      layout: 'vertical',
      gap: 24,
      padding: 24,
      fill: '#ffffff'
    },
    subtasks: [
      { id: sectionId(0), label: 'Header', region: { width: 100, height: 20 }, idPrefix: 'header', parentFrameId: 'root', elements: 'navigation, logo, title' },
      { id: sectionId(1), label: 'Main', region: { width: 100, height: 60 }, idPrefix: 'main', parentFrameId: 'root', elements: 'primary content' },
      { id: sectionId(2), label: 'Footer', region: { width: 100, height: 20 }, idPrefix: 'footer', parentFrameId: 'root', elements: 'links, copyright' }
    ]
  }
}
