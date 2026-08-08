import type { FontProvider } from '#core/text/providers/types'

export const fontsourceProvider: FontProvider = {
  id: 'fontsource',
  name: 'Fontsource',

  async listFamilies(): Promise<string[]> {
    return []
  },

  async fetchFont(_family: string, _style = 'Regular'): Promise<ArrayBuffer | null> {
    return null
  }
}
