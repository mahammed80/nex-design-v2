---
version: alpha
name: Google-Stitch-Glass-Design-System
description: |
  Google Stitch AI-native glassmorphic design system. Features inky obsidian canvas (#050508), multi-spectral aurora mesh gradient backdrops (cyan / violet / electric blue / magenta), ultra-low opacity frosted glass cards (backdrop-filter blur 24px), specular hairline borders (1px gradient from 16% to 3% white), floating pill action bars with micro-interactions, and high-contrast white submit pills.

colors:
  primary: "#ffffff"
  primary-pressed: "#e2e8f0"
  on-primary: "#050508"
  ink: "#f8fafc"
  body: "#94a3b8"
  muted: "#64748b"
  canvas: "#050508"
  canvas-subtle: "#0a0a0f"
  glass-surface: "rgba(255, 255, 255, 0.04)"
  glass-surface-hover: "rgba(255, 255, 255, 0.08)"
  glass-surface-elevated: "rgba(255, 255, 255, 0.12)"
  hairline: "rgba(255, 255, 255, 0.12)"
  hairline-specular: "rgba(255, 255, 255, 0.20)"
  hairline-subtle: "rgba(255, 255, 255, 0.06)"
  aurora-cyan: "#00f5d4"
  aurora-violet: "#7928ca"
  aurora-blue: "#38bdf8"
  aurora-magenta: "#f43f5e"
  aurora-glow: "rgba(121, 40, 202, 0.25)"

typography:
  display-xl:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  pill-action:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.02em

radii:
  pill: 9999px
  card: 20px
  panel: 16px
  badge: 8px

shadows:
  glass-card: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)"
  floating-pill: "0 12px 32px rgba(0, 0, 0, 0.45), 0 0 24px rgba(121, 40, 202, 0.20), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)"
  aurora-ambient: "0 0 120px rgba(0, 245, 212, 0.18), 0 0 180px rgba(121, 40, 202, 0.22)"
---

# Google Stitch Glass Design System

Google Stitch is an AI-first visual design language engineered for infinite canvas exploration, multi-variant generation, and natural-language synthesis.

## 1. Spatial Structure & Atmospheric Backdrop
- **Obsidian Matrix Canvas**: The backdrop is pure inky obsidian (`#050508`) overlaid with a fine non-distracting dot grid matrix (24px spacing, 15% opacity).
- **Aurora Nebula Glow**: Ambient fluid radial gradients in cyan, violet, and deep cobalt drift beneath cards and frames, providing an illuminated atmospheric glow that cuts through dark space without compromising content legibility.

## 2. Glassmorphism & Surface Hierarchy
- **Frosted Translucent Fills**: Cards use `rgba(255, 255, 255, 0.04)` with `backdrop-filter: blur(24px) saturate(180%)`.
- **Specular Hairline Lighting**: Top edges feature high-contrast specular hairline borders (`1px solid rgba(255, 255, 255, 0.18)`) that fade downward to `rgba(255, 255, 255, 0.04)`, simulating physical top-down rim lighting.
- **Card Geometry**: 20px to 24px continuous corner smoothing for harmonious card nesting.

## 3. Floating Action Elements & Pill Motif
- **Generative Prompt Pill**: Pinned centered at the bottom of the viewport with `rounded-full`, frosted glass surface, attachment trigger (`+`), natural language text input, and circular white execute button (`↑`).
- **Contextual Hover Pills**: Cards reveal frosted pill action buttons (`Use template`, `Remix`, `Inspect`) on hover with smooth opacity transitions and subtle hover lifts.
