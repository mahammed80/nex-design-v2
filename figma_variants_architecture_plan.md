# NexDesign Figma-Compatible Variants Architecture Plan

## Status and architectural decision

This plan closes correctness, persistence, and interaction gaps in NexDesign components, component sets, variants, properties, instances, and overrides.

The normalized `SceneGraph` is the only document source of truth. Vue reflects it, CanvasKit renders it, and Kiwi serializes it. Do not introduce Pinia document state, a virtual instance render tree, or a second component model. Component semantics remain TypeScript core logic; Rust/Tauri remains an I/O and native-shell boundary.

Compatibility target: preserve NexDesign documents losslessly and round-trip the supported subset of Figma component semantics.

## 1. Product goals

The completed system must let a designer:

1. Create components and combine them into a component set.
2. Define variant, text, boolean, and instance-swap properties.
3. Create, rename, reorder, and delete variant values safely.
4. Insert an instance and edit its exposed properties.
5. Override supported properties on the instance root or descendants.
6. Switch variants without losing compatible overrides.
7. Switch away and back and recover temporarily inapplicable overrides.
8. Edit a main component and synchronize instances without overwriting overrides.
9. Undo or redo every operation as one coherent action.
10. Save, reopen, export to `.fig`, and reimport without losing supported semantics.
11. Use the same operations through UI, AI tools, MCP, and CLI `eval`.

Non-goals:

- Replacing the normalized graph with a virtual render tree.
- Moving domain logic into Vue, CanvasKit, Rust, or Tauri commands.
- Depending on mutable layer names as stable identity.
- Modifying the vendored Kiwi schema.
- Adding a second JSON-native design format.

## 2. Existing foundations to preserve

NexDesign already has:

- `COMPONENT`, `COMPONENT_SET`, and `INSTANCE` nodes.
- A flat node map with `parentId` and `childIds`.
- Materialized instance descendants whose `componentId` identifies their source node.
- Component property definitions and variant values.
- An `instanceIndex` for source-component lookup.
- Batched component-to-instance synchronization.
- Editor actions for components, sets, variants, and instances.
- Purple CanvasKit component-set presentation.
- Kiwi import of component definitions and values.
- A typed editor event bus and undo manager.

Evolve these foundations instead of duplicating them.

## 3. Mandatory invariants

### Graph

- Every resolved `INSTANCE.componentId` references a live `COMPONENT`.
- Every materialized instance descendant has a stable source-component relationship.
- A `COMPONENT_SET` has component variants as its semantic children.
- A component belongs to at most one component set.
- `instanceIndex` remains correct after create, delete, detach, restore, and switch.

### Properties

- Definition IDs are stable and document-unique.
- Internal assignments are keyed by definition ID, not mutable display name.
- Every variant has at most one value per definition.
- Two variants in a set cannot have the same normalized property tuple.
- Options are derived or transactionally updated; they cannot drift from variants.
- Renaming a definition preserves its ID and assignments.

### Overrides

- Targets use stable component lineage, never instance IDs or names as canonical identity.
- Temporarily inapplicable overrides remain stored as inactive.
- Synchronization never overwrites an explicit override.
- Reset removes active and inactive overrides.
- Detach materializes the current appearance and removes component metadata.

### Transactions

- Switching is atomic for graph state, indexes, selection, layout, rendering, and undo.
- Undo restores exact component IDs, descendants, overrides, values, bounds, and selection.
- Failed validation or reconciliation leaves the instance unchanged.

## 4. Canonical data model

### Property values

Migrate from name-keyed internal assignments to stable definition IDs.

```ts
export type ComponentPropertyType = 'VARIANT' | 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP'
export type ComponentPropertyValue = string | boolean
export type ComponentPropertyAssignments = Record<string, ComponentPropertyValue>

export interface ComponentPropertyDefinition {
  id: string
  name: string
  type: ComponentPropertyType
  defaultValue: ComponentPropertyValue
  preferredValues?: ComponentPropertyValue[]
}
```

Import and UI adapters may translate Figma/name-keyed values at boundaries. Never keep two independently mutable assignment representations.

### Stable component lineage

Source nodes participating in synchronization need persistent identity across cloning, switching, save/open, and Figma interchange.

```ts
export type ComponentLineageKey = string

export interface ComponentBinding {
  sourceNodeId: string | null
  lineageKey: ComponentLineageKey
}
```

Resolution order:

1. Imported Figma override key or persistent NexDesign lineage key.
2. Exact source component node ID within the same component.
3. Explicit cross-variant correspondence metadata.
4. Deterministic structural fallback: ancestor lineage, sibling position, type, semantic name.
5. Unresolved; retain affected overrides as inactive.

Names are fallback hints only because duplicate and renamed layers are valid.

### Typed overrides

Replace the untyped override contract with named types and centralized helpers.

```ts
export type InstanceOverrideProperty =
  | 'text'
  | 'fills'
  | 'strokes'
  | 'effects'
  | 'visible'
  | 'opacity'
  | 'componentId'
  | 'width'
  | 'height'

export interface InstanceOverride {
  target: ComponentLineageKey
  property: InstanceOverrideProperty
  value: unknown
  status: 'ACTIVE' | 'INACTIVE'
}

export type InstanceOverrides = Record<string, InstanceOverride>
```

Use `${lineageKey}:${property}` as the deterministic key. Clone values through existing copy helpers or `structuredClone`.

### Active variant

`instance.componentId` remains the active source component. Assignments are normally derived from that component. Do not add a separately mutable `activeVariantId`.

```ts
export interface InstanceVariantSelection {
  componentSetId: string
  assignments: ComponentPropertyAssignments
}
```

Persist explicit selection only when unresolved or forward-compatible state requires it.

## 5. Core module organization

Split the current variants and instances domains before expanding them:

```text
packages/core/src/editor/components/variants/
  index.ts
  definitions.ts       # Definition CRUD and validation
  combinations.ts      # Tuple normalization and duplicate detection
  resolution.ts        # Exact and fallback resolution
  switching.ts         # Atomic variant switching
  creation.ts          # Create/add/combine variants
  arrangement.ts       # Visual arrangement and set bounds
  migration.ts         # Legacy name-key migration

packages/core/src/scene-graph/instances/
  index.ts
  create.ts
  binding.ts           # Lineage and correspondence
  overrides.ts         # Record/apply/reset override state
  reconcile.ts         # Cross-variant subtree reconciliation
  sync.ts              # Component propagation
  detach.ts
  validation.ts
```

Keep compatibility exports while callers migrate. Keep files below the project size threshold.

## 6. Variant resolution

Normalize assignments by resolving names at boundaries, filling defaults, validating types, preserving safe opaque imported properties, and sorting by definition ID before hashing.

```ts
function variantTuple(assignments: ComponentPropertyAssignments): string
```

Build a cached index per component set:

```ts
Map<VariantTuple, ComponentId>
```

Invalidate it on variant structure, definition, or assignment changes. Duplicate tuples are errors surfaced in the inspector and linter.

Fallback is for incomplete imports, not normal selection. Score deterministically:

1. Newly changed property match.
2. Other requested matches.
3. Default-value matches.
4. Component-set child order as final tie-breaker.

```ts
interface VariantResolution {
  componentId: string
  kind: 'EXACT' | 'FALLBACK'
  unmatchedPropertyIds: string[]
}
```

The UI should indicate fallback resolution rather than silently pretending it was exact.

## 7. Override-aware editing

All UI edits continue through editor actions. Extend the mutation boundary:

1. Locate the nearest owning `INSTANCE`.
2. Resolve the edited materialized node's lineage key.
3. Compare the new value with the active source value.
4. Add/update a typed override when different.
5. Remove it when equal to the source default.
6. Apply the node update.
7. Record node and override state in one undo transaction.

Required helpers:

```ts
recordInstanceOverride(instanceId, targetNodeId, property, value)
removeInstanceOverride(instanceId, lineageKey, property)
applyInstanceOverrides(instanceId)
resetInstanceOverrides(instanceId)
```

Root and descendant overrides must follow the same convention.

## 8. Cross-variant reconciliation

Switching must reconcile the instance subtree instead of deleting every child.

### Correspondence

Build lineage maps for current and target source components:

```ts
Map<ComponentLineageKey, SourceNode>
```

For every target node:

- Reuse a materialized node when lineage matches.
- Update its source `componentId` binding.
- Synchronize only non-overridden properties.
- Preserve local IDs where practical for selection and plugin references.
- Create a node only when no compatible materialized node exists.

For nodes absent from the target:

- Remove them from the active materialized subtree.
- Keep their overrides as `INACTIVE`.

When targets return, mark matching overrides `ACTIVE` and apply them after source synchronization.

### Nested instances

- Treat nested instances as reconciliation boundaries.
- Preserve their source and override sets.
- Implement instance-swap properties by changing the nested source.
- Never flatten nested component semantics while switching.
- Detect and reject component reference cycles.

### Atomic switch sequence

```text
Validate request
  → Resolve target
  → Snapshot subtree, overrides, index, selection, and layout state
  → Build correspondence
  → Reconcile materialized subtree
  → Synchronize target defaults
  → Reapply active overrides
  → Mark unmatched overrides inactive
  → Recompute layout
  → Update instance index
  → Emit events and request one render
  → Commit one undo entry
```

Any failure restores the snapshot.

## 9. Component synchronization

Keep the existing batched sync scheduler, but synchronize by lineage:

- Update supported source properties except explicit overrides.
- Add newly introduced source children.
- Remove deleted synchronized children according to a documented preservation policy.
- Preserve component child order.
- Recompute layout once per affected instance root.
- Avoid recursive event loops through an internal transaction flag.
- Validate stale bindings and duplicate lineage keys in development.

## 10. Property semantics

### Variant

- Select by exact tuple across multiple axes.
- Prevent duplicate combinations.
- Rename definitions/options atomically without changing identity.
- Derive display names; never use them as identity.

### Text

- Definition targets a text-node lineage key.
- Instance value records a `text` override.
- Preserve it as inactive when that target is absent.

### Boolean

- Definition targets a node lineage key and controls `visible`.
- Store booleans, never string booleans.
- Preserve inactive values across switches.

### Instance swap

- Definition targets a nested-instance lineage key.
- Value references a component ID or library key.
- Validate missing targets and cycles.
- Preserve nested overrides when lineage remains compatible.

## 11. Undo and graph transactions

Add or extend a transaction helper that captures complete relevant state, not geometry alone.

Each is one undo entry:

- Create a component set.
- Add/delete/reorder a variant.
- Add/remove/rename/reorder a definition.
- Change a variant assignment.
- Rename/delete an option globally.
- Switch a variant.
- Set/reset an override.
- Swap a nested instance.
- Detach an instance.

Undo tests must verify trees, bindings, properties, overrides, indexes, selection, and layout.

## 12. Layout and rendering

CanvasKit remains presentation-only and renders materialized nodes. It must not resolve variants.

- Keep purple dashed set boundaries and fixed-scale labels in the renderer.
- Derive set bounds from children plus presentation padding.
- Do not reposition every variant on unrelated edits.
- Preserve designer positioning unless Arrange Variants is invoked.
- Provide deterministic row, column, and grid arrangement actions in core.
- Run Yoga after reconciliation and before the final render request.
- Apply active-source dimensions consistently unless size overrides exist.

## 13. Vue SDK and editor UI

Move business logic out of the current inspector components into core/editor actions and headless Vue composables:

```ts
useComponentSet(componentSetId)
useVariantDefinitions(componentSetId)
useVariantCombinations(componentSetId)
useInstanceVariant(instanceId)
useInstanceOverrides(instanceId)
```

Component-set inspector:

- Definition reorder, rename, type, and default controls.
- Derived options and duplicate-combination errors.
- A Reka UI Add Variant dialog.
- A compact multi-axis variant matrix.
- Arrange Variants and Insert Instance actions.

Variant inspector:

- Edit assignments with duplicate prevention.
- Synchronize a derived display label.
- Explain invalid combinations before committing.

Instance inspector:

- Main component and active variant.
- Controls matching all four definition types.
- Exact/fallback resolution status.
- Separate active/inactive override counts.
- Reset one property, one target, or all overrides.
- Go to Main Component and Detach actions.

Replace native `prompt()` and `confirm()` with Reka UI dialogs. Follow the established `:ui` slot pattern, keyboard accessibility, and editor-event reactivity.

## 14. Kiwi `.fig` persistence

### Import

Normalize:

- Component and component-set identity.
- Definitions and variant assignments.
- Override keys and lineage.
- Symbol overrides.
- Text, boolean, and swap property references.
- Nested component chains.
- External/missing components as explicit unresolved references.

Prefer Figma override keys. Use deterministic structural heuristics only as fallback.

### Export

Extend Kiwi export to emit:

- Symbols and symbol IDs.
- Component-set metadata.
- Definitions and variant values.
- Instance source links.
- Source-node override keys.
- Symbol override paths and values.
- Nested instance swaps.

Build node-ID-to-GUID mappings before emitting references. Preserve safe opaque imported metadata that NexDesign cannot interpret but can round-trip.

Release gate:

```text
Figma fixture
  → import
  → edit/switch/override
  → export .fig
  → reimport
  → compare semantics
  → verify representative output in Figma
```

## 15. AI, MCP, and CLI tools

Add framework-independent `ToolDef` operations:

- `create_component_set`
- `add_component_variant`
- `set_variant_properties`
- `define_component_property`
- `create_instance`
- `switch_instance_variant`
- `set_instance_override`
- `reset_instance_overrides`
- `describe_component_set`
- `validate_component_set`

Tools return structured results and use the same core semantics. AI and MCP inherit them through the registry; CLI uses `eval` unless specialized agentfmt output is justified.

## 16. Migration

### A. Read-compatible model

- Add typed definitions, assignments, lineage, and overrides.
- Read legacy name-keyed assignments and instance-ID override keys.
- Generate missing IDs/lineage deterministically.
- Do not rewrite a document merely by opening it.

### B. Canonical writes

- New edits use stable IDs and lineage.
- Save/export emits canonical and required compatibility data.
- Surface local diagnostics for migration failures without telemetry.

### C. Retire legacy writes

- Retain supported legacy readers.
- Remove legacy writes only after fixtures and release migration tests pass.

Migration must be idempotent.

## 17. Test strategy

### Unit

- Stable tuple generation and duplicate detection.
- Exact and deterministic fallback resolution.
- Definition rename preserving assignments.
- Boolean and swap validation.
- Lineage resolution with duplicate names.
- Override activation/deactivation.
- Nested cycle detection.
- Migration idempotence.

### Scene graph

- Root and descendant override recording.
- Component sync preserving overrides.
- Child add/remove/reorder/reparent behavior.
- Switching while preserving compatible materialized IDs.
- A → B → A override recovery.
- Inactive overrides for missing targets.
- Nested instances and swaps.
- Detach visual stability.
- Controlled behavior for deleted sources.

### Undo

For action, undo, and redo, assert:

- Node tree and bindings.
- Definitions and assignments.
- Override values/statuses.
- `instanceIndex`.
- Selection and bounds.

### Codec

- NexDesign save/open.
- `.fig` import and export/reimport.
- All four property types.
- Nested overrides and unknown metadata preservation.

### E2E

- Combine as variants.
- Add/edit axes without native prompts.
- Visible duplicate rejection.
- Insert and switch an instance.
- Preserve text/fill/visibility across switches.
- Reset granular/all overrides.
- Go to main, detach, undo, and redo.

### Visual

- Set boundaries and labels across zoom levels.
- Mixed-size arrangements.
- Instance bounds before/after switching.
- Nested instances and both themes.

## 18. Implementation phases and gates

### Phase 0 — Characterization

Deliver:

- Tests reproducing override loss and root-key inconsistency.
- Small `.fig` fixtures for every property type.
- A current import/export loss inventory.

Gate: failures are deterministic without UI timing.

### Phase 1 — Typed identity

Deliver:

- Stable property assignments.
- Component lineage.
- Typed override helpers.
- Legacy readers and validators.

Gate: existing tests pass and migration is idempotent.

### Phase 2 — Override-aware mutation and sync

Deliver:

- Instance-aware editor mutations.
- Unified root/descendant keys.
- Lineage-based sync.
- Correct reset and detach.

Gate: component edits never overwrite overrides.

### Phase 3 — Atomic switching

Deliver:

- Indexed exact resolution.
- Deterministic fallback.
- Subtree reconciliation.
- Active/inactive overrides.
- Complete undo transactions.

Gate: A → B → A preserves overrides, nested instances, selection, and undo.

### Phase 4 — Complete property types

Deliver text, boolean, instance swap, multi-axis validation, and cycle protection.

Gate: all types work in core without Vue dependencies.

### Phase 5 — SDK and inspector

Deliver headless composables, Reka UI dialogs, a variant matrix, validation, and granular override controls.

Gate: keyboard-accessible desktop and responsive E2E flows pass.

### Phase 6 — Kiwi persistence

Deliver full export metadata, override serialization, round-trip fixtures, and manual Figma verification notes.

Gate: no supported semantics are lost across `.fig` export/reimport.

### Phase 7 — Tools and hardening

Deliver ToolDefs, docs, changelog, benchmarks, and final quality gates.

Gate: lint, types, unit, codec, E2E, visual, and duplication checks pass.

## 19. Performance budgets

- Exact resolution uses a cached tuple index.
- Switching one instance does not traverse the full document.
- Synchronization touches only indexed instances of the edited component.
- One layout pass and render request per affected instance transaction.
- Never clone the entire document.
- A set with 100 variants and 1,000 instances remains interactive.

Add benchmarks before optimizing.

## 20. Failure handling

Return typed errors for missing sets/components, duplicate tuples, invalid values, unresolved swaps, cycles, corrupt lineage, and reconciliation failure.

Validate before mutation. UI and tools present the same core errors appropriately. A failed operation must not leave partial graph changes.

## 21. Definition of done

- All invariants are enforced.
- Overrides survive component edits and switches.
- All four property types work.
- Nested instances and swaps are safe.
- Every operation has exact undo/redo.
- No operation depends on display names for identity.
- Variant workflows use no native `prompt()` or `confirm()`.
- UI, AI, MCP, and CLI share core semantics.
- Supported semantics survive NexDesign and `.fig` round-trips.
- Unit, engine, codec, E2E, visual, duplication, lint, and type gates pass.
- User and SDK documentation is complete.

## 22. Recommended pull-request sequence

1. `test(components): characterize override and switching failures`
2. `refactor(core): add stable component lineage and typed overrides`
3. `fix(core): record instance overrides through editor mutations`
4. `fix(core): reconcile instance subtrees when switching variants`
5. `feat(core): complete component property semantics`
6. `refactor(app): move variant inspector logic into SDK composables`
7. `feat(kiwi): round-trip component properties and overrides`
8. `feat(tools): expose component and variant operations`

Keep each pull request independently tested and releasable. Do not combine schema migration, switching, UI replacement, and Kiwi export in one change.
