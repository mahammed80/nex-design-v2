import { colorToHex } from '#core/color'
import { defineRule } from '#core/lint/rule'
import type { LintNode, RuleContext } from '#core/lint/types'

const SPACING_FIELDS = [
  'itemSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft'
] as const

function checkPaints(
  node: LintNode,
  context: RuleContext,
  colors: Map<string, string>,
  field: 'fills' | 'strokes'
) {
  node[field].forEach((paint, index) => {
    if (!paint.visible || !paint.color) return
    if (field === 'fills' && 'type' in paint && paint.type !== 'SOLID') return
    if (node.boundVariables[`${field}/${index}/color`] ?? node.boundVariables[field]) return
    const token = colors.get(colorToHex({ ...paint.color, a: 1 }))
    if (!token) return
    context.report({
      node,
      message: `${field === 'fills' ? 'Fill' : 'Stroke'} ${colorToHex({ ...paint.color, a: 1 })} matches design token colors.${token} but is not bound to it`,
      suggest: `Bind ${field}/${index}/color to colors/${token}`
    })
  })
}

/**
 * Raw values that equal a DESIGN.md token should reference the token, so later token edits
 * propagate. Only runs when the document defines a design system.
 */
export default defineRule({
  meta: {
    id: 'token-compliance',
    category: 'design-tokens',
    description: 'Values that match a design-system token should be bound to it'
  },
  match: [
    'RECTANGLE',
    'ELLIPSE',
    'FRAME',
    'TEXT',
    'VECTOR',
    'POLYGON',
    'STAR',
    'COMPONENT',
    'INSTANCE'
  ],
  check(node, context) {
    const tokens = context.getDesignTokens()
    if (!tokens) return
    checkPaints(node, context, tokens.colors, 'fills')
    checkPaints(node, context, tokens.colors, 'strokes')

    if (node.layoutMode !== 'NONE') {
      for (const field of SPACING_FIELDS) {
        const token = node[field] > 0 ? tokens.spacing.get(node[field]) : undefined
        if (token && !node.boundVariables[field]) {
          context.report({
            node,
            message: `${field} ${node[field]}px matches spacing.${token} but is not bound to it`,
            suggest: `Bind ${field} to spacing/${token}`
          })
        }
      }
    }

    const radiusToken = node.cornerRadius > 0 ? tokens.rounded.get(node.cornerRadius) : undefined
    if (radiusToken && !node.boundVariables.cornerRadius) {
      context.report({
        node,
        message: `Corner radius ${node.cornerRadius}px matches rounded.${radiusToken} but is not bound to it`,
        suggest: `Bind cornerRadius to rounded/${radiusToken}`
      })
    }
  }
})
