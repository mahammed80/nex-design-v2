import { defineTool } from '@nex-design/core/tools'

import { isReferenceAuthorized } from './authorization'
import { MAX_REFERENCE_BYTES, uniqueMatches, validateReferenceUrl } from './url-utils'

export const studyReference = defineTool({
  name: 'study_reference',
  description:
    'Fetch public HTML from a user-authorized reference URL and extract non-proprietary design evidence. Never call without explicit user authorization.',
  params: {
    url: { type: 'string', description: 'Public HTTP(S) reference URL', required: true },
    authorized: {
      type: 'boolean',
      description: 'True only when the user confirmed they own or may study this reference',
      required: true
    }
  },
  execute: async (_figma, args) => {
    if (!args.authorized) return { error: 'Reference study requires explicit user authorization.' }
    const url = validateReferenceUrl(args.url)
    if (!isReferenceAuthorized(url)) {
      return {
        error: 'Ask the user to confirm ownership or permission for this URL before studying it.'
      }
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) return { error: `Reference returned HTTP ${response.status}.` }
    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_REFERENCE_BYTES)
      return { error: 'Reference is larger than the 1 MB study limit.' }
    const html = (await response.text()).slice(0, MAX_REFERENCE_BYTES)
    return {
      url: url.toString(),
      title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? url.hostname,
      colors: uniqueMatches(html, /#[0-9a-f]{3,8}\b/gi, 24),
      fontFamilies: uniqueMatches(html, /font-family\s*:\s*[^;}"]+/gi, 12),
      mediaQueries: uniqueMatches(html, /@media\s*\([^)]*\)/gi, 12),
      note: 'Use this as design evidence only. Do not copy protected brand assets or proprietary text.'
    }
  }
})
