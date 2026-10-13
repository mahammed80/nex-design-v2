/**
 * DESIGN.md v2 — YAML front-matter (the Google Stitch `version: alpha` shape used by the bundled
 * templates) followed by free-form markdown prose. Token sections map onto document variables;
 * everything else (description, components, prose) round-trips verbatim through storage.
 */

export const DESIGN_MD_VERSION = 'alpha'

/** A color as written in DESIGN.md: one CSS color, or one per mode (`{ light, dark }`). */
export type ColorTokenValue = string | Record<string, string>

export interface TypographyToken {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number
  fontFeature?: string
}

export type ComponentToken = Record<string, string | number>

export interface DesignSystemDoc {
  version: string
  name: string
  description: string
  colors: Record<string, ColorTokenValue>
  typography: Record<string, TypographyToken>
  rounded: Record<string, number>
  spacing: Record<string, number>
  components: Record<string, ComponentToken>
  /** Markdown after the front-matter, preserved verbatim. */
  body: string
}

export type TokenGroup = 'colors' | 'typography' | 'rounded' | 'spacing'

export interface DesignDiagnostic {
  severity: 'error' | 'warning'
  /** Dotted token path, e.g. `colors.primary`. */
  path: string
  message: string
}

export interface ParsedDesignMd {
  doc: DesignSystemDoc
  format: 'yaml' | 'legacy'
  diagnostics: DesignDiagnostic[]
}

export function emptyDesignSystem(name = 'NexDesign System'): DesignSystemDoc {
  return {
    version: DESIGN_MD_VERSION,
    name,
    description: '',
    colors: {},
    typography: {},
    rounded: {},
    spacing: {},
    components: {},
    body: ''
  }
}
