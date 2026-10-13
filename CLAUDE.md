# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md (imported above) is the canonical architecture and conventions reference. The notes below cover where AGENTS.md has drifted from the actual repo state, and things it doesn't mention.

## Commands as they actually exist in package.json

AGENTS.md describes a Bun-only toolchain, but the root `package.json` scripts now invoke `tsx` for scripts, and the repo has both `bun.lock` and `pnpm-lock.yaml`/`pnpm-workspace.yaml`. On this Windows machine `pnpm` is on PATH; `bun` and `tsx` may not be — check before assuming either.

- `dev` — Vite dev server on `localhost:1420` (Playwright's `webServer` reuses it)
- `build` — regenerates the Tauri menu (`scripts/generate-tauri-menu.ts`) then `vite build`
- `lint` — oxlint over `src/` and `packages/{core,vue,cli,mcp}/src/`
- `lint:structure` — same, plus `vite/`, `tests/`, `scripts/` (structure/naming lint rules from `lint/`)
- `check` — oxlint **+ `parity:check`** (no tsgo step anymore despite AGENTS.md). For type errors use `check:vue` (vue-tsc on root + `packages/vue`)
- `parity:check` / `parity:generate` — `scripts/parity/build.ts` derives `packages/docs/data/figma-capabilities.json` and `packages/docs/development/parity-report.md` from `packages/docs/guide/figma-comparison.md`. If you edit the comparison matrix, run `parity:generate` or `check` fails
- `check:i18n` — locale key consistency (`scripts/check-locales.ts`)
- `test` — Playwright, project `nexdesign` (`tests/e2e/`); `test:update` refreshes screenshots; `test:figma` targets `tests/figma/` against a debug-port Figma instance
- `nex-design` — CLI entry (`packages/cli/src/index.ts`)

Unit tests in `tests/engine/` import from `bun:test`, so run them with Bun even though the `test:unit` script says `tsx --test`:

```sh
bun test ./tests/engine                      # all unit tests
bun test ./tests/engine/color.test.ts        # single file
bun test ./tests/engine -t "parseColor"      # filter by test name
npx playwright test tests/e2e/<file>.spec.ts --project=nexdesign   # single E2E spec
```

Playwright runs with `workers: 1`, dark color scheme, DPR 2, and SwiftShader WebGL. Screenshot baselines are sensitive to those settings.

## Repo facts AGENTS.md omits or gets wrong

- **No `.github/workflows/` in this checkout.** The CI/release workflows that AGENTS.md describes (`build.yml`, `app.yml`, and so on) aren't here. Only issue/PR templates exist.
- **There's also `packages/demos`**, which AGENTS.md doesn't list.
- **`functions/`** holds Cloudflare Pages Functions: `api/url-fetch.ts` (the URL-import proxy) and `api/poolside/v1/chat/completions.ts` (the server-side Poolside proxy that holds `POOLSIDE_API_KEY`). In dev, `vite/poolside-proxy.ts` and `vite/url-fetch-proxy.ts` mirror them, so a change to one usually needs the matching change to the other.
- **`vite/`** holds the Vite plugins: aliases, CanvasKit asset copying, raw-markdown loading, the PWA, the automation bridge, and the dev proxies.
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `#core/*`, `#vue/*`, `#cli/*`, `#mcp/*`, `#functions/*`, `#scripts/*`, `#tests/*`. Inside the monorepo, `@nex-design/core` and `@nex-design/vue` resolve to package **source**, not `dist`.
- **Env vars** (`.env.example`):
  - `POOLSIDE_API_KEY` is server-only.
  - `VITE_NEXDESIGN_ACCOUNT_API` is the account/sync API origin.
  - `VITE_NEXDESIGN_OFFLINE_LEASE_PUBLIC_KEY` is the key for verifying offline leases.
- **App areas** under `src/app/` beyond the ones AGENTS.md covers: `admin/`, `auth/`, `dashboard/` (accounts, offline lease guard, sync outbox), `creative-notes/`, `prototype/`, `tutorial/`, `email/`, and `plugins/url-import/` (the web-page-to-design import pipeline: parse → styles → image → pipeline).
- **E2E selectors** use `data-test-id` attributes in kebab-case (`{component}-{element}[-{variant}]`, with a `mobile-` prefix for mobile UI). The full prefix table is in `CONTRIBUTING.md`. Add a `data-test-id` to every new interactive element.
- **Other planning docs** at the repo root: `PLAN.md`, `FIGMA_PARITY_PLAN.md`, `figma_variants_architecture_plan.md`, `variables-ui-roadmap.md`. Consult them before starting work in those areas.
