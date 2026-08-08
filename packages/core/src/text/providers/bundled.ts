import type { FontProvider } from '#core/text/providers/types'

export const bundledFontsProvider: FontProvider = {
  id: 'bundled',
  name: 'Bundled',

  async listFamilies(): Promise<string[]> {
    return ['Inter', 'Noto Naskh Arabic', 'Cairo', 'Amiri', 'Roboto', 'Montserrat']
  },

  async fetchFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
    try {
      const familyNoSpace = family.replace(/ /g, '')
      const url = `/${familyNoSpace}-${style}.ttf`
      const res = await fetch(url)
      if (res.ok) {
        return await res.arrayBuffer()
      }
      return null
    } catch {
      return null
    }
  }
}
