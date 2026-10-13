import type { VariableType } from '#core/scene-graph'

import type { TokenGroup, TypographyToken } from './types'

/**
 * Token ⇄ variable naming. Tokens live as slash-path variables in one dedicated collection:
 *   colors/primary · typography/body-md/font-size · rounded/md · spacing/md
 * Pre-v2 Style Guide names (`color-*`, `font-size-*`, `space-*`, …) are still recognized when
 * reading so existing documents keep their categories.
 */

export const DESIGN_SYSTEM_COLLECTION_NAME = 'Design System'

export type TypographyProp = keyof TypographyToken

export const TYPOGRAPHY_PROPS: Record<TypographyProp, { slug: string; type: VariableType }> = {
  fontFamily: { slug: 'font-family', type: 'STRING' },
  fontSize: { slug: 'font-size', type: 'FLOAT' },
  fontWeight: { slug: 'font-weight', type: 'FLOAT' },
  lineHeight: { slug: 'line-height', type: 'FLOAT' },
  letterSpacing: { slug: 'letter-spacing', type: 'FLOAT' },
  fontFeature: { slug: 'font-feature', type: 'STRING' }
}

const PROP_BY_SLUG = new Map(
  (Object.entries(TYPOGRAPHY_PROPS) as Array<[TypographyProp, { slug: string }]>).map(
    ([prop, { slug }]) => [slug, prop]
  )
)

export interface TokenRef {
  group: TokenGroup
  token: string
  /** Set for typography tokens, which expand to one variable per property. */
  prop?: TypographyProp
}

export function tokenVariableName(ref: TokenRef): string {
  if (ref.group === 'typography' && ref.prop) {
    return `typography/${ref.token}/${TYPOGRAPHY_PROPS[ref.prop].slug}`
  }
  return `${ref.group}/${ref.token}`
}

export function tokenVariableType(ref: TokenRef): VariableType {
  if (ref.group === 'colors') return 'COLOR'
  if (ref.group === 'typography' && ref.prop) return TYPOGRAPHY_PROPS[ref.prop].type
  return 'FLOAT'
}

const LEGACY_PREFIXES: Array<[string, (rest: string, type: VariableType) => TokenRef | null]> = [
  ['font-size-', (token) => ({ group: 'typography', token, prop: 'fontSize' })],
  ['font-weight-', (token) => ({ group: 'typography', token, prop: 'fontWeight' })],
  ['font-family-', (token) => ({ group: 'typography', token, prop: 'fontFamily' })],
  [
    'font-',
    (token, type) => (type === 'STRING' ? { group: 'typography', token, prop: 'fontFamily' } : null)
  ],
  ['color-', (token, type) => (type === 'COLOR' ? { group: 'colors', token } : null)],
  ['spacing-', (token) => ({ group: 'spacing', token })],
  ['space-', (token) => ({ group: 'spacing', token })],
  ['radius-', (token) => ({ group: 'rounded', token })],
  ['rounded-', (token) => ({ group: 'rounded', token })]
]

/** Which token a variable represents, or null for non-token variables (gradients, logos, …). */
function parseSlashName(parts: string[], type: VariableType): TokenRef | null {
  const [group, token, slug] = parts
  if (!token) return null
  if (parts.length === 2) {
    if (group === 'colors' && type === 'COLOR') return { group, token }
    if ((group === 'rounded' || group === 'spacing') && type === 'FLOAT') return { group, token }
    return null
  }
  if (parts.length !== 3 || group !== 'typography' || !slug) return null
  const prop = PROP_BY_SLUG.get(slug)
  return prop && TYPOGRAPHY_PROPS[prop].type === type ? { group, token, prop } : null
}

export function parseTokenVariableName(name: string, type: VariableType): TokenRef | null {
  const parts = name.split('/')
  if (parts.length > 1) return parseSlashName(parts, type)

  for (const [prefix, toRef] of LEGACY_PREFIXES) {
    if (name.startsWith(prefix) && name.length > prefix.length) {
      const ref = toRef(name.slice(prefix.length), type)
      if (ref && tokenVariableType(ref) === type) return ref
    }
  }
  if (type === 'COLOR') return { group: 'colors', token: name }
  return null
}
