import { describe, expect, test } from 'bun:test'

import { DESIGN_RESOURCES, findDesignResources } from '@/app/ai/resources/catalog'

describe('design community resources', () => {
  test('every resource includes source and license guidance', () => {
    expect(DESIGN_RESOURCES.length).toBeGreaterThan(0)
    for (const resource of DESIGN_RESOURCES) {
      expect(resource.url).toStartWith('https://')
      expect(resource.licenseUrl).toStartWith('https://')
      expect(resource.license.length).toBeGreaterThan(0)
      expect(resource.aiUse.length).toBeGreaterThan(0)
    }
  })

  test('filters by category and practical search terms', () => {
    const icons = findDesignResources({ category: 'icons' })
    expect(icons.some((resource) => resource.id === 'lucide')).toBe(true)
    expect(icons.every((resource) => resource.categories.includes('icons'))).toBe(true)

    const openMedia = findDesignResources({ query: 'creative commons' })
    expect(openMedia.map((resource) => resource.id)).toContain('openverse')
  })
})
