import { fontManager } from '#core/text/fonts'
import type { FontProvider } from '#core/text/providers/types'

export const systemFontsProvider: FontProvider = {
  id: 'system',
  name: 'Local System',

  async listFamilies(): Promise<string[]> {
    return fontManager.listFamilies()
  },

  async fetchFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
    return fontManager.loadLocalFont(family, style)
  }
}
