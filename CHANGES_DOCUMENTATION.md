# NexDesign — Complete Change & Feature Documentation (Detailed)

This document compares the **baseline GitHub repository** (`nex-design-v2`, tracked at `origin/main`, HEAD `785d874e`) with the **current working folder** (the local `nex-design-v2` workspace). It lists every edit and every feature added on top of the published baseline, at a code-level of detail.

**Baseline commit:** `785d874e` — `chore: update remote to nex-design-v2`
**Current state:** uncommitted working tree — ~92 modified files (≈3,860 insertions / ≈1,360 deletions) plus ~45 new files.

---

## Contents

1. [High-Fidelity Prototyping System](#1-高fidelity-prototyping-system)
2. [Ruler Guides](#2-ruler-guides)
3. [GPU Image Filters & Background Removal](#3-gpu-image-filters--background-removal)
4. [Layout Grid Overlays](#4-layout-grid-overlays)
5. [Design Tokens & Style Guide System](#5-design-tokens--style-guide-system)
6. [Interaction Event Dispatcher](#6-interaction-event-dispatcher)
7. [Hit-Test Stack & Traversal Helpers](#7-hit-test-stack--traversal-helpers)
8. [Rich Text, Typography & Font System](#8-rich-text-typography--font-system)
9. [Device Presets](#9-device-presets)
10. [Editor Modes & Prototype Tab](#10-editor-modes--prototype-tab)
11. [Theme Rebrand](#11-theme-rebrand)
12. [Icon System & Toolbar Icon Picker](#12-icon-system--toolbar-icon-picker)
13. [Canvas Input / Gesture Changes](#13-canvas-input--gesture-changes)
14. [Undo, Clipboard & History](#14-undo-clipboard--history)
15. [Rendering Pipeline Changes](#15-rendering-pipeline-changes)
16. [Build & Tooling Changes](#16-build--tooling-changes)
17. [Bug Fixes & Small Refactors](#17-bug-fixes--small-refactors)
18. [Tests Added](#18-tests-added)
19. [New File Inventory](#19-new-file-inventory)
20. [In-Progress / Notable Refactors](#20-in-progress--notable-refactors)

---

## 1. 🔗 High-Fidelity Prototyping System

A full Figma-style prototyping subsystem: first-class connections drawn on the WebGL canvas, a "Prototype" inspector tab, and an interactive presentation player with device frames, transitions, and navigation history.

### 1.1 Core data model — `packages/core/src/prototype/` (new subpath `@nex-design/core/prototype`)

| File | Contents |
|---|---|
| `types.ts` | `ConnectionSide` (`TOP/RIGHT/BOTTOM/LEFT`), `ConnectionRouting` (`AUTO/STRAIGHT/ELBOW`), `ConnectionAnchor { side, offset }`, `PrototypeConnection { id, sourceNodeId, targetNodeId, triggerType, sourceAnchor, targetAnchor, routing, curvature, customControlPoints }`, `ConnectionHit`/`ConnectionHitPart` (`body/source/target/control`), `CONNECTION_ID_PREFIX = 'proto:'`, `DEFAULT_CONNECTION_CURVATURE = 0.4`, `isConnectionId()`, `makeConnectionId()`, `connectionKey()` (source\|target\|trigger), `createConnection()` |
| `geometry.ts` | `anchorPoint(bounds, side, offset, margin)`, `autoAnchors(source, target)` (facing-side resolution through both node centers), `buildConnectionGeometry()` (AUTO → cubic with curvature-scaled side-normals; STRAIGHT → ⅓/⅔ lerp cubic; ELBOW → orthogonal polyline), `distanceToGeometry()` (24-sample cubic distance), `arrowDirection()` |
| `graph.ts` | `PrototypeGraph` read model over a page: `connections()` (derives from NAVIGATE reactions), `connectionById`, `outgoing`/`incoming`, `geometry()`, `endpointPoint()`, `controlPoints()`, `hitTestAtPoint()` (endpoint → control point → body priority, thresholds 8/10/10 px), `endpointSide()`, static `pageIdForNode()`. Constants: `CONNECTION_HIT_THRESHOLD=8`, `ENDPOINT_HIT_THRESHOLD=10`, `CONTROL_POINT_HIT_THRESHOLD=10` |
| `sync.ts` | `syncConnectionsFromReactions()` — reconciles `page.prototypeConnections` against every node's NAVIGATE reactions (keyed by source+target+trigger, preserving existing geometry); `setReactionDestination()`, `moveNavigationReaction()`, `removeNavigationReaction()`; `snapshotPrototypeState()` / `restorePrototypeState()` for undo (snapshots connections + per-node reactions, clearing reactions removed by snapshots) |

### 1.2 Scene graph integration — `packages/core/src/scene-graph/`

- `types.ts`: new node fields `reactions?`, `prototypeStartNodeId?`, `prototypeFlows?`, `prototypeConnections?`; new domain types `TriggerType` (`ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `MOUSE_ENTER`, `MOUSE_LEAVE`, `MOUSE_DOWN`, `MOUSE_UP`, `AFTER_DELAY`), `ActionType` (`BACK`, `CLOSE`, `NAVIGATE`, `URL`), `TransitionType` (instant/dissolve/smart/move-in/out/push/slide-in/out), `EasingType`, `Transition { type, duration, easing, direction }`, `Trigger { type, delay }`, `Action { type, destinationId?, url?, transition? }`, `Reaction { trigger, actions }`, `PrototypeFlow { name, startNodeId }`.
- `node-defaults.ts`: `createDefaultNode()` initializes `layoutGrids: []`, `reactions: []`, `prototypeStartNodeId: null`, `prototypeFlows: []`, `prototypeConnections: []`.
- `copy.ts`: new `cloneNode()` deep-clones fills/strokes/effects/style-runs/fill-stroke geometry/overrides/**layoutGrids/reactions/flows/connections**/bound variables/text pictures; used by history snapshots (below).
- `packages/core/src/index.ts` and `packages/core/package.json`: re-export the prototype module and register the `./prototype` subpath (source + `dist`).

### 1.3 Editor actions — `packages/core/src/editor/prototype.ts`

`createPrototypeActions(ctx)` exposes (all undo-aware via `snapshotPrototypeState`/`restorePrototypeState` + `syncConnectionsFromReactions`):
- Reaction CRUD: `addReaction`, `removeReaction`, `updateReaction`.
- Flow: `setPrototypeStartNode(pageId, nodeId|null)`.
- Connection CRUD: `addConnection(source, target, trigger='ON_CLICK')`, `removeConnection`, `reconnectConnection` (target → `setReactionDestination`+anchor; source → `moveNavigationReaction`+anchor), `updateConnectionGeometry` (anchors/routing/curvature/control points), `commitConnectionGeometry` (undo push), `connectionReaction`.
- Wired into `editor/create.ts` alongside guides; both spread into the flat editor object.

### 1.4 Canvas overlay — `packages/core/src/canvas/prototype-overlay.ts` (new, ~543 lines)

Registered as `drawPrototypeOverlay` on the renderer (`renderer.ts`, `renderer/methods.ts`, `renderer/pipeline.ts`) and painted in overlay phase when `overlays.mode === 'PROTOTYPE'`. Draws, in screen space:
- Connection curves (`drawConnectionPath`) + arrowheads (`drawArrowHead`, size 7/9 selected).
- Unselected #38bdf8 @50%, hovered #38bdf8 @100%, selected #7c3aed @3.5px.
- Selected-connection endpoint handles + Bezier control points (`drawSelectedConnectionHandles`).
- Green start badge (`drawStartBadge`) with play triangle above the start node.
- `+` handles on selected nodes' left/right mid-edges (`drawSelectedConnectorHandles`).
- Candidate target outlines on frames/sections/components while dragging.
- Active drag connector line + arrow preview (`drawActiveDraggingConnector`).
- Anchor snap indicators on hovered target edges (`drawSnapIndicators`).
- Reconnect drag (`prototypeReconnectDrag`) with dynamic anchor resolution (`resolveDragAnchors`), plus `resolveAnchorsAndPoints` fallbacks.

### 1.5 Presentation engine — `src/app/prototype/` (new, 9 modules)

| Module | Purpose |
|---|---|
| `types.ts` | `ZoomMode` (`FIT/FILL/100%`), `DeviceType`, `DevicePreset { name,width,height,bezel,radius,hasNotch,hasHomeIndicator,os }`, `TransitionDirection`, `PresentationState` |
| `presentation-manager.ts` | `PresentationManager` — reactive `PresentationState`; `startPresentation`/`stopPresentation`/`restartPrototype`; start-frame from `prototypeStartNodeId` or first frame; aspect-ratio device auto-detect (iPhone/tablet/desktop); `AFTER_DELAY` trigger timers via `setupDelayTriggers()`/`clearDelayTriggers()`; wires zoom/transition/history/interaction engines |
| `interaction-engine.ts` | `InteractionEngine.handleInteraction(nodeId, triggerType)` → resolves outgoing connection + reaction; runs `NAVIGATE` (transition/duration from action), `BACK`, `CLOSE`; returns `'CLOSE'` to end presentation |
| `navigation-controller.ts` | `NavigationController` — `navigate(dest, type, dir, duration)` pushes current to back-stack, sets transition name/duration, updates active frame; `goBack()`/`goForward()` |
| `history-manager.ts` | `HistoryManager` — back/forward stacks, no-op duplicate push, clears forward stack on new nav |
| `transition-engine.ts` | `TransitionEngine.resolveTransitionName()` — `SMART`→`smart-animate`, else lowercase CSS name with `-direction` suffix for move/slide/push |
| `zoom-controller.ts` | `ZoomController` — FIT/FILL/100% + custom scale clamped 0.1–5.0, zoom in/out ±0.1 |
| `viewport-manager.ts` | `ViewportManager.calculateLayout()` — FIT/FILL/custom scale with 48px safe margin, device bezel math |
| `device-frame-renderer.ts` | `DEVICE_PRESETS` — iPhone 15 Pro (393×852, bezel 12, r40), Pixel 8 (412×915, bezel 10, r32), iPad Pro 11" (820×1180), MacBook Pro 14" (1440×900) |

### 1.6 UI components

- **`PropertiesPanel.vue`** — new `prototype` tab (`TabsTrigger value="prototype"`, force-mounted `TabsContent`); watches `activeTab` ⇄ `editor.state.mode`.
- **`PrototypePanel.vue`** — inspector: start-frame selector, add-connection form (target frame, trigger, transition type/direction/duration/easing), connection list, launch preview button.
- **`PrototypePreview.vue`** — reka-ui Dialog player; device frame toggle + presets, FIT/FILL/100%/zoom in/out, back/forward/restart, fullscreen; mirrors nodes via `PrototypeNode.vue` (absolute-positioned DOM rects with fills/corner radius/rotation/opacity).
- **`DesignPanel.vue`** — shows `DevicePresetsSection` when Frame tool active (branch `v-if="isFrameToolActive"`, else multi/single selection).

### 1.7 Canvas input — `packages/vue/src/canvas/useCanvasInput.ts`

- Pointer-down: selects a connection in PROTOTYPE mode; `+` handles on selected nodes start `prototype-drag` (left/right sides).
- Pointer-move: updates `prototypeDragLine` + hovered node/side.
- Pointer-up: drops → resolves target screen (hitTest → frame/section/component label → `findTargetScreenNode` up-parent walk), creates ON_CLICK reaction, sets source/target anchors via `closestSideOfRect()` (offset snap to 0.5 within ±0.1).
- `setDrag(null)` type widened to accept null; `handleMarqueeMove` now guarded by `d.type === 'marquee'`.

### 1.8 Kiwi / `.fig` schema

- `packages/core/src/kiwi/binary/schema.ts`: `LayoutGrid[] layoutGrids = 47` added to the node message (old `layoutGridsTag = 99` deprecated).

---

## 2. 📏 Ruler Guides

- **`packages/core/src/editor/guides.ts`** (new) — `createGuidesActions()`: `addGuide(type, value, label)` (id `guide:<randomHex8>`), `removeGuide`, `updateGuideValue`, `setSelectedGuideId`, `toggleGuidesVisible`, `setGuidesLocked` — each pushes a matching undo entry (`Add/Delete/Move guide`).
- **Editor state** (`editor/state.ts`, `editor/types.ts`): `guides: Guide[]`, `selectedGuideId: string|null`, `guidesVisible: boolean` (default `true`), `guidesLocked: boolean`, plus `Guide { id, type: 'horizontal'|'vertical', value }`.
- **Renderer wiring** — `renderer.ts` declares `guidePaint` + `drawGuides()`; `renderer/paints.ts` initializes `guidePaint` (stroke, anti-alias); `renderer/pipeline.ts` passes `guides/selectedGuideId/guidesVisible` into overlays and calls `r.drawGuides()` after overlays; `renderer/methods.ts` delegates to `Overlays.drawGuides`.
- **Drawing** (`overlays/feedback.ts`): `drawGuides()` — lines clamped to viewport (skip beyond ruler gutter 24px), unselected cyan `#00c2ff` @ 70% alpha 1px, selected blue `#0088ff` @ 100% 1.5px.
- **Ruler interaction** (`useCanvasInput.ts`):
  - `pointerdown` on top ruler (`sy ≤ RULER_SIZE`, `sx > RULER_SIZE`) → `editor.addGuide('horizontal', round(cy))` and starts `guide-drag` (`isNew: true`).
  - Same for left ruler → vertical guide.
  - Existing guides hit-tested within **6px** → `setSelectedGuideId` + `guide-drag` (`isNew: false`).
  - `pointermove` → `editor.updateGuideValue(id, round(cx|cy))`.
  - `pointerup` — dropping back over the ruler deletes the guide (`removeGuide`, undoable); moved guides get an undo entry; new guides keep the add entry.
- **Snapping** (`packages/vue/src/shared/input/move-snap.ts`): after normal `computeSnap`, iterates active guides; snaps element top/bottom/center (horizontal guides) and left/right/center (vertical guides) within a 5px threshold, appending magenta guide indicators (`axis: 'x'|'y'`) to `snapGuides`.
- **Delete binding** (`packages/vue/src/editor/selection-capabilities/use.ts`): `canDelete` now `hasSelection || !!editor.state.selectedGuideId`.
- **Delete handler** (`editor/clipboard.ts`): `deleteSelected()` first checks `selectedGuideId`, removes the guide with full undo (restores guide + re-selects).

---

## 3. 🎨 GPU Image Filters & Background Removal

### 3.1 Types — `packages/core/src/scene-graph/types.ts`
- `ImageFilters` — brightness/contrast/exposure/highlights/shadows/whites/blacks/gamma (-1..1), hue/saturation/vibrance/temperature/tint, cyan/magenta/yellow/key (CMYK), `pointsR/G/B: [x,y][]` tone-curve control points, `bgRemoval?: BgRemovalSettings`, `blend?: BlendSettings`, `lumaThresholdEnabled`, `lumaThreshold`, `lumaTolerance`.
- `BgRemovalSettings { enabled?, targetColor?[r,g,b], hueThreshold?, satThreshold?, valThreshold?, edgeSmoothness?, erodeRadius?, dilateRadius? }`.
- `BlendSettings { enabled?, mode?, color?, opacity? }`.
- `Fill` gains optional `filters?: ImageFilters`.

### 3.2 AGSL shader engine — `packages/core/src/canvas/fills.ts` (+538 lines)
- `applyImageFill()` checks `hasActiveFilters(f)`; when set, composes a runtime effect via `getImageFiltersEffect(ck)` (`.makeShaderWithChildren(uniforms, [shader])`).
- Uniform packing: exposure/brightness/contrast + highlights/shadows/whites/blacks/gamma, hue/sat/vib/temp/tint, CMYK, `bg_enabled` + `bg_target` vec3, luma threshold/tolerance, `blend_enabled/mode/color/opacity`, then flattened RGB spline points (`getFlatPoints`, up to 8 per channel).
- `IMAGE_FILTERS_SHADER` pipeline in `main()`: exposure (multiply 2^exp) → brightness (add) → contrast (factor) → highlights/shadows (luma-weighted) + whites/blacks → gamma → hue-rotate (cross-product) → saturation/vibrance (luma blend) → temperature/tint → CMYK → RGB spline curves (`evaluateSpline`) → background removal → luma threshold → blend.
- **Background removal**: `rgb2hsv` + `evaluateMask` (HSV distance to `bg_target` with smoothstep thresholds H 0.09+, S 0.15+, V 0.18+), then **erosion** `getErodedMask` (8-neighborhood min) and **dilation** `getDilatedMask` (8-neighborhood max of eroded) for clean anti-aliased edges.
- **Blend modes**: in-shader `applyBlend()` implements 20 modes (darken, multiply, color-burn, linear-burn, lighten, screen, color-dodge, linear-dodge, overlay, soft-light, hard-light, vivid-light, difference, exclusion, subtract, divide, hue, saturation, color, luminosity) via `BLEND_MODES_MAP`; `getSkiaBlendMode()` maps the same names to `r.ck.BlendMode.*` for the fill paint.
- `applyFill()` resets `fillPaint.setBlendMode(SrcOver)` at the start of every fill.

### 3.3 Image adjustments UI — `src/components/ImageFillPicker.vue` (+951 lines)
- Tone-curve editor per channel (RGB) with draggable spline points.
- Full adjustment suite: exposure, brightness, contrast, saturation, vibrance, temperature, tint, hue, shadows, highlights, whites, blacks, gamma, blur, opacity, grayscale, sepia, CMYK.
- Background-removal controls (enable, target color picker, HSV tolerance, erosion/dilation radius) and blend-mode + color controls.
- Scale & wrap modes: `FILL`, `FIT`, `CROP` (draggable crop grid handles), `TILE`.
- Stock photo search: **Unsplash** and **Pexels** endpoints for inserting assets directly.

---

## 4. 🔲 Layout Grid Overlays

- **Types** (`scene-graph/types.ts`): `LayoutGrid { id, pattern: 'COLUMNS'|'ROWS'|'GRID', sectionSize?, visible, color: Color, alignment: 'MIN'|'MAX'|'CENTER'|'STRETCH', count, gutterSize, width?, height?, offset }`; `SceneNode.layoutGrids?`.
- **`GridSection.vue`** (new, added to `DesignPanel.vue` single + multi panels): applies only to FRAME/COMPONENT/COMPONENT_SET/INSTANCE; pattern select, count/width/gutter/offset/section-size scrub inputs, color overlay, visibility toggle, alignment select.
- Kiwi schema field `47` (see §1.8).

---

## 5. 🎛️ Design Tokens & Style Guide System

- **`src/app/editor/session/create.ts`** — on every `createEditorStore()`, ensures a **"Style Guide"** page exists: `if (!graph.getPages().some(p => p.name === 'Style Guide')) graph.addPage('Style Guide')`.
- **`src/components/EditorCanvas.vue`** — renders `<StyleGuideEditor v-if="isStyleGuidePageActive" />` when the current page is named "Style Guide" (over the canvas).
- **`src/components/StyleGuideEditor.vue`** (new):
  - Reacts to `sceneVersion`; reads `graph.variables` as a computed.
  - Color palette = `COLOR` variables + `gradient-*` STRING variables; font sizes = `FLOAT` vars prefixed `font-size-`; spacing = other FLOAT vars; font families = STRING `font-`/`font-family-`; logos = `logo-*`.
  - Modes & variable binding for instant light/dark switching (built on the existing variable system).

---

## 6. 🖱️ Interaction Event Dispatcher

- **New subpath `@nex-design/core/interaction`** (`dispatcher.ts`, `event.ts`, `types.ts`, `index.ts`), exported from the core barrel.
- `createInteractionDispatcher(getGraph)`:
  - `on(nodeId, type, handler)` → unbind; `off`; listener map keyed by node→type→Set.
  - `dispatchStack(stack, type, init)` — **capture → target → bubble** over the ancestry stack, honoring `immediateStopped`/`propagationStopped`; skips nodes removed from the graph mid-dispatch.
  - `dispatchAt(targetId, type, init, scopeId?)` — builds stack via `getAncestorStack(graph, targetId, scopeId)`.
  - `dispatchHoverChange(previous, next, init)` — non-bubbling `pointerleave` (inner→outer) then `pointerenter` (outer→inner).
  - `hasListeners`, `onNodeDeleted` (cleanup), `clear`.
- `createInteractionEvent()` — `InteractionEvent` with `phase`, `targetId`/`currentTargetId`, `point`/`screenPoint`, `button`, `modifiers`, `clickCount`, `key`, `raw`, `defaultPrevented`, `stopPropagation()`, `stopImmediatePropagation()`, `preventDefault()`.
- Event types: `pointerenter/leave/move/down/up`, `click`, `dblclick`, `tripleclick`, `contextmenu`, `wheel`, `keydown`, `keyup`, `focus`, `blur`, `dragstart/drag/dragend/dragover/drop`, `hover`, `selectionchange`.
- **Vue SDK** (`packages/vue/src/canvas/interaction/use.ts`) — `useCanvasInteraction(editor)`: builds stacks from current page + `enteredContainerId` scope, translates DOM `MouseEvent|WheelEvent|KeyboardEvent` via `buildInit()`, exposes `stackAt/dispatch/dispatchStack/on/clear/hasListeners/resetHover`; auto-cleans listeners on `graph:replaced` and node deletion (`graph.onNodeEvents({ deleted })`); `onScopeDispose` teardown.
- Exported from `@nex-design/vue` index + typed re-exports of core interaction types.
- Tests in `tests/engine/interaction/dispatcher.test.ts`.

---

## 7. 🧭 Hit-Test Stack & Traversal Helpers

- **`packages/core/src/scene-graph/traversal.ts`** (new): `getAncestorStack(graph, nodeId, scopeId)` (outermost-first, scope-excluded, 10k depth guard), `findLockedAncestor`, `findVisibleAncestor`, `findEditableNode` (nearest TEXT), `findSelectableNode` (visible + unlocked).
- **`SceneGraph`** (`scene-graph/index.ts`): new `hitTestStack(px, py, scopeId?)` and `getAncestorStack(nodeId, scopeId?)` methods; exports the traversal helpers.
- **`scene-graph/hit-test.ts`**:
  - `hitTestStack()` — deep hit + ancestry chain; empty array when nothing hit.
  - `CONTAINER_TYPES` extended with primitives: `RECTANGLE`, `ROUNDED_RECTANGLE`, `ELLIPSE`, `TEXT`, `LINE`, `STAR`, `POLYGON`, `VECTOR` (so shapes can contain children).
  - `hitTestTransparentContainer()` — non-deep hit on a FRAME/SECTION child resolves to the frame itself.
- Exported from `@nex-design/core/scene-graph` and the core barrel.
- Tests in `tests/engine/hit-test/stack.test.ts`.

---

## 8. 🔠 Rich Text, Typography & Font System

### 8.1 Typography fields — `scene-graph/types.ts`, `node-defaults.ts`
- New node fields: `wordSpacing`, `paragraphSpacing`, `listStyle: 'NONE'|'UNORDERED'|'ORDERED'`, `baselineShift`, `openTypeFeatures: OpenTypeFeatures` (kerning/ligatures/hinting + arbitrary tags).
- `TextCase` gains `SMALL_CAPS`; `CharacterStyleOverride` gains `wordSpacing`, `textCase`, `baselineShift`, `superscript`, `subscript`, `openTypeFeatures`.
- `createDefaultNode()`: `textAlignHorizontal` default changed `LEFT` → `CENTER`; new fields initialized.

### 8.2 TextEditor rewrite — `packages/core/src/text/editor.ts`
- Removed helpers: `prepareMove`, `replaceRange`, `currentLineMetrics`, `collapseSelectionTo`, `moveHorizontal/moveVertical/moveWord/advanceWhile`/`isWordBoundary`.
- Added: `isActive`/`nodeId` getters, `insert(text, node)` / `delete(node)` / `backspace(node)` (each rebuilds the paragraph from a merged node), `clickAt`, `dragTo`.
- Movement simplified: `moveLeft`/`moveRight` are whole-text caret moves (collapse selection on no-extend); `moveUp`/`moveDown` are stubs; `moveWordLeft/Right` alias left/right.
- `selectWord`/`selectWordAt` use `paragraph.getWordBoundary(pos)`.
- `start()` hardcodes `textDirection: 'LTR'` (direction resolution moved out of the editor); `stop()` deletes the paragraph before clearing state.
- `getCaretRect()` simplified (falls back to `{x:0,y0:0,y1:16}`); `getSelectionRects()` returns `any[]`.
- `rebuildParagraph(node)` clones `{...node, text: state.text}` and calls `renderer.buildParagraph(tempNode, undefined, { isMeasuring: false })`.

### 8.3 Style-run refactor — `packages/core/src/text/style-runs.ts`
- All per-character style-run functions were **stubbed to no-ops**: `getStyleAt` → `{}`, `applyStyleToRange` → `[]`, `removeStyleFromRange` → `[]`, `adjustRunsForInsert/Delete` → `[]`, `toggleBoldInRange/Italic/Decoration` → neutral returns. (See §20 — in-progress refactor; callers in `packages/vue/src/canvas/text-edit/{formatting,editing}.ts` and `tools/modify/text.ts` still reference them.)

### 8.4 Font providers — `packages/core/src/text/providers/` (new)
- `types.ts`: `FontProviderId = 'system'|'bundled'|'fontsource'|'adobe-fonts'`, `FontProvider { id, name, listFamilies(), fetchFont(family, style?) }`, `FontEntry { family, provider }`.
- `system.ts` → delegates to `fontManager.listFamilies()` / `loadLocalFont()`.
- `bundled.ts` → families `Inter, Noto Naskh Arabic, Cairo, Amiri, Roboto, Montserrat`; fetches `/Family-Style.ttf` from `public/` (`Amiri-Regular.ttf`, `Cairo-Regular.ttf`, `Montserrat-Regular.ttf`, `Roboto-Regular.ttf`).
- `fontsource.ts` → Google Fonts Fontsource API.
- `adobe-fonts.ts` → Adobe Fonts API with `getAdobeProjectIds`/`setAdobeProjectIds`.
- `index.ts`: `listAllProviderFamilies()` (dedup by lowercase family, sorted), `fetchFromProvider()`, `resetProviderCache()`, `setAdobeProjectIds`.
- Exported from `@nex-design/core/text` (`index.ts`).

### 8.5 FontManager — `packages/core/src/text/fonts.ts`
- New `rawLocalFonts` cache: `getRawLocalFonts()` queries `window.queryLocalFonts()` **once**, refreshed only when `requestLocalFontAccess()` sets `rawLocalFonts = null` before re-querying.
- `loadLocalFont(family, style)` public wrapper; `findLocalFont` uses the cache; variable fonts now allowed by default (`options.allowVariable ?? true`).
- `fallbacks.ts`: Arabic remote fallback adds `Cairo`, `Amiri`.
- `font-utils.ts` (new): `FONT_WEIGHT_NAMES`, `normalizeFontFamily`, `styleToVariant`, `styleToWeight`, `weightToStyle`.
- `global.d.ts`: `FontFaceSet.add(font): FontFaceSet` added to fix DOM type errors.

### 8.6 Font UI
- **`FontPickerRoot.vue`** (Vue SDK primitive): removed `ComboboxVirtualizer` (plain `ComboboxItem` v-for), added provider filter bar (`providerFilter`/`providerList`/`setProviderFilter`, labels Bundled/Fontsource/System), per-item provider badge, `@click="open = !open"` on anchor. `FontPickerUi` gains `providerFilter`, `providerFilterBtn`, `providerBadge` slots. `useFontPicker` adds `providerMap` option + provider filtering.
- **`FontPicker.vue`** (app): rewritten from `FontPickerRoot` to a reka-ui **Popover** hosting `FontsPanel.vue`; 280×400 panel, `@interact-outside` prevented to keep open while selecting.
- **`FontsPanel.vue`** (new): calls `requestLocalFontAccess()` + `listAllFamilies()`; search with 100-result cap; hover preview; `useEditorFontPicker` apply.
- **`FloatingTypographyPanel.vue`** (new): floating reka-ui Popover anchored to a virtual rect at the selected TEXT node's screen position (via `DOMRect.fromRect` from `getAbsolutePosition` × zoom/pan); hosts `TypographySection` + `FontsPanel` + `FillSection`.
- **`useEditorFontPicker.ts`** (new Vue SDK composable, `@nex-design/vue` export): silent hover preview — saves `originalFonts`, calls `editor.loadFont`, mutates `node.fontFamily`, nulls `textPicture`, rebuilds paragraph, sets `state.fontPreviewActive`, guards stale downloads with `activePreviewFamily`; `restoreFont()` on leave/unmount; `applyFont()` produces a single undo entry (per-node for multi-select).
- **`FontSettings/` removed** (`FontSettingsPopover.vue` + `use.ts` deleted) — replaced by the Fonts panel system.
- `src/app/editor/fonts/index.ts`: `listAllFamilies()` merges local + providers, `getProviderMap()` (family→provider), re-exports `getAdobeProjectIds`/`setAdobeProjectIds`.

### 8.7 Live text-edit sync
- `editor/nodes.ts`: `updateNode`/`updateNodeWithUndo` now rebuild the active `TextEditor` paragraph for the edited node (also inside undo forward/inverse).
- `editor/create.ts`: `setRenderer()` called on the shared `TextEditor`; `loadFont` exposed on the editor.
- Text tool behavior (`packages/vue/src/shared/input/draw.ts` + `tool-input/use.ts`): `startTextTool` removed; TEXT now uses `startShapeDraw` (defaults `DEFAULT_TEXT_WIDTH=200`, `DEFAULT_TEXT_HEIGHT=24`, `textAutoResize:'NONE'`); on draw-up a TEXT node auto-enters editing; new shapes reparent into `findMoveDropTarget` and `commitResize` uses subtree snapshots.
- Text-edit IME hardening (`packages/vue/src/canvas/text-edit/textarea.ts`, `use.ts`, `input.ts`): hidden textarea styled inline (position fixed, off-screen), `autocomplete/autocorrect/autocapitalize/spellcheck` disabled; `input/composition*/keydown` listeners attached/detached per session instead of via VueUse; container double-click always uses `getContainerDescendantHit`.
- Dashed editing border (`canvas/overlays/text-edit.ts`): `PathEffect.MakeDash([4/zoom, 4/zoom])` on the text-edit overlay rect.

---

## 9. 🎯 Device Presets

- **`src/components/properties/DevicePresetsSection.vue`** (new): shown in the Design panel when the **Frame** tool is active; grouped preset categories (Mobile-Apple, Mobile-Android, Tablet, Desktop) with exact device sizes; clicking creates a FRAME of that size on the current page; custom width/height inputs.

---

## 10. 🏷️ Editor Modes & Prototype Tab

- `EditorState.mode: 'DESIGN' | 'PROTOTYPE' | 'DEVELOPER'` (default `'DESIGN'`), added to `state.ts`.
- `PropertiesPanel.vue` two-way sync: `watch(activeTab)` sets `mode`; `watch(mode)` sets `activeTab` (`prototype` ↔ `PROTOTYPE`, `code` ↔ `DEVELOPER`).
- `useAIChat.activeTab` type widened `'design' | 'code' | 'ai'` → `'design' | 'code' | 'ai' | 'prototype'`; keyboard actions type updated accordingly.
- PROTOTYPE mode routing: `select.ts`/`select/hit.ts` hit-test connections first; `editor/selection/hit-test.ts` selects connections; `pipeline.ts` passes mode into overlays; overlay gating (`isConnectionHovered`) suppresses hover highlights while other overlays are active.

---

## 11. 🏷️ Theme Rebrand

- **`src/app.css`** `@theme` (dark):
  - panel `#323134`, canvas `#1d1c1f`, border `#4c4b4e`, hover `#424144`, accent **`#670f0f`** (brand red), surface `#f7f5f5`, muted `#9c999a`, input `#1d1c1f`.
  - code: tag `#84b899`, attribute `#ebd0b9`, string `#ebdca9`, punctuation `#b8ae9f`; checkerboard `#1d1c1f`/`#2c2b2e`; ruler bg/tick/text/label `#323134`/`#4c4b4e`/`#9c999a`/`#f7f5f5`.
- Light theme mirrors: canvas `#ece9e9`, panel `#f7f5f5`, border `#c9c5c5`, accent `#670f0f`, etc.
- **`packages/core/src/constants.ts`**: `SELECTION_COLOR` → `#670f0f`-ish `{r:.404,g:.059,b:.059}`; `CANVAS_BG_COLOR` `#ece9e9`; `CANVAS_BG_COLOR_DARK` `#1d1c1f`; ruler colors re-tuned.
- **`ExportSection.vue`**: wrapped in `bg-accent rounded-lg p-3 m-2 text-white` premium card; labels `text-white/80`, buttons white/`bg-white` with `text-accent`, previews `border-white/10` + `bg-white/5`; `Blob` cast fix.
- **`AppearanceSection.vue`** (+ other property sections): restyled into labeled columns — "Opacity"/"Radius" (`text-[9px] uppercase` labels), variable-bound scrub inputs, corner-radius section reworked; `PositionSection`, `TypographySection`, `LayoutSection/FlexControls/PaddingControls/SizeControls` gained labeled mini-columns, WRAP-mode cross-gap, per-side padding grid, "Resizing" sizing dropdowns, and a `ClipContentControl`.

---

## 12. 🧩 Icon System & Toolbar Icon Picker

- **`packages/core/src/icons/`**: `extractPaths` exported from `icons/index.ts` (re-exported in core barrel); `createIconFromPaths()` sets `horizontalConstraint`/`verticalConstraint: 'SCALE'` on generated VECTOR nodes.
- **`DesktopToolbar.vue`** (new `<icon-picker>` popover):
  - `POPULAR_ICONS` quick grid (32 lucide icons) + `searchIcons(query, {limit:18})` with 300ms debounce and `loadingIcons` state.
  - `insertIcon(iconName)`: `fetchIcon` → creates a FRAME (named by icon) at viewport center → per-path VECTOR nodes with fill/stroke mapping (`STROKE_CAP_MAP`, `STROKE_JOIN_MAP`), `parseColor` for fill colors → `undo.beginBatch('Insert Icon')` / `commitBatch()` → `requestRender`.
- `Editor` type passed into `DesktopToolbar` via `:editor="store"`.

---

## 13. 🖱️ Canvas Input / Gesture Changes

- **`useCanvasInput.ts`** — guide + prototype drags (see §1.7, §2), `setDrag(null)`, marquee guard.
- **`shared/input/types.ts`** — new drag states: `DragPrototype { type, startX, startY, nodeId, side: 'LEFT'|'RIGHT' }`, `DragPrototypeReconnect`, `DragPrototypeControlPoint { origCp1, origCp2, beforeSnapshot }`, `DragGuide { guideId, axis, startValue, isNew }`; `DragResize` gains `origSubtree: Map<string,SceneNode>`.
- **`shared/input/geometry.ts`** — `hitTestInEditorScope()` no longer takes `canvasToLocal` (hit-tests in canvas coords directly).
- **`shared/input/resize/start.ts`** — `tryStartResize` snapshots `origSubtree` via `snapshotSubtree(editor.graph, id)`; `editor.commitResize(nodeId, origSubtree)` signature change (see §14).
- **`shared/input/drop-target.ts`** — `reparentOutsideNodes()` no longer restricts reparenting to FRAME/SECTION parents (all parents).
- **`shared/input/select.ts` / `select/hit.ts`** — PROTOTYPE mode connection hit-tests (with shift additive select); `resolveHit()` deep-hits in PROTOTYPE mode and walks up to an already-selected ancestor to keep selection stable when dragging selected children.
- **`canvas/pointer/use.ts`** — adapts to the new `hitTestInEditorScope` signature.
- **`canvas/tool-input/use.ts`** — TEXT tool no longer calls `startTextTool`; falls through to `startShapeDraw`.

---

## 14. 🧾 Undo, Clipboard & History

- **`editor/undo.ts`** — `commitResize(nodeId, origSubtree)` (was `origRect`): forward/inverse restore the whole subtree's x/y/width/height + `vectorNetwork` (cloned) + fill/stroke geometry via new `restoreSubtreeProperties()`.
- **`editor/clipboard.ts`** — `deleteSelected()`:
  - Deletes a selected guide first (undo-aware).
  - Separates `connectionIds` (`isConnectionId`) from node ids; snapshots prototype state `before`/`after`; removes NAVIGATE reactions for deleted connections; `syncConnectionsFromReactions`; undo restores prototype state on both directions.
- **`editor/clipboard/subtree-history.ts`** — `collectSubtrees`/`snapshotSubtree` use the new `cloneNode()` (deep clone) instead of shallow spread/`structuredClone`.
- **`editor/history/snapshot.ts`** — `snapshotPage` uses `cloneNode()`.
- **`editor/selection/overlays.ts`** — new `setHoveredConnection(id|null)` (`state.hoveredConnectionId`, repaint).

---

## 15. 🎨 Rendering Pipeline Changes

- **`renderer.ts`** — new declares: `guidePaint`, `drawPrototypeOverlay`, `drawGuides`.
- **`renderer/methods.ts`** — implements `drawGuides` (→ `Overlays.drawGuides`) and `drawPrototypeOverlay` (→ `prototype-overlay.drawPrototypeOverlay`).
- **`renderer/paints.ts`** — initializes `guidePaint` (stroke, AA).
- **`renderer/pipeline.ts`** — `renderFromEditorState()` now passes `mode`, `prototypeDragLine`, `prototypeReconnectDrag`, `fontPreviewActive`, `guides`, `selectedGuideId`, `guidesVisible` into `RenderOverlays`; `hasVolatileOverlay()` treats `fontPreviewActive` as volatile (forces repaint); `render()` calls `r.drawPrototypeOverlay(...)` + `r.drawGuides(...)` between node edit/pen overlays and rulers.
- **`renderer/types.ts`** — `RenderOverlays` gains `mode?`, `prototypeDragLine?`, `prototypeReconnectDrag?`, `fontPreviewActive?`, `guides?`, `selectedGuideId?`, `guidesVisible?`.
- **`renderer/fonts.ts`** — `*fontPreviewActive*` repaint integration (live font preview invalidates pictures).

---

## 16. 🛠️ Build & Tooling Changes

- **`package.json`** — `yoga-layout` → `npm:@open-pencil/yoga-layout@3.3.0-grid.3`; devDependency `tsx@^4.23.1`.
- **`packages/core/package.json`** — new subpaths `./interaction` and `./prototype` (source + dist); build script `bunx tsdown` → `npx tsdown`; yoga dep renamed.
- **`packages/mcp/package.json`** — build `bunx tsgo && bunx fix-esm-import-path` → `npx tsgo && npx fix-esm-import-path dist`.
- **`vite/automation.ts`** — dev auth token switched from `randomUUID()` to stable `'dev-token-nex-design'` to avoid WebSocket token mismatches on Vite config hot-reload.
- **`src/app/automation/bridge/vite-plugin.ts`** — MCP server spawn: `hasBun()` detection; falls back to `node --import tsx --loader ./vite/node-md-loader.js`; Windows `shell: true` for Bun.
- **`vite/node-md-loader.js`** (new) — Node ESM loader that imports `.md` files (for core prompts).
- **`src/app/automation/bridge/server.ts`** — `wasConnected` flag: log `warn` only after a successful connection, `debug` otherwise; errors downgraded to `debug`.
- **`vite/aliases.ts`** — `opentype.js` alias → `dist/opentype.mjs`.
- **`packages/core/tsconfig.json`** — removed `bun` from `types` (Node-only), reformatted.
- **`packages/mcp/src/browser-rpc.ts`** — added auth-token-mismatch `console.warn`.
- **`desktop/Cargo.toml`** — formatting-only.
- **`.oxfmtrc.json`** — formatting config touch (LF→CRLF).

---

## 17. 🐛 Bug Fixes & Small Refactors

- **FontFaceSet typing** (`core/global.d.ts`) — declare `add(font: FontFace): FontFaceSet` (fixes DOM font registration type warnings).
- **`tools/create/render.ts`** — re-fetches created nodes by id before returning x/y/w/h (layout applied post-create), same for siblings.
- **`icons/render.ts`** — SCALE constraints on icon vectors.
- **`reload-source.ts`** / **`ExportSection.vue`** — `Blob([data as BlobPart])` casts for Tauri byte arrays.
- **`LayersPanel.vue`** — layer header replaced with a "Layers" tab button (`useLeftSidebar`); `LayerTree.vue` passes `setupItem` for drag-and-drop instructions.
- **`AppSelect.vue`** — `options` prop widened to `readonly { value; label }[]`.
- **`FontsPanel`/`FontPicker`** migration removed `FontSettings/` components.
- **Text direction fallbacks** (`fallbacks.ts`) — Arabic remote list extended.

---

## 18. 🧪 Tests Added

- `tests/engine/interaction/dispatcher.test.ts` — capture→target→bubble ordering, per-node `currentTargetId`, `dispatchAt` scope exclusion, stopPropagation behaviors.
- `tests/engine/hit-test/stack.test.ts` — `hitTestStack` ancestry order/deepest node/empty space/scope exclusion; `getAncestorStack` bounds; traversal helpers.
- `tests/helpers/scene.ts` — `buildNestedFixture()` builds page→frame→rect→text.

---

## 19. 📁 New File Inventory

**Core (`packages/core/src/`)**
- `prototype/` — `types.ts`, `geometry.ts`, `graph.ts`, `sync.ts`, `index.ts`
- `interaction/` — `dispatcher.ts`, `event.ts`, `types.ts`, `index.ts`
- `editor/guides.ts`, `editor/prototype.ts`
- `canvas/prototype-overlay.ts`
- `scene-graph/traversal.ts`
- `text/font-utils.ts`, `text/providers/` — `system.ts`, `bundled.ts`, `fontsource.ts`, `adobe-fonts.ts`, `types.ts`, `index.ts`

**Vue SDK (`packages/vue/src/`)**
- `canvas/interaction/use.ts`
- `controls/typography/useEditorFontPicker.ts`

**App (`src/`)**
- `app/prototype/` — `types.ts`, `device-frame-renderer.ts`, `history-manager.ts`, `zoom-controller.ts`, `viewport-manager.ts`, `transition-engine.ts`, `navigation-controller.ts`, `interaction-engine.ts`, `presentation-manager.ts`, `index.ts`
- `components/` — `FloatingTypographyPanel.vue`, `FontsPanel.vue`, `StyleGuideEditor.vue`, `PrototypeNode.vue`, `PrototypePreview.vue`
- `components/properties/` — `PrototypePanel.vue`, `GridSection.vue`, `DevicePresetsSection.vue`
- `composables/useLeftSidebar.ts`

**Assets & tooling**
- `public/Amiri-Regular.ttf`, `public/Cairo-Regular.ttf`, `public/Montserrat-Regular.ttf`, `public/Roboto-Regular.ttf`
- `vite/node-md-loader.js`
- `tests/engine/interaction/dispatcher.test.ts`, `tests/engine/hit-test/stack.test.ts`

---

## 20. 🔄 In-Progress / Notable Refactors

- **Style-run engine stubbed** — `style-runs.ts` per-character operations (`applyStyleToRange`, `toggleBoldInRange`, etc.) were reduced to no-ops returning empty/neutral values. Consumers (`packages/vue/src/canvas/text-edit/{formatting,editing}.ts`, `packages/core/src/tools/modify/text.ts`) still call them, and existing unit tests in `tests/engine/text/style-runs.test.ts` / `tests/engine/mutation.test.ts` target the old behavior — this is a work-in-progress refactor, not a completed removal.
- **TextEditor simplification** — visual bidi movement (RTL-aware left/right, up/down via glyph position) replaced with simplified whole-text caret movement; `moveUp`/`moveDown` currently no-ops.
- **Provider-based font sourcing** — the app's `FontPickerRoot`-based picker was replaced with the Popover + `FontsPanel` approach; the SDK primitive retains the provider-filter API.
