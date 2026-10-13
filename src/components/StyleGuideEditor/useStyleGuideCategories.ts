import { computed, type ComputedRef } from 'vue'

import { parseTokenVariableName, type TokenRef } from '@nex-design/core/design-system'

import { DEFAULT_FONT_SIZES, FALLBACK_FONT_SIZE } from '@/app/design-system/defaults'

import type { StyleGuideVariable } from './utils'

/**
 * Sort document variables into Style Guide sections by the token they represent
 * (`colors/…`, `typography/<name>/font-size`, `spacing/…`, legacy `font-size-*`, …),
 * not by ad-hoc name prefixes.
 */
export function useStyleGuideCategories(variables: ComputedRef<StyleGuideVariable[]>) {
  const withRefs = computed(() =>
    variables.value.map((variable) => ({
      variable,
      ref: parseTokenVariableName(variable.name, variable.type)
    }))
  )
  const pick = (test: (ref: TokenRef) => boolean) =>
    computed(() =>
      withRefs.value.filter(({ ref }) => ref && test(ref)).map(({ variable }) => variable)
    )

  const colorTokens = pick((ref) => ref.group === 'colors')
  const colorPaletteVariables = computed(() => [
    ...colorTokens.value,
    ...variables.value.filter((v) => v.type === 'STRING' && v.name.startsWith('gradient-'))
  ])
  const fontSizeVariables = pick((ref) => ref.group === 'typography' && ref.prop === 'fontSize')
  const fontVariables = pick((ref) => ref.group === 'typography' && ref.prop === 'fontFamily')
  const spacingVariables = pick((ref) => ref.group === 'spacing' || ref.group === 'rounded')
  const logoVariables = computed(() =>
    variables.value.filter((v) => v.type === 'STRING' && v.name.startsWith('logo-'))
  )

  /** Accepts a token (`h1`) or legacy name (`font-size-h1`); falls back to the default scale. */
  function getFontSizeVal(name: string): number {
    const token = name.replace(/^font-size-/, '')
    const match = withRefs.value.find(
      ({ ref }) => ref?.group === 'typography' && ref.prop === 'fontSize' && ref.token === token
    )
    const value = match?.variable.value
    if (typeof value === 'number') return value
    return DEFAULT_FONT_SIZES[`font-size-${token}`] ?? FALLBACK_FONT_SIZE
  }

  function getFontSizeLabel(name: string): string {
    const ref = withRefs.value.find(({ variable }) => variable.name === name)?.ref
    const token = ref?.token ?? name.replace(/^font-size-/, '')
    return token
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return {
    colorPaletteVariables,
    fontSizeVariables,
    fontVariables,
    spacingVariables,
    logoVariables,
    getFontSizeVal,
    getFontSizeLabel
  }
}
