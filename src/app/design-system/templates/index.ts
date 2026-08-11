export const DESIGN_TEMPLATES = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Clean, modern fintech design with deep blues and precise typography.',
    file: 'stripe-DESIGN.md'
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Minimalist, dark-first design system with subtle gradients and sharp typography.',
    file: 'linear.app-DESIGN.md'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Black-and-white aesthetic with sharp edges and monochrome precision.',
    file: 'vercel-DESIGN.md'
  },
  {
    id: 'raycast',
    name: 'Raycast',
    description: 'Dark, polished productivity UI with subtle gradients and rounded corners.',
    file: 'raycast-DESIGN.md'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Emerald green accent on dark surfaces, developer-focused clarity.',
    file: 'supabase-DESIGN.md'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Clean, functional, whitespace-heavy with subtle borders and Inter-like typography.',
    file: 'notion-DESIGN.md'
  },
  {
    id: 'framer',
    name: 'Framer',
    description: 'Playful, creative, bold typography with vibrant accents and smooth motion.',
    file: 'framer-DESIGN.md'
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Vibrant, design-tool aesthetic with colorful gradients and rounded shapes.',
    file: 'figma-DESIGN.md'
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Minimal email infrastructure design with dark mode and subtle purple accents.',
    file: 'resend-DESIGN.md'
  }
] as const

export type DesignTemplateId = typeof DESIGN_TEMPLATES[number]['id']
