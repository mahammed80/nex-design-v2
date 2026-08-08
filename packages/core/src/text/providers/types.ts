export type FontProviderId = 'system' | 'bundled' | 'fontsource' | 'adobe-fonts'

export interface FontProvider {
  id: FontProviderId
  name: string
  listFamilies(): Promise<string[]>
  fetchFont(family: string, style?: string): Promise<ArrayBuffer | null>
}

export interface FontEntry {
  family: string
  provider: FontProviderId
}
