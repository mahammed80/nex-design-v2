import {
  adobeFontsProvider,
  getAdobeProjectIds,
  setAdobeProjectIds as setAdobeProjectIdsRaw
} from '#core/text/providers/adobe-fonts'
import { bundledFontsProvider } from '#core/text/providers/bundled'
import { fontsourceProvider } from '#core/text/providers/fontsource'
import { systemFontsProvider } from '#core/text/providers/system'
import type { FontProvider, FontProviderId, FontEntry } from '#core/text/providers/types'

const providers: FontProvider[] = [
  systemFontsProvider,
  bundledFontsProvider,
  fontsourceProvider,
  adobeFontsProvider
]

export type { FontProvider, FontProviderId, FontEntry }
export { getAdobeProjectIds }

export function setAdobeProjectIds(ids: string[]): void {
  setAdobeProjectIdsRaw(ids)
  resetProviderCache()
}

export function getProviders(): FontProvider[] {
  return providers
}

export function getProvider(id: FontProviderId): FontProvider | undefined {
  return providers.find((p) => p.id === id)
}

let listed: FontEntry[] | null = null
let listPromise: Promise<FontEntry[]> | null = null

export async function listAllProviderFamilies(): Promise<FontEntry[]> {
  if (listed) return listed
  if (listPromise) return listPromise

  listPromise = (async () => {
    const results = await Promise.allSettled(
      providers.map(async (p) => {
        try {
          const families = await p.listFamilies()
          return families.map((family) => ({ family, provider: p.id }))
        } catch {
          return []
        }
      })
    )

    const entries: FontEntry[] = []
    const seen = new Set<string>()
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const entry of result.value) {
          const key = entry.family.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            entries.push(entry)
          }
        }
      }
    }

    entries.sort((a, b) => a.family.localeCompare(b.family))
    listed = entries
    return listed
  })()

  return listPromise
}

export async function fetchFromProvider(
  family: string,
  style = 'Regular'
): Promise<ArrayBuffer | null> {
  for (const p of providers) {
    const data = await p.fetchFont(family, style)
    if (data) return data
  }
  return null
}

export function resetProviderCache(): void {
  listed = null
  listPromise = null
}
