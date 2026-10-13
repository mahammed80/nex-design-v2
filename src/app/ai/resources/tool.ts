import { defineTool } from '@nex-design/core/tools'

import { findDesignResources } from './catalog'
import type { DesignResourceCategory } from './catalog'

const RESOURCE_CATEGORIES: DesignResourceCategory[] = [
  'community',
  'ui-kit',
  'icons',
  'illustrations',
  'photos'
]

export const findDesignResourcesTool = defineTool({
  name: 'find_design_resources',
  description:
    'Find curated free or open community resources for a design: UI kits, templates, icons, illustrations, and photos. Returns source and license guidance. Use before inventing or copying third-party assets when community resources would help.',
  params: {
    query: {
      type: 'string',
      description:
        'Optional need or style, such as dashboard, icons, photos, wireframe, or illustration'
    },
    category: {
      type: 'string',
      enum: RESOURCE_CATEGORIES,
      description: 'Optional resource category filter'
    }
  },
  execute: (_figma, args) => {
    const category = args.category as DesignResourceCategory | undefined
    const resources = findDesignResources({ query: args.query, category })
    return {
      resources,
      usagePolicy: [
        'Free does not mean public domain; follow the license of the exact resource used.',
        'Prefer permissive sources and original composition over copying a finished community design.',
        'Keep required attribution and never reuse protected logos or proprietary product copy.'
      ],
      note:
        resources.length > 0
          ? 'Choose the smallest relevant resource set, verify its current license, and adapt it to the requested design system.'
          : 'No curated match. Broaden the query or category; do not assume an unlisted asset is free.'
    }
  }
})
