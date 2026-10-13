import {
  applyDesignSystem,
  buildDesignMd,
  designTokenVariables,
  parseDesignMd,
  parseTokenVariableName,
  planDesignApply,
  readDesignSystem,
  TYPOGRAPHY_PROPS,
  tokenVariableName,
  type TokenGroup,
  type TypographyProp
} from '#core/design-system'
import { VARIABLE_BINDING_FIELDS } from '#core/kiwi/node-change/convert'
import { defineTool } from '#core/tools/schema'

const PAINT_FIELD = /^(fills|strokes)\/\d+\/color$/
const TOKEN_GROUPS: readonly string[] = ['colors', 'typography', 'rounded', 'spacing']

function isTokenGroup(value: string | undefined): value is TokenGroup {
  return value !== undefined && TOKEN_GROUPS.includes(value)
}

function isTypographyProp(value: string | undefined): value is TypographyProp {
  return value !== undefined && value in TYPOGRAPHY_PROPS
}

export const readDesignSystemTool = defineTool({
  name: 'read_design_system',
  description:
    "Read the document's design system (DESIGN.md): tokens for colors, typography, rounded, spacing, plus components and written guidelines. Tokens are variables named like colors/primary or typography/body/font-size — bind them with bind_to_token instead of hardcoding values. Read-only.",
  params: {
    include_markdown: {
      type: 'boolean',
      description: 'Also return the full DESIGN.md source including prose (default false).'
    }
  },
  execute: (figma, args) => {
    const system = readDesignSystem(figma.graph)
    return {
      name: system.name,
      description: system.description,
      colors: system.colors,
      typography: system.typography,
      rounded: system.rounded,
      spacing: system.spacing,
      components: system.components,
      variables: designTokenVariables(figma.graph).map((variable) => ({
        id: variable.id,
        name: variable.name,
        type: variable.type
      })),
      ...(args.include_markdown ? { markdown: buildDesignMd(figma.graph) } : {})
    }
  }
})

export const applyDesignSystemTool = defineTool({
  name: 'apply_design_system',
  mutates: true,
  description:
    'Apply a DESIGN.md (YAML front-matter with colors / typography / rounded / spacing / components, then markdown prose) to the document: creates, updates, and removes token variables and stores the source. Use dry_run first to preview the changes.',
  params: {
    markdown: { type: 'string', description: 'Complete DESIGN.md source.', required: true },
    dry_run: { type: 'boolean', description: 'Only report planned changes (default false).' }
  },
  execute: (figma, args) => {
    const { doc, diagnostics } = parseDesignMd(args.markdown)
    const errors = diagnostics.filter((d) => d.severity === 'error')
    if (errors.length > 0)
      return { error: 'DESIGN.md has errors; nothing was applied.', diagnostics }
    const plan = args.dry_run
      ? planDesignApply(figma.graph, doc)
      : applyDesignSystem(figma.graph, doc).plan
    return {
      applied: !args.dry_run,
      create: plan.create.map((t) => t.name),
      update: plan.update.map((t) => t.name),
      remove: plan.remove.map((t) => t.name),
      conflicts: plan.conflicts,
      unchanged: plan.unchanged,
      diagnostics
    }
  }
})

export const bindToToken = defineTool({
  name: 'bind_to_token',
  mutates: true,
  description:
    'Bind a node property to a design-system token, e.g. token "colors.primary" to field "fills/0/color", "spacing.md" to "itemSpacing", "rounded.lg" to "cornerRadius", or "typography.body.fontSize" to "fontSize".',
  params: {
    id: { type: 'string', description: 'Node ID', required: true },
    field: {
      type: 'string',
      description: `Property: fills/N/color, strokes/N/color, or one of ${Object.keys(VARIABLE_BINDING_FIELDS).join(', ')}`,
      required: true
    },
    token: {
      type: 'string',
      description:
        'Token path: colors.<name>, rounded.<name>, spacing.<name>, or typography.<name>.<prop>',
      required: true
    }
  },
  execute: (figma, args) => {
    if (!figma.graph.getNode(args.id)) return { error: `Node not found: ${args.id}` }
    if (!PAINT_FIELD.test(args.field) && !(args.field in VARIABLE_BINDING_FIELDS)) {
      return { error: `Unsupported field "${args.field}".` }
    }
    const [group, token, prop] = args.token.split('.')
    if (!isTokenGroup(group) || !token || (group === 'typography' && !isTypographyProp(prop))) {
      return {
        error: `Token must look like colors.primary or typography.body.fontSize (props: ${Object.keys(TYPOGRAPHY_PROPS).join(', ')}).`
      }
    }
    const wanted = tokenVariableName({
      group,
      token,
      prop: group === 'typography' && isTypographyProp(prop) ? prop : undefined
    })
    const variable = designTokenVariables(figma.graph).find((candidate) => {
      const ref = parseTokenVariableName(candidate.name, candidate.type)
      return ref !== null && tokenVariableName(ref) === wanted
    })
    if (!variable) return { error: `No design token "${args.token}". Call read_design_system.` }
    figma.graph.bindVariable(args.id, args.field, variable.id)
    return { id: args.id, field: args.field, variable: variable.name }
  }
})
