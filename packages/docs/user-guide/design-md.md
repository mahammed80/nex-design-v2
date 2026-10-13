# DESIGN.md design systems

Every document has a **Style Guide** page. Its DESIGN.md panel is a portable, plain-text description of the design system: tokens in YAML front-matter, written guidance in markdown below it. The format matches the `version: alpha` DESIGN.md files used by Google Stitch, so the bundled templates and files from other tools open as-is.

```md
---
version: alpha
name: Acme
description: Calm, editorial product UI.
colors:
  primary: "#533afd"
  link: "{colors.primary}"
  surface:
    light: "#ffffff"
    dark: "#09090b"
typography:
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  md: 8px
spacing:
  md: 12px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.md}"
---

## Overview

Free-form guidance for people and AI agents.
```

## How tokens map to variables

Applying a DESIGN.md creates or updates variables in one **Design System** collection:

| DESIGN.md | Variable | Type |
| --- | --- | --- |
| `colors.primary` | `colors/primary` | Color |
| `typography.body-md.fontSize` | `typography/body-md/font-size` | Number |
| `typography.body-md.fontFamily` | `typography/body-md/font-family` | String |
| `rounded.md` | `rounded/md` | Number |
| `spacing.md` | `spacing/md` | Number |

- `{colors.name}` references become variable aliases.
- A color written per mode (`light:` / `dark:`) creates matching collection modes.
- Tokens you delete from DESIGN.md are removed from the Design System collection. Other variables (logos, gradients, other collections) are never touched.
- A token whose existing variable has a different type is skipped and reported instead of changed.
- Older Style Guide variables (`font-size-h1`, `space-md`, …) are adopted and renamed in place, so bindings keep working.

Variables stay the source of truth for values: editing a variable updates the DESIGN.md shown in the panel. Prose, `description`, and `components` are stored with the document and survive `.fig` save and open.

## Editing and applying

- While you edit, the panel lists errors (invalid colors, bad dimensions, broken YAML) and warnings (unknown `{…}` references), and previews the change: how many tokens will be created, updated, and removed — removals are listed by name.
- **Apply Changes** is a single undo step.
- **Import .md** loads a file as an unapplied draft so you can review it first. **Starter Presets** includes the bundled DESIGN.md templates.
- If the document's tokens change while you have unapplied edits, a banner offers to discard the draft and reload.

## Export

The export dialog generates CSS custom properties (extra modes as `[data-theme='dark']` overrides), a Tailwind v4 `@theme` block, plain JSON, or W3C Design Tokens (DTCG) JSON.

## AI and automation

The built-in agent receives a summary of the tokens with every request and can call:

- `read_design_system` — tokens, components, and optionally the full DESIGN.md
- `apply_design_system` — apply a DESIGN.md (`dry_run` previews the plan)
- `bind_to_token` — bind a node property to a token, e.g. `colors.primary` → `fills/0/color`

These tools are also available over MCP and through `eval` in the CLI.
