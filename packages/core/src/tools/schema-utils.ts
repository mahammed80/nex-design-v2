import type { ParamDef, ParamType } from './schema'

export function buildParamSchema(param: ParamDef): {
  base: unknown
  withDescription: unknown
  final: unknown
} {
  const typeMap: Record<ParamType, () => unknown> = {
    string: () => ({ enum: param.enum, type: 'string' }) as const,
    number: () => ({ min: param.min, max: param.max, type: 'number' }) as const,
    boolean: () => ({ type: 'boolean' }) as const,
    color: () => ({ pattern: '^#([0-9a-fA-F]{3,8})$', type: 'string' }) as const,
    'string[]': () => ({ minItems: 1, type: 'array', items: { type: 'string' } }) as const
  }

  return {
    base: typeMap[param.type](),
    withDescription: param.description ? { description: param.description } : {},
    final: param.required ? {} : { default: param.default }
  }
}

export function isValidColor(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^#([0-9a-fA-F]{3,8})$/.test(value)
}
