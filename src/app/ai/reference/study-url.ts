import { defineTool } from '@nex-design/core/tools'

import { MAX_REFERENCE_BYTES, uniqueMatches, validateReferenceUrl } from './url-utils'

function extractDesignTokens(html: string): {
  colors: string[]
  fonts: string[]
  spacing: number[]
  layout: string[]
} {
  const colors = uniqueMatches(html, /#[0-9a-f]{3,8}\b/gi, 32)
  const fonts = uniqueMatches(html, /font-family\s*:\s*([^;}"]+)/gi, 16)
  const spacing = [...html.matchAll(/(?:padding|margin|gap|space|spacing)[^:]*:\s*(\d+(?:\.\d+)?)(px|rem|em)/gi)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => Number.isFinite(n))
    .slice(0, 20)
  const layout = uniqueMatches(html, /(?:grid|flex|container|max-width|width|display)[^:]*:\s*[^;}]+/gi, 16)
  return { colors, fonts, spacing, layout }
}

export const studyReferenceUrl = defineTool({
  name: 'study_reference_url',
  description:
    'Fetch a live URL and extract design tokens (colors, fonts, spacing, layout). Use this to study a reference site and feed its design DNA into the orchestrator or design system.',
  params: {
    url: { type: 'string', description: 'Public HTTP(S) URL to study', required: true },
    authorized: {
      type: 'boolean',
      description: 'True only when the user confirmed they own or may study this reference',
      required: true
    },
    feedToOrchestrator: {
      type: 'boolean',
      description: 'If true, return tokens formatted for run_orchestrator prompt injection',
      required: false
    }
  },
  execute: async (_figma, args) => {
    if (!args.authorized) return { error: 'Reference study requires explicit user authorization.' }
    const url = validateReferenceUrl(args.url as string)
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return { error: `Reference returned HTTP ${response.status}.` }
    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_REFERENCE_BYTES)
      return { error: 'Reference is larger than the 1 MB study limit.' }
    const html = (await response.text()).slice(0, MAX_REFERENCE_BYTES)
    const tokens = extractDesignTokens(html)
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? url.hostname

    const result: Record<string, unknown> = {
      url: url.toString(),
      title,
      ...tokens,
      note: 'Use these tokens as design evidence only. Do not copy protected brand assets or proprietary text.'
    }

    if (args.feedToOrchestrator) {
      const promptSnippet = `Study reference: ${url.toString()}\n` +
        `Colors: ${tokens.colors.slice(0, 12).join(', ')}\n` +
        `Fonts: ${tokens.fonts.slice(0, 6).join(', ')}\n` +
        `Spacing values: ${tokens.spacing.slice(0, 10).join(', ')}\n` +
        `Layout hints: ${tokens.layout.slice(0, 6).join('; ')}`
      result.orchestratorPrompt = promptSnippet
      result.styleGuide = {
        colors: tokens.colors.slice(0, 12),
        fonts: tokens.fonts.slice(0, 6),
        spacing: tokens.spacing.slice(0, 10)
      }
    }

    return result
  }
})
