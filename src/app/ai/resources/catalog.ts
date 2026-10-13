export type DesignResourceCategory = 'community' | 'ui-kit' | 'icons' | 'illustrations' | 'photos'

export interface DesignResource {
  id: string
  name: string
  categories: DesignResourceCategory[]
  description: string
  url: string
  license: string
  licenseUrl: string
  aiUse: string
  caution?: string
}

export const DESIGN_RESOURCES: DesignResource[] = [
  {
    id: 'penpot-hub',
    name: 'Penpot Hub Libraries & Templates',
    categories: ['community', 'ui-kit', 'icons'],
    description:
      'Community dashboard UI kits, design systems, wireframes, templates, and icon libraries.',
    url: 'https://penpot.app/penpothub/libraries-templates',
    license: 'Per-resource community terms',
    licenseUrl: 'https://penpot.app/penpothub/libraries-templates',
    aiUse:
      'Use for discovery and inspiration; download only after checking the selected resource terms.',
    caution: 'Community availability does not guarantee unrestricted commercial reuse.'
  },
  {
    id: 'flowbite',
    name: 'Flowbite',
    categories: ['ui-kit'],
    description:
      'Open-source Tailwind component patterns for dashboards and common web application interfaces.',
    url: 'https://flowbite.com/docs/getting-started/introduction/',
    license: 'MIT for the released open-source code',
    licenseUrl: 'https://flowbite.com/docs/getting-started/license/',
    aiUse:
      'Study or import public component examples, then adapt the result into original editable layers.',
    caution: 'Flowbite Pro assets use a separate paid license.'
  },
  {
    id: 'lucide',
    name: 'Lucide',
    categories: ['icons'],
    description:
      'Consistent open-source outline icons already available through the built-in Icon element.',
    url: 'https://lucide.dev/icons/',
    license: 'ISC',
    licenseUrl: 'https://lucide.dev/license',
    aiUse: 'Prefer <Icon name="lucide:..."> so icons stay vector and editable.'
  },
  {
    id: 'openverse',
    name: 'Openverse',
    categories: ['photos', 'illustrations'],
    description:
      'Search engine for Creative Commons and public-domain media with attribution metadata.',
    url: 'https://openverse.org/',
    license: 'Creative Commons or public domain; varies per work',
    licenseUrl: 'https://openverse.org/about',
    aiUse:
      'Find candidate media, preserve its attribution metadata, and verify the individual work license.',
    caution: 'Openverse recommends independently verifying every work license before reuse.'
  },
  {
    id: 'undraw',
    name: 'unDraw',
    categories: ['illustrations'],
    description: 'Customizable illustrations that are free for personal and commercial projects.',
    url: 'https://undraw.co/illustrations',
    license: 'unDraw license',
    licenseUrl: 'https://undraw.co/license',
    aiUse:
      'Offer it as a manual asset source; a user-selected illustration can be adapted in a design.',
    caution:
      'Do not scrape, bulk redistribute, build an integration around, or use the assets for AI training.'
  },
  {
    id: 'pexels',
    name: 'Pexels',
    categories: ['photos'],
    description: 'Free stock photography available directly through the built-in stock_photo tool.',
    url: 'https://www.pexels.com/',
    license: 'Pexels license',
    licenseUrl: 'https://www.pexels.com/license/',
    aiUse:
      'Prefer stock_photo for direct placement on leaf shapes; use specific descriptive queries.'
  }
]

function searchableText(resource: DesignResource): string {
  return [
    resource.name,
    resource.description,
    resource.license,
    resource.aiUse,
    ...resource.categories
  ]
    .join(' ')
    .toLowerCase()
}

export function findDesignResources(options: {
  query?: string
  category?: DesignResourceCategory
}): DesignResource[] {
  const query = options.query?.trim().toLowerCase()
  return DESIGN_RESOURCES.filter((resource) => {
    if (options.category && !resource.categories.includes(options.category)) return false
    if (query && !searchableText(resource).includes(query)) return false
    return true
  })
}
