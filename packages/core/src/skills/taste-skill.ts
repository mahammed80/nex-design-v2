import type { Skill } from './types'

export const TASTE_SKILLS: Skill[] = [
  {
    id: 'taste-skill',
    name: 'Taste Skill v2',
    phase: 'Validation',
    category: 'base',
    priority: 5,
    keywords: ['landing', 'portfolio', 'redesign', 'marketing', 'saas'],
    content: `# Taste Skill v2 — Anti-Slop Frontend

## Brief Inference
Output a one-line "Design Read" before generating: "Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system or aesthetic family>."

## Three Dials (baseline 8/6/4)
- DESIGN_VARIANCE: 8 (1 = symmetry, 10 = chaos)
- MOTION_INTENSITY: 6 (1 = static, 10 = cinematic)
- VISUAL_DENSITY: 4 (1 = airy, 10 = cockpit)

## Design System Map
Pick the right foundation. Do not invent CSS for things with official packages.
- Modern SaaS: Tailwind v4 + shadcn/ui
- Microsoft/enterprise: Fluent UI
- Google/Material: @material/web
- Aesthetic (not system): native CSS + Tailwind

## Typography
- Display/headlines: text-4xl md:text-6xl tracking-tighter leading-none
- Body: text-base text-gray-600 leading-relaxed max-w-[65ch]
- Sans default: Geist, Outfit, Cabinet Grotesk, Satoshi. Inter only on explicit request.
- Serif only for editorial/luxury/publication. Banned as default.

## Color
- Max 1 accent color. Saturation < 80%.
- NO AI-purple/blue glow by default. Neutral bases (Zinc/Slate/Stone) + singular accent.
- One palette per project. Lock accent color for whole page.
- No pure #000 or #fff. Use off-black/off-white.

## Layout
- Anti-center bias when VARIANCE > 4. Force split-screen, left-aligned content/right asset, asymmetric whitespace.
- Grid over flex-math: use CSS Grid, not calc percentages.
- Hero fits in initial viewport. Headline max 2 lines. Subtext max 20 words.
- Hero top padding max pt-24.
- Max 4 text elements in hero (eyebrow/headline/subtext/CTAs).
- Max 1 eyebrow per 3 sections.
- Zigzag alternation max 2 sections in a row.
- Bento cells = content count. No empty cells.

## Motion
- Animate only transform and opacity.
- Prefer Motion (motion/react) or GSAP ScrollTrigger.
- NO window.addEventListener('scroll').
- Reduced motion mandatory above MOTION_INTENSITY > 3.

## Pre-flight Check
Before shipping, verify:
- Button contrast WCAG AA (4.5:1 body, 3:1 large)
- CTA text fits one line at desktop
- No duplicate CTA intent on one page
- Form inputs, placeholders, focus rings pass contrast
- Mobile verified at 320/375/414/768px
- No horizontal scroll; root overflow-x: clip`
  },
  {
    id: 'taste-skill-soft',
    name: 'Taste Skill Soft',
    phase: 'Validation',
    category: 'domain',
    priority: 6,
    keywords: ['soft', 'premium', 'calm', 'luxury', 'expensive'],
    content: `# Soft Skill — High-End Visual Design

Polished, calm, expensive UI with softer contrast, whitespace, premium fonts, spring motion.

- Softer contrast ratios within WCAG AA
- Generous whitespace: py-32 to py-48 for sections
- Premium font pairings: Geist Display + Geist Mono, Söhne Breit + IBM Plex Mono
- Spring physics for motion: type: "spring", stiffness: 100, damping: 20
- No harsh borders or shadows
- Subtle gradients and glass effects
- Restrained color: 1 accent max, desaturated`
  },
  {
    id: 'taste-skill-minimalist',
    name: 'Taste Skill Minimalist',
    phase: 'Validation',
    category: 'domain',
    priority: 7,
    keywords: ['minimalist', 'editorial', 'notion', 'linear', 'clean'],
    content: `# Minimalist Skill — Editorial Product UI

Notion/Linear vibes, restrained palette, crisp structure.

- Restrained palette: neutral bases, one accent
- Crisp structure: strict grid, no decoration
- Typography hierarchy via weight and color, not scale
- No shadows, no gradients, no glass
- Monochrome with single saturated pop
- Dense information without crowding
- Functional motion only: hover, focus, state transitions`
  },
  {
    id: 'taste-skill-brutalist',
    name: 'Taste Skill Brutalist',
    phase: 'Validation',
    category: 'domain',
    priority: 8,
    keywords: ['brutalist', 'industrial', 'swiss', 'experimental'],
    content: `# Brutalist Skill — Industrial Brutalist UI

Hard mechanical language: Swiss type, sharp contrast, experimental layout.

- Raw borders, no border-radius or minimal
- High contrast: black/white with single accent
- Monospace or grotesk typefaces
- Visible grid structure
- Asymmetric layouts
- No shadows, no gradients
- Functional over decorative`
  }
]

export const HALLMARK_SKILLS: Skill[] = [
  {
    id: 'hallmark',
    name: 'Hallmark',
    phase: 'Validation',
    category: 'base',
    priority: 9,
    keywords: ['hallmark', 'slop', 'audit', 'redesign', 'study'],
    content: `# Hallmark — Anti-AI-Slop Design Skill

## Pre-flight Self-Critique
Before shipping, score 1-5 on six axes: Philosophy, Hierarchy, Execution, Specificity, Restraint, Variety. Any < 3 triggers revision. Stamp at top: /* Hallmark · P5 H4 E5 S4 R5 V5 */

## 57 Slop-Test Gates (sample)
1. Purple/pink/cyan gradient backgrounds banned
2. Inter font everywhere banned
3. Generic card layouts banned
4. No bounce/elastic easing
5. Mixed-family emphasis banned (italic serif in sans headline)
6. CTA wraps to 2+ lines at desktop = fail
7. Duplicate CTA intent on one page = fail
8. Button text/background contrast must pass WCAG AA
9. Form inputs, placeholders, focus rings pass contrast
10. No two-line nav at desktop
11. Nav height cap 80px max, default 64-72px
12. Hero fits in initial viewport
13. Hero top padding max pt-24
14. Max 4 text elements in hero
15. Max 1 eyebrow per 3 sections
16. Zigzag alternation max 2 sections in a row
17. Bento cells = content count, no empty cells
18. Section layout repetition ban (max 1 per layout family)
19. No div-based fake screenshots
20. No hand-rolled SVG illustrations as default
21. Real images required (2-3 minimum per page)
22. Logo wall = logos only, no category labels
23. No invented metrics or testimonials
24. One copy register per page
25. No em-dashes as design flourish
26. Italic headers banned
27. No pure #000 or #fff
28. Dark mode parity required
29. Mobile verified at 320/375/414/768px
30. No horizontal scroll, overflow-x: clip

## Structural Variety
Two consecutive outputs must differ in macrostructure, theme, and nav/footer archetype. Track in .hallmark/log.json.

## Design Flow
1. Pre-flight scan (read existing code/tokens)
2. Pick macrostructure FIRST (21 named options)
3. Pick nav archetype (N1a-N13) and footer archetype (Ft1-Ft8)
4. Decide hero enrichment (typography only / CSS art / SVG / generated)
5. Preview block before code
6. Build with locked tokens
7. Run slop test, fix failures`
  }
]
