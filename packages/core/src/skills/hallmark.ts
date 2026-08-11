import type { Skill } from './types'

export const HALLMARK_SKILLS: Skill[] = [
  {
    id: 'hallmark',
    name: 'Hallmark',
    phase: 'Validation',
    category: 'base',
    priority: 9,
    keywords: ['hallmark', 'slop', 'audit', 'redesign', 'study', 'design.md'],
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
