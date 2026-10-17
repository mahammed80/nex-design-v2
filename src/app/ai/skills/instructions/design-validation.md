Validate the affected root once after building. Use `describe` (and `design_audit` when useful) as evidence; correct errors and high-impact warnings in one batch, and do not churn intentional stylistic choices merely to maximize a score.

Check, in order:

1. Layout integrity — nothing overflows, clips unintentionally, or collapses to zero.
2. Accessibility (WCAG 2.1 AA) — body text contrast ≥ 4.5:1 and large text ≥ 3:1; body text ≥ 14px on desktop and ≥ 15px on mobile; touch targets ≥ 44×44 on mobile; every input has a visible label; state is never conveyed by color alone.
3. Hierarchy — the focal point is the largest or highest-contrast element; heading levels step down clearly.
4. Consistency — spacing values come from the scale, one radius language, one icon set, identical repeated components.
5. Sameness — if the result resembles a generic template (equal cards, centered everything, gray-on-white with one blue button), change the weakest section.
