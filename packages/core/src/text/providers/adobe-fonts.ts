import type { FontProvider } from '#core/text/providers/types'

export const adobeFontsProvider: FontProvider = {
  id: 'adobe-fonts',
  name: 'Adobe Fonts',

  async listFamilies(): Promise<string[]> {
    return []
  },

  async fetchFont(_family: string, _style = 'Regular'): Promise<ArrayBuffer | null> {
    return null
  }
}

export function getAdobeProjectIds(): string[] {
  return []
}

export function setAdobeProjectIds(_ids: string[]): void {
  // stub
}
