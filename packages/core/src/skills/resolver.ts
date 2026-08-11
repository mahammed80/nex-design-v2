import type { Skill, SkillContext, ResolvedSkills } from './types'
import { TASTE_SKILLS } from './taste-skill'
import { HALLMARK_SKILLS } from './hallmark'

const BASE_SKILLS: Skill[] = [
  {
    id: 'schema',
    name: 'Design Schema',
    phase: 'Planning',
    category: 'base',
    priority: 1,
    content: `# Design Schema\n\nEvery node has: id, name, type, x, y, width, height, rotation, opacity, visible, locked.\nLayout modes: NONE, HORIZONTAL, VERTICAL.\nContainer types: FRAME, GROUP, SECTION, COMPONENT, INSTANCE.\nLeaf types: RECTANGLE, ELLIPSE, TEXT, VECTOR, IMAGE, STAR, POLYGON, LINE.`
  },
  {
    id: 'layout',
    name: 'Layout Rules',
    phase: 'Planning',
    category: 'base',
    priority: 2,
    content: `# Layout Rules\n\nAuto-layout: use FRAME with layoutMode HORIZONTAL or VERTICAL.\nGap: itemSpacing between children.\nPadding: paddingTop/Right/Bottom/Left.\nAlignment: primaryAxisAlignItems, counterAxisAlignItems.\nWrap: wrap controls line wrapping.`
  },
  {
    id: 'text-rules',
    name: 'Text Rules',
    phase: 'Planning',
    category: 'base',
    priority: 3,
    content: `# Text Rules\n\nFont families: system fonts only unless specified.\nLine height: 1.2-1.6 for body, 1.1-1.3 for headings.\nContrast: minimum 4.5:1 for body text, 3:1 for large text.`
  },
  {
    id: 'design-principles',
    name: 'Design Principles',
    phase: 'Planning',
    category: 'base',
    priority: 4,
    content: `# Design Principles\n\nHierarchy: size, weight, color establish visual priority.\nWhitespace: generous padding, avoid crowding.\nConsistency: reuse colors, spacing, typography scales.\nAccessibility: focus states, alt text equivalents, keyboard navigation.`
  }
]

const DOMAIN_SKILLS: Skill[] = [
  {
    id: 'web-app',
    name: 'Web App',
    phase: 'Generation',
    category: 'domain',
    priority: 10,
    keywords: ['web', 'app', 'dashboard', 'saas', 'admin'],
    content: `# Web App Design\n\nSidebar navigation + top bar + content area.\nCards for grouped content.\nData tables with sort/filter.\nModals for focused tasks.\nResponsive breakpoints: 320, 768, 1024, 1440.`
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    phase: 'Generation',
    category: 'domain',
    priority: 11,
    keywords: ['mobile', 'ios', 'android', 'phone', 'app'],
    content: `# Mobile App Design\n\nBottom tab bar navigation.\nSafe areas: respect notched screens.\nTouch targets: minimum 44x44pt.\nCards with rounded corners (12-16px radius).\nPull-to-refresh patterns.`
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    phase: 'Generation',
    category: 'domain',
    priority: 12,
    keywords: ['landing', 'marketing', 'homepage', 'hero'],
    content: `# Landing Page Design\n\nHero section: headline + subheadline + CTA.\nSocial proof: logos, testimonials.\nFeature grid: 3-column on desktop, 1-column mobile.\nFooter: links + newsletter signup.`
  },
  {
    id: 'anti-slop',
    name: 'Anti-Slop',
    phase: 'Validation',
    category: 'domain',
    priority: 20,
    keywords: ['slop', 'generic', 'template'],
    content: `# Anti-Slop Guidelines\n\nAvoid purple gradients, Inter font everywhere, generic card layouts.\nVary corner radius: 0, 8, 16, 24, full.\nMix typefaces: 1 display + 1 body maximum.\nUse real-seeming copy, not Lorem Ipsum.`
  }
]

const KNOWLEDGE_SKILLS: Skill[] = [
  {
    id: 'copywriting',
    name: 'Copywriting',
    phase: 'Generation',
    category: 'knowledge',
    priority: 30,
    keywords: ['copy', 'text', 'content', 'microcopy'],
    content: `# Copywriting\n\nHeadlines: 6-8 words, benefit-driven.\nButtons: 2-3 words, action verbs.\nError messages: explain what happened and how to fix.`
  },
  {
    id: 'codegen-ts',
    name: 'Codegen TypeScript',
    phase: 'Maintenance',
    category: 'knowledge',
    priority: 31,
    keywords: ['code', 'export', 'react', 'tailwind'],
    content: `# Codegen TypeScript\n\nReact + Tailwind CSS output.\nUse CSS custom properties for design variables.\nComponent structure: Props, state, event handlers separated.`
  }
]

const ALL_SKILLS: Skill[] = [...BASE_SKILLS, ...DOMAIN_SKILLS, ...KNOWLEDGE_SKILLS, ...TASTE_SKILLS, ...HALLMARK_SKILLS]

export function resolveSkills(context: SkillContext): ResolvedSkills {
  const phaseSkills = ALL_SKILLS.filter((s) => s.phase === context.phase)

  const byCategory = {
    base: phaseSkills.filter((s) => s.category === 'base'),
    domain: phaseSkills.filter((s) => s.category === 'domain'),
    knowledge: phaseSkills.filter((s) => s.category === 'knowledge')
  }

  const matchedDomain = byCategory.domain
    .filter((s) => {
      if (!s.keywords) return true
      const lower = context.prompt.toLowerCase()
      return s.keywords.some((k) => lower.includes(k))
    })
    .sort((a, b) => a.priority - b.priority)

  const selected: Skill[] = [
    ...byCategory.base.sort((a, b) => a.priority - b.priority),
    ...matchedDomain,
    ...byCategory.knowledge.sort((a, b) => a.priority - b.priority)
  ]

  const totalTokens = selected.reduce((sum, s) => sum + s.content.length, 0)
  const remaining = context.budgetTokens - totalTokens

  return {
    skills: selected,
    totalTokens,
    remainingBudget: Math.max(0, remaining)
  }
}

export function getSkillContent(skills: Skill[]): string {
  return skills.map((s) => `## ${s.name}\n${s.content}`).join('\n\n')
}
