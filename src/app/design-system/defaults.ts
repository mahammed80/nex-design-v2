/**
 * Fallback type scale for the Style Guide specimen when a document hasn't defined the token.
 * Names match the Style Guide presets, so loading a preset fills these in. Reading a fallback
 * never writes a variable — opening the Style Guide must not mutate the document.
 */
export const DEFAULT_FONT_SIZES: Readonly<Record<string, number>> = {
  'font-size-display': 72,
  'font-size-h1': 54,
  'font-size-h2': 40,
  'font-size-h3': 32,
  'font-size-body': 16,
  'font-size-small': 14
}

export const FALLBACK_FONT_SIZE = 16
