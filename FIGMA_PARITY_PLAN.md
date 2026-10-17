# NexDesign 99% Figma-Parity Plan

## Objective

Reach **99% parity for the supported Figma Design workflow surface** while preserving NexDesign's advantages: local-first files, open automation, CLI/MCP access, framework code generation, and browser/Tauri portability.

This target does not mean reproducing Figma's branding, proprietary services, internal infrastructure, or every product outside Figma Design. FigJam, Slides, Buzz, Sites, enterprise administration, billing, and vendor-specific AI features are separate product scopes.

## Definition of 99%

Parity is measured by verified workflows, not feature-name counts.

| Dimension                   | Weight | 99% exit requirement                                                        |
| --------------------------- | -----: | --------------------------------------------------------------------------- |
| Editing workflow coverage   |    25% | 99% of the approved workflow catalog passes end-to-end                      |
| `.fig` semantic fidelity    |    20% | 99% of supported properties survive import → edit → export → reimport       |
| Rendering fidelity          |    20% | 99% of golden fixtures meet the visual threshold; no critical fixture fails |
| Interaction and UX fidelity |    15% | 99% of shortcut, pointer, selection, inspector, and undo scenarios pass     |
| Dev Mode and handoff        |     8% | 99% of inspectable properties and exportable assets produce correct output  |
| Performance and stability   |     7% | All performance budgets pass at p95; crash-free test sessions ≥ 99.9%       |
| Collaboration correctness   |     5% | Convergence, reconnect, offline, awareness, and permission suites pass      |

The total parity score is the weighted sum. A score cannot ship as 99% if any release blocker remains, even when the weighted score rounds upward.

### Release blockers

- Data loss, corrupt `.fig` output, or non-convergent collaboration state.
- Incorrect undo/redo after a supported editing operation.
- A critical rendering fixture above the agreed perceptual threshold.
- Secrets exposed to client bundles or an authorization boundary enforced only in UI.
- A p95 interaction or document-open budget missed by more than 20%.
- Any advertised feature lacking an end-to-end test.

## Scope baseline

Create a versioned catalog in `packages/docs/guide/figma-comparison.md`. Every row must carry:

- Stable capability ID, such as `DESIGN.AUTO_LAYOUT.WRAP`.
- Status: `missing`, `partial`, `supported`, or `verified`.
- User workflow and acceptance criteria.
- Core, Vue SDK, app, CLI/MCP, import/export, and test ownership.
- Fixture or test identifiers.
- Last verified version and platform.

Only `verified` capabilities count toward 99%. Generated summaries must replace manually maintained totals.

## Delivery principles

1. **Correctness before breadth.** Complete the semantic model and undo contract before adding UI.
2. **One operation, one core implementation.** App, Vue SDK, AI tools, MCP, CLI eval, and collaboration call the same core action.
3. **Round-trip by construction.** Every new property requires scene-graph, Kiwi, clipboard, serialization, clone, undo, and collaboration coverage.
4. **No screenshot-only features.** A feature is incomplete until keyboard, pointer, inspector, undo, persistence, and accessibility paths agree.
5. **Performance is a feature.** Budgets are enforced continuously, not deferred to the final phase.
6. **Figma compatibility remains fixture-driven.** Avoid undocumented assumptions when a captured fixture can establish behavior.

## Foundation workstream: parity infrastructure

This work starts first and continues through every phase.

### Capability registry

- Replace prose-only matrix totals with a machine-readable registry.
- Generate the documentation table, progress dashboard, and missing-test report.
- Add owners, dependencies, risk, and verification evidence.
- Fail CI when a `supported` capability has no tests or when documentation contradicts code.

### Golden fixture corpus

Build legally obtained, minimal fixtures organized by property and workflow:

- Node types, transforms, constraints, masks, clipping, blends, effects, paints, images, and text.
- Auto Layout, grid, absolute children, min/max sizing, wrapping, and nested layout.
- Components, variants, every component-property type, overrides, variables, modes, and aliases.
- Prototype triggers, actions, overlays, transitions, variables, and scroll behavior.
- Large community-style documents and adversarial edge cases.

Each fixture stores source metadata, expected scene semantics, Figma reference renders, NexDesign renders, and round-trip assertions.

### Differential harness

- Normalize viewport, fonts, device scale, color space, and export settings.
- Compare geometry, hierarchy, property values, text metrics, pixels, and interaction traces.
- Use perceptual metrics in addition to raw pixel difference.
- Produce an HTML report with overlays, heat maps, property deltas, and regression ownership.
- Quarantine only platform/font nondeterminism; never quarantine semantic failures.

### CI quality gates

- Make lint and both TypeScript checks zero-error gates.
- Run core unit suites on every change.
- Run targeted visual and `.fig` suites by changed domain.
- Run full platform matrices nightly and before release.
- Add Windows x64/arm64, macOS x64/arm64, Linux x64, and browser coverage.
- Track flaky-test rate; block releases above 0.5%.

## Phase 0: restore a trustworthy baseline

**Goal:** eliminate ambiguity before expanding the editor.

- Fix all existing type-check errors and make `bun run check:vue` mandatory.
- Reconcile `PLAN.md`, roadmap docs, README, changelog, and the feature matrix.
- Inventory every `SceneNode` property across clone, copy, undo, Kiwi, subgraph, Yjs, and Figma API paths.
- Add schema-version migrations for local and collaboration persistence.
- Establish interaction latency, render time, memory, document-open, and export baselines.
- Add a release dashboard showing parity score and blocker count.

**Exit:** zero static errors, zero undocumented supported capabilities, baseline reports generated in CI.

### Phase 0 implementation status

- [ ] Restore app and Vue SDK type checks to zero errors and enforce both in CI.
- [x] Machine-readable capability registry generated from the Figma comparison matrix.
- [x] Generated coverage totals and stale-registry check wired into `bun run check`.
- [x] Registry parser regression coverage.
- [x] Add acceptance criteria to every capability and explicit evidence to the first verified set.
- [x] Promote the initial 20 fixture-backed capabilities from `supported` to `verified`.
- [x] Generate a category-level parity report with verified-capability evidence.
- [ ] Add geometry, semantic, perceptual-rendering, and interaction-trace reports.
- [ ] Establish and record performance baselines on every supported platform.

## Phase 1: editing fundamentals and canvas ergonomics

**Goal:** make daily editing behavior indistinguishable for common workflows.

### Navigation and selection

- [x] Draggable per-page canvas guides with snapping, deletion, locking, undo, and `.fig` persistence.
- Alt/Option distance measurement with multi-edge overlays.
- [x] Layer-outline/wireframe view with View-menu, native-menu, and `Shift+O` controls.
- Quick actions/command palette with fuzzy search.
- Find/replace for text and layer names.
- Deep select, sibling cycling, select-all-with-same-property, and matching-layer selection.
- Configurable small/big nudge values.
- Complete keyboard map including scale, pencil, flip, text, align, distribute, and zoom commands.

### Manipulation

- Dedicated Scale tool with effects, corners, strokes, constraints, and nested content scaling.
- Smart alignment, tidy-up, distribute spacing, and smart-selection handles.
- Copy/paste properties and selective paste.
- Responsive constraints with pin/center/scale behavior.
- Layout-grid overlays for columns, rows, and grids.
- Robust rotated-node snapping and transform handles.

### Shapes and hierarchy

- Pencil/freehand tool with smoothing and pressure-ready input model.
- Masks, alpha masks, outline masks, and mask visualization.
- Full flatten, outline stroke, and flatten-text commands.
- Correct z-order, clipping, and hit testing for every supported container.

**Exit:** all P0/P1 editing workflows have pointer, shortcut, undo, reload, and collaboration tests.

## Phase 2: rendering and visual fidelity

**Goal:** reach reference-grade CanvasKit rendering and export.

### Paint and compositing

- Multiple stacked fills and strokes with independent opacity, visibility, blend mode, and variables.
- Complete layer/fill blend modes with isolated-group compositing.
- Pattern fills and deterministic tiling.
- Interactive image crop, focal point, rotation, tile scale, and adjustments.
- Eyedropper with screen/canvas sampling and color-space handling.
- Correct nested opacity, masks, clips, filters, and offscreen layers.

### Effects

- Verify drop, inner, layer, background, and foreground effects across shapes, vectors, text, clips, and transforms.
- Multiple ordered effects with exact bounds expansion.
- Corner smoothing parity for all relevant geometry and export paths.
- Export-safe effect fallback rules for SVG/PDF.

### Color management

- sRGB and Display-P3 document/export behavior.
- RGB, HSL, HSB, Hex, opacity, and OkHCL editing without destructive conversion.
- Mixed-color editing and relative multi-selection updates.
- Color-profile metadata in supported raster exports.

**Exit:** critical golden set passes at strict thresholds and extended corpus reaches ≥99% visual pass rate.

## Phase 3: text and typography

**Goal:** production typography parity across scripts and export formats.

- Auto-width, auto-height, fixed-size, truncate, max-lines, and vertical alignment modes.
- Bulleted, numbered, nested, and mixed-style lists.
- Hyperlinks and range-level metadata.
- Full OpenType feature controls and preservation.
- Variable font axes and named instances.
- CJK line breaking, punctuation, fallback, and vertical metrics.
- RTL and bidirectional editing, selection, cursor movement, shaping, and layout.
- Emoji/color-font rendering and fallback.
- Reusable text styles with detach/reapply/update semantics.
- Font substitution, missing-font diagnostics, and deterministic CI font packs.

**Exit:** text edit, layout, render, clipboard, `.fig`, SVG, and PDF fixtures pass across Latin, Arabic, Hebrew, CJK, Indic, and emoji samples.

## Phase 4: vectors and illustration

**Goal:** close the largest authoring gap without destabilizing the scene graph.

- Complete vertex selection, multi-select, move, delete, join, split, and continue-path behavior.
- Bend tool and independent/symmetric/smooth handle editing.
- Boolean operation editing and non-destructive operand inspection.
- Shape builder interaction.
- Offset path, simplify, reverse path, close/open path, and winding controls.
- Stroke-to-path with cap, join, dash, and variable-width fidelity.
- Vector-network import/export preservation under repeated editing.

**Exit:** vector operation corpus round-trips without topology loss and all edit operations are undo-safe.

## Phase 5: Auto Layout, grid, and responsive behavior

**Goal:** make complex application layouts dependable.

- Complete two-axis min/max sizing and constraint interaction.
- Baseline alignment and text-aware sizing.
- Wrap controls, per-line spacing, and counter-axis distribution.
- Grid track editor, named areas, spans, gaps, overlays, and drag placement.
- Absolute-positioned children with constraints inside Auto Layout.
- Nested layout invalidation and incremental recomputation.
- Figma-compatible behavior for hidden children, strokes-in-layout, reverse z-index, and clipping.
- Responsive preview sizes and breakpoint-variable workflows.

**Exit:** layout geometry differential suite passes ≥99.5%; no full-document layout recomputation for isolated edits.

## Phase 6: components, variants, variables, and libraries

**Goal:** complete the design-system workflow.

### Components

- Text, Boolean, instance-swap, and variant component properties.
- Property exposure from nested instances and preferred instance values.
- Nested override lineage, reset scopes, override indicators, and property search.
- Slot-like nested content workflows and instance insertion controls.
- Robust component-set combination/splitting and variant conflict handling.
- Cross-page and cross-file main-component resolution.

### Variables and styles

- Full COLOR/FLOAT/STRING/BOOLEAN editing across all supported fields.
- Variable scopes, code syntax, descriptions, publishing visibility, and aliases.
- Mode switching at document, page, frame, and prototype-preview scope.
- Reusable paint, text, effect, grid, and layout styles.
- Style/variable usage search, detach, swap, bulk migration, and missing-reference repair.

### Libraries

- Versioned local/shared libraries with publish, update, review, and rollback.
- Stable component/style/variable identities across files.
- Conflict resolution and migration reports.
- Offline cache and deterministic linked-asset resolution.

**Exit:** a multi-file design-system fixture can publish, consume, override, update, go offline, reconnect, and round-trip without identity loss.

## Phase 7: prototyping parity

**Goal:** support realistic application prototypes, not only screen links.

- Multi-action ordered sequences with configurable continuation/cancellation.
- Conditional actions, expressions, numeric/string/Boolean variable operations, and mode switching.
- Navigate, back, URL, overlay open/swap/close, scroll-to, change-to, set-variable, and media actions.
- Click, hover, press, release, enter/leave, keyboard/gamepad, drag, delay, and visibility triggers where supported.
- Smart Animate matching rules, direction, easing curves, spring parameters, and interruption behavior.
- Fixed/sticky layers, overflow scrolling, scroll position preservation, and nested scroll areas.
- Overlay stacking, manual positions, outside-click behavior, background interaction, and focus trapping.
- Named flows, multiple starting points, device frames, orientation, fullscreen, share links, and presentation notes.
- Prototype accessibility: focus order, keyboard activation, reduced motion, and screen-reader labels.

**Exit:** interaction traces and presentation screenshots match the reference catalog for ≥99% of supported scenarios.

### Phase 6–7 focused delivery plan

This sequence converts the existing prototype, component, and variant foundations into a Figma Desktop-compatible workflow. It is ordered by data risk and dependency, not by UI visibility.

#### Current baseline

| Area                    | Status  | Existing foundation                                                                                                               | Required parity closure                                                                                                                                  |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prototype schema        | Partial | Multiple reactions, common pointer/keyboard triggers, navigation, overlays, `CHANGE_TO`, `SET_VARIABLE`, and standard transitions | Conditionals, expressions, mode actions, scroll/device fields, custom easing, reset/preserve options, media actions, and lossless unknown-field handling |
| Prototype runtime       | Partial | Presentation shell, navigation history, basic variables, overlays, and interaction dispatch                                       | Scene-backed hit testing, real scrolling, nested scroll areas, fixed/sticky layers, interruption rules, focus management, and deterministic traces       |
| Smart Animate           | Partial | Basic layer matching and interpolation of common geometry/visual fields                                                           | Figma-compatible matching identity, transform decomposition, paint/effect/text/clip interpolation, custom curves/springs, and interruption behavior      |
| Components and variants | Partial | Component sets, variant properties, instance switching, detach, override lineage, and reset                                       | Complete property bindings, instance-swap authoring, preferred values, nested exposure, slots, conflict diagnostics, and bulk editing                    |
| Variables and modes     | Partial | Variable collections, aliases, bindings, and prototype-local value changes                                                        | Typed expressions, scoped mode switching, persistence across navigation, validation, and inspector/debug visibility                                      |
| `.fig` round-trip       | Blocker | Known prototype fields import and export                                                                                          | Symmetric import/export for every supported field plus preservation of unsupported prototype and component metadata                                      |

#### Milestone P0.1 — lock the compatibility contract

**Outcome:** editing or previewing a document cannot silently destroy supported prototype, component-property, variant, or variable data.

- Create minimal `.fig` fixtures for every supported trigger, action, transition, overlay option, scroll option, component-property type, property binding, variable mode, and override form.
- Extend named scene-graph types for conditional branches, expression operands, mode changes, prototype device/flow metadata, overflow direction, scroll behavior, preserve-scroll, reset-state, overlay behavior, custom cubic curves, and spring parameters.
- Add schema defaults and migrations so existing NexDesign documents continue to open with unchanged behavior.
- Make Kiwi conversion symmetric: every imported supported field must export, reimport, and compare equal.
- Preserve unsupported prototype/component payloads opaquely when safe; surface a diagnostic when preservation is impossible instead of dropping data silently.
- Cover clone, subgraph, clipboard, undo snapshots, Yjs collaboration, Figma API proxies, and ToolDef serialization for each new property.

**Acceptance:** the focused fixture corpus survives five import → edit → export → reimport cycles with no semantic drift; unknown-data preservation tests prove that an unrelated edit does not erase unrecognized metadata.

**Implementation progress:**

- [x] Add named scene-graph contracts and symmetric Kiwi mappings for prototype devices, scroll direction, fixed-child scroll behavior, preserved navigation scroll offsets, and native custom easing parameters.
- [x] Add focused `.fig` round-trip coverage for those fields.
- [x] Preserve native component-set identity, variant ordering, all four component-property definition types, and text/Boolean/instance-swap assignments through `.fig` export and reimport.
- [ ] Complete the remaining trigger, action, overlay, expression, mode, property-binding, and unknown-field fixtures before closing P0.1.

#### Milestone P0.2 — build a deterministic interaction harness

**Outcome:** runtime parity can be tested as state, not only by screenshots.

- Define a serializable prototype trace containing trigger, matched node, ordered actions, variable/mode deltas, navigation/overlay stack changes, scroll offsets, animation lifecycle, focus target, and final frame.
- Add a clock abstraction for delays, transitions, springs, and interruption tests.
- Run the same traces through core unit tests and Playwright presentation tests.
- Add reference screenshots only at stable trace checkpoints; keep semantic assertions as the primary oracle.
- Register each scenario in the capability registry and fail CI when a supported capability lacks a fixture and trace.

**Acceptance:** traces are deterministic across browser and Tauri runs, and failures identify the first divergent action rather than only the final screenshot.

#### Milestone P0.3 — implement real scrolling and presentation geometry

**Outcome:** desktop and mobile prototypes behave correctly for long and nested content.

- Replace hidden-DOM `scrollIntoView` behavior with scene-graph viewport scrolling and CanvasKit-aware hit testing.
- Support vertical, horizontal, both-axis, and no-scroll overflow; nested scroll containers; wheel, trackpad, pointer, and touch input; and scroll chaining rules.
- Implement fixed and sticky layers, clipping, `SCROLL_TO`, initial scroll positions, preserve-scroll on navigation, and reset-scroll behavior.
- Persist prototype device, orientation, custom viewport, scale mode, background, and starting flow instead of inferring the device from frame aspect ratio.
- Keep interactive bounds synchronized with transforms, clipping, component state, and animated geometry.

**Acceptance:** scroll fixtures pass at 100%, including nested containers, fixed/sticky content, preserved positions, zoomed presentation, and touch targets at device scale factors 1 and 2.

#### Milestone P0.4 — complete state, expressions, variables, and modes

**Outcome:** prototypes can model application state without unsafe evaluation.

- Add a typed expression AST for numeric, string, and Boolean literals, variables, comparison, arithmetic, Boolean logic, and supported coercions.
- Evaluate expressions in a deterministic interpreter; never use `eval` or `Function`.
- Add conditional and else-if branches, ordered multi-action execution, cancellation rules, and explicit error states.
- Implement set/add/subtract/toggle variable operations and collection mode changes at document, page, frame, and preview scopes.
- Define state lifetime for restart, back navigation, flow changes, overlay close, and interactive-component reset.
- Provide a presentation debug panel for current variables, active modes, action trace, and recoverable evaluation errors.

**Acceptance:** expression and state-transition tables match reference fixtures, invalid expressions cannot mutate state, and restart/navigation semantics are covered by undo-independent runtime tests.

#### Milestone P0.5 — finish component-property and variant semantics

**Outcome:** authors can build and consume flexible components with the same property model throughout the app and file format.

- Implement binding for text, Boolean visibility, instance swap, and variant properties instead of storing definitions without complete layer behavior.
- Add first-class instance-swap authoring, preferred instance values, exposed nested instance properties, stable property identities, and reset scopes.
- Add slot-like nested content with explicit insertion/replacement rules and lossless detach behavior.
- Validate variant property names/values, duplicate combinations, missing defaults, incompatible swaps, and orphaned overrides before mutation.
- Add bulk variant editing and property editing across compatible selections.
- Replace prompt/confirm-based authoring with typed Reka UI controls using the shared `ui` slot pattern.

**Acceptance:** a component-library fixture can create, bind, expose, override, swap, reset, detach, update its main component, export, and reimport without losing property identity or override lineage.

**Implementation progress:**

- [x] Add native text, Boolean visibility, and instance-swap layer references, live instance application with undo/redo, typed instance controls, and `.fig` round-trip coverage.
- [ ] Complete nested property exposure, preferred instance values, slots, conflict validation, reset scopes, bulk editing, and non-prompt authoring before closing P0.5.

#### Milestone P1.1 — raise Smart Animate to reference fidelity

**Outcome:** interactive components and frame transitions animate predictably.

- Match layers by stable component/instance lineage first, then by compatible name path and node type according to documented fallback rules.
- Interpolate decomposed transforms, opacity, corner radii, fills, strokes, effects, clips, and supported text properties.
- Add custom cubic Bézier curves, spring parameters, direction-aware transitions, reduced-motion substitution, and deterministic interruption/retargeting.
- Define fallback behavior for incompatible node types, missing fonts/assets, unmatched layers, and non-interpolable paints.
- Render animations from live scene state rather than a static preview bitmap.

**Acceptance:** semantic animation traces pass completely and captured checkpoints meet the agreed perceptual threshold for matched, unmatched, interrupted, nested, and interactive-component scenarios.

#### Milestone P1.2 — complete overlays and interaction dispatch

**Outcome:** menus, dialogs, sheets, tooltips, and nested overlays behave like desktop prototypes.

- Support centered, edge-aligned, relative, and manual overlay placement with resize and device-orientation updates.
- Add overlay stacking, swap/close targeting, outside-click close, backdrop configuration, background interaction, and scroll locking.
- Route pointer, keyboard, gamepad, drag, delay, enter/leave, press/release, and supported visibility triggers through one ordered dispatcher.
- Define propagation, hit slop, pointer capture, cancellation, re-entry, and conflict behavior for overlapping hotspots.
- Implement focus trapping, focus restoration, Escape behavior, and accessible overlay labels.

**Acceptance:** nested overlay and conflicting-trigger traces are deterministic; keyboard-only and touch-only Playwright suites can complete every critical flow.

#### Milestone P1.3 — presentation and flow parity

**Outcome:** the player is useful for realistic review, not only local frame playback.

- Add named flows, multiple starting points, flow restart, back/forward behavior, shareable deep links, notes, fullscreen, hotspot hints, and device-frame controls.
- Add fit, fill, actual-size, and responsive presentation modes with consistent zoom and input coordinate mapping.
- Persist preview choices per document without changing design data unless the author edits prototype settings.
- Add missing-asset/font diagnostics that do not block unrelated interactions.

**Acceptance:** every named flow opens at the declared start node and can be shared/reopened with the same device, viewport, mode, and state policy.

#### Milestone P2 — authoring polish, accessibility, and certification

**Outcome:** prototype and variant creation are fast, understandable, and releasable.

- Add canvas connection handles, destination picker/search, drag reordering for actions, duplicate action, inline validation, and multi-selection editing.
- Provide discoverable controls for scroll, fixed/sticky, overlay, device, flow, variable, conditional, and transition settings.
- Meet WCAG 2.2 AA for the prototype inspector and player, including focus order, keyboard activation, labels, contrast, zoom, and reduced motion.
- Document unsupported Figma behaviors explicitly and prevent the UI from advertising them as complete.
- Promote capabilities from `partial` to `verified` only after core, Kiwi, browser, Tauri, accessibility, and interaction-trace evidence exists.

**Acceptance:** no P0/P1 prototype or component capability remains `missing` or `partial`; the certified fixture catalog reaches the Phase 7 ≥99% trace and presentation threshold.

#### Primary implementation surfaces

| Surface                                                       | Expected work                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/scene-graph/`                              | Canonical prototype, component-property, variant, variable-mode, scroll, device, and animation types          |
| `packages/core/src/kiwi/node-change/`                         | Symmetric conversion, defaults, migrations, diagnostics, and lossless preservation                            |
| `packages/core/src/editor/components/`                        | Property bindings, variant validation, instance lineage, reset, slot, and bulk-edit actions                   |
| `packages/core/src/figma-api/` and `packages/core/src/tools/` | Scriptable access using the same core mutations and validation                                                |
| `src/app/prototype/` and prototype presentation components    | Runtime state machine, scrolling, interaction dispatch, animation, overlays, devices, flows, and debug traces |
| `src/components/properties/`                                  | Typed authoring UI for interactions, component properties, variants, modes, scroll, and devices               |
| `packages/vue/src/`                                           | Renderless primitives and composables for prototype and component authoring/runtime state                     |
| `tests/engine/` and Playwright suites                         | Codec, state, expression, scroll, component, animation, overlay, accessibility, and presentation evidence     |

#### Required quality gates for each milestone

1. Add or update capability-registry rows and fixture identifiers before marking a capability supported.
2. Pass targeted core tests, TypeScript checks, Vue type checks, duplication checks, and formatting.
3. Pass `.fig` semantic round-trip tests for every changed persisted field.
4. Pass undo/redo and collaboration convergence tests for every authoring mutation.
5. Pass browser and Tauri interaction traces; add visual checkpoints only where pixels are part of the contract.
6. Record accessibility and performance evidence for player or inspector changes.
7. Update `CHANGELOG.md` and user documentation when the milestone becomes user-visible.

## Phase 8: Dev Mode and production handoff

**Goal:** make NexDesign a dependable developer source of truth.

- Canvas measurement overlays for padding, gap, distance, bounds, and alignment.
- Inspect exact computed and authored values, including variables/styles and resolved aliases.
- CSS, Tailwind, React, Vue, Flutter, SwiftUI, and token output from one shared semantic IR.
- Multi-selection inspection and difference highlighting.
- Asset marking, naming, formats, scales, suffixes, and batch download.
- Design-token export in CSS variables, JSON, Style Dictionary, Android, iOS, and W3C DTCG formats.
- Component-to-code mapping comparable to Code Connect, with prop mappings and examples.
- Developer annotations, ready-for-development status, change history, and inspectable diffs.
- Copy links to nodes and stable deep links into desktop/browser documents.
- IDE integration through MCP first; evaluate dedicated VS Code extension only after APIs stabilize.

**Exit:** representative handoff projects generate compilable code/assets and pass snapshot, token, and accessibility checks.

## Phase 9: collaboration, comments, and history

**Goal:** provide safe team workflows while retaining local-first guarantees.

- Comment pins, threads, mentions, resolve/reopen, notifications, and permissions.
- Durable version history with named checkpoints, preview, restore, and diff.
- Conflict-free undo semantics for local and remote edits.
- Presence, cursor chat, voice-independent follow mode, and selection visibility controls.
- Role-based document/project/library permissions enforced by remote APIs.
- Offline queue inspection, retry, conflict diagnostics, and recovery tools.
- Branching/merging only after version history and semantic diff are stable.
- Optional relay service for networks where P2P fails, with end-to-end encryption design review.

**Exit:** randomized multi-peer convergence tests pass under disconnect, reorder, duplicate delivery, and offline replay.

## Phase 10: file, clipboard, plugin, and ecosystem fidelity

**Goal:** make NexDesign safe inside mixed-tool pipelines.

- Property-complete `.fig` import/export coverage for the approved schema surface.
- Unknown-field preservation so unsupported data is not destroyed by round trips.
- Figma clipboard parity for all supported nodes, styles, variables, components, and prototypes.
- Incremental/streaming parsing, lazy pages, cancellation, and memory limits for large files.
- Sketch import only after `.fig` fidelity reaches its gate.
- Expand the Figma Plugin API compatibility contract with explicit supported/stubbed/unsupported reports.
- Plugin sandboxing, capability permissions, resource limits, and deterministic lifecycle events.
- Stable SDK and MCP versioning with compatibility tests and deprecation windows.

**Exit:** approved fixture corpus survives five repeated import/export cycles without semantic drift or unbounded file growth.

## Phase 11: performance, reliability, accessibility, and polish

This work runs continuously; this phase closes remaining gaps.

### Performance budgets

| Scenario                             |                                             Target |
| ------------------------------------ | -------------------------------------------------: |
| Pointer/drag visual response p95     |                                            ≤ 16 ms |
| Inspector update after mutation p95  |                                            ≤ 50 ms |
| Undo/redo p95 for ordinary operation |                                            ≤ 50 ms |
| Open 10k-node local document p95     |                               ≤ 2 s to interactive |
| Open 100k-node local document p95    |                               ≤ 8 s to interactive |
| Pan/zoom on reference documents      |                            60 FPS p95 frame pacing |
| Idle editor memory, demo document    |                                   ≤ 300 MB desktop |
| 100k-node document memory            | Define baseline, then enforce no-regression budget |

### Optimization architecture

- Spatial index for hit testing, selection, snapping, and culling.
- Dirty-region and subtree invalidation for layout, painting, overlays, and inspectors.
- Raster tile caching for expensive static regions.
- Worker pipelines for parse, serialize, image decode, analysis, and export.
- Lazy instance expansion and derived-property caches with explicit invalidation.
- Virtualized layers, variables, component browsers, history, and large inspector lists.
- GPU/resource lifetime accounting and leak tests.
- Startup code splitting and on-demand CanvasKit/font loading where safe.

### Reliability and accessibility

- Crash recovery journal and corrupted-document safe mode.
- Autosave integrity tests under process termination and disk-full simulation.
- WCAG 2.2 AA for the editor chrome and dialogs.
- Full keyboard navigation, focus visibility, labels, contrast, zoom, and reduced motion.
- Screen-reader-friendly layer tree, inspector, dialogs, and comments.
- Localization coverage and RTL application chrome.

**Exit:** every performance, soak, recovery, accessibility, and platform gate passes for two consecutive release candidates.

## Cross-cutting implementation contracts

Every feature PR must include the applicable layers:

1. Named core types and schema defaults.
2. Framework-agnostic editor action and typed events.
3. Undo/redo transaction with stable node identity.
4. Scene/layout/render implementation.
5. Kiwi, clipboard, JSON/subgraph, and clone behavior.
6. Collaboration encoding and migration.
7. Vue SDK primitive/composable/command.
8. App UI using shared `ui` slot conventions.
9. Figma API and ToolDef exposure when meaningful.
10. CLI/MCP output and machine-readable error behavior.
11. Unit, integration, E2E, visual, performance, and accessibility tests as applicable.
12. Changelog, user documentation, capability registry, and migration notes.

## Prioritization model

Score each backlog item:

`priority = workflow_frequency × parity_gap × data_risk × dependency_multiplier ÷ estimated_effort`

Use four tiers:

- **P0:** data integrity, rendering correctness, undo, security, crashes.
- **P1:** daily design workflows and high-frequency Figma parity.
- **P2:** advanced design-system, prototype, handoff, and collaboration workflows.
- **P3:** niche illustration, enterprise, or ecosystem capabilities.

Do not begin a P2 feature that depends on an incomplete P0/P1 semantic foundation.

## Suggested release train

| Release band | Primary outcome                                                                  |
| ------------ | -------------------------------------------------------------------------------- |
| 0.12–0.13    | Phase 0, capability registry, baseline fidelity harness, static-clean repository |
| 0.14–0.16    | Editing ergonomics, masks, constraints, guides, measurement, outline view        |
| 0.17–0.19    | Rendering/compositing and typography fidelity                                    |
| 0.20–0.22    | Vector editing and complex Auto Layout/grid                                      |
| 0.23–0.25    | Complete components, variables, styles, and local libraries                      |
| 0.26–0.28    | Advanced prototyping and presentation                                            |
| 0.29–0.31    | Dev Mode, tokens, assets, component-to-code mapping                              |
| 0.32–0.34    | Comments, history, collaboration resilience, ecosystem fidelity                  |
| 0.35+        | Performance closure, accessibility, platform polish, 99% certification           |

Release bands are dependency order, not calendar promises. Each release should remain small enough to validate and roll back safely.

## Team/workstream model

The roadmap can run with parallel ownership while retaining shared contracts:

- Engine/rendering and visual fidelity.
- Text/fonts/internationalization.
- Layout/canvas interaction.
- Components/variables/libraries.
- Prototype/presentation.
- Dev Mode/codegen/assets.
- File formats/clipboard/plugin API.
- Collaboration/history/accounts.
- Test infrastructure/performance/accessibility.

Cross-workstream schema changes require a short design record and migration checklist before implementation.

## Final 99% certification

The 99% claim can be published only when:

- The generated capability dashboard reports ≥99.0% weighted verified parity.
- No P0 or P1 capability remains `missing` or `partial`.
- `.fig` semantic and rendering gates pass on the complete certified corpus.
- Full unit, E2E, visual, accessibility, performance, soak, and multi-peer suites pass.
- Windows, macOS, Linux, browser, and Tauri release candidates pass platform smoke tests.
- Documentation reflects the generated registry and contains no known stale claims.
- Two consecutive release candidates meet all budgets without blocker waivers.

After certification, parity becomes a maintained compatibility contract: new features cannot regress the score, and newly adopted Figma workflow coverage enters through the same registry and fixture process.
