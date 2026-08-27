export interface CapabilityEvidence {
  acceptance: string
  tests: string[]
}

export const CAPABILITY_EVIDENCE: Record<string, CapabilityEvidence> = {
  'INTERFACE-NAVIGATION.LAYERS-PANEL-LEFT-SIDEBAR': {
    acceptance: 'Expand, collapse, rename, reorder, hide, and select nested layers from the panel.',
    tests: ['tests/e2e/layers/panel.spec.ts']
  },
  'INTERFACE-NAVIGATION.PAGES-PANEL': {
    acceptance: 'Create and navigate multiple pages while preserving page-specific editor state.',
    tests: ['tests/e2e/pages/multi-page.spec.ts', 'tests/engine/figma/api/document/pages.test.ts']
  },
  'INTERFACE-NAVIGATION.PROPERTIES-PANEL-RIGHT-SIDEBAR': {
    acceptance: 'Inspect and edit supported properties with correct mixed and persisted values.',
    tests: [
      'tests/e2e/properties/panel.spec.ts',
      'tests/engine/editor/selection/properties.test.ts'
    ]
  },
  'INTERFACE-NAVIGATION.ZOOM-PAN': {
    acceptance: 'Zoom and pan through pointer and keyboard input without changing scene geometry.',
    tests: ['tests/e2e/viewport/zoom-pan.spec.ts']
  },
  'INTERFACE-NAVIGATION.CANVAS-GUIDES': {
    acceptance:
      'Drag, move, snap to, lock, hide, delete, undo, and persist per-page guides through a `.fig` roundtrip.',
    tests: ['tests/engine/editor/guides.test.ts', 'tests/e2e/canvas/guides.spec.ts']
  },
  'INTERFACE-NAVIGATION.CONTEXT-MENU': {
    acceptance: 'Open the contextual menu and execute enabled selection operations.',
    tests: ['tests/e2e/context-menu/basic.spec.ts']
  },
  'INTERFACE-NAVIGATION.LAYER-OUTLINES-VIEW': {
    acceptance:
      'Toggle an outline-only canvas view from the menu and keyboard without changing document data.',
    tests: ['tests/engine/editor/view.test.ts', 'tests/e2e/app/menu.spec.ts']
  },
  'LAYERS-SHAPES.SHAPE-TOOLS-RECTANGLE-ELLIPSE-LINE-POLYGON-STAR': {
    acceptance: 'Create supported primitive shapes with correct bounds and undo behavior.',
    tests: [
      'tests/e2e/editor/create-shapes.spec.ts',
      'tests/engine/editor/undo/create-shape.test.ts'
    ]
  },
  'LAYERS-SHAPES.COPY-PASTE-OBJECTS': {
    acceptance: 'Copy and paste supported node trees while preserving hierarchy and styling.',
    tests: [
      'tests/e2e/clipboard/copy-paste.spec.ts',
      'tests/engine/editor/clipboard/fixture-roundtrip.test.ts'
    ]
  },
  'VECTOR-TOOLS.BOOLEAN-OPERATIONS-UNION-SUBTRACT-INTERSECT-EXCLUDE': {
    acceptance: 'Create every Boolean operation with stable operands, geometry, undo, and redo.',
    tests: ['tests/engine/editor/structure/boolean-operation.test.ts']
  },
  'TEXT-TYPOGRAPHY.TEXT-TOOL-INLINE-EDITING': {
    acceptance: 'Create and edit text with selection, formatting, commit, undo, and redo.',
    tests: [
      'tests/e2e/text/editing.spec.ts',
      'tests/engine/text/editor.test.ts',
      'tests/engine/text/edit-undo.test.ts'
    ]
  },
  'COLOR-GRADIENTS-IMAGES.COLOR-PICKER-HSV': {
    acceptance: 'Edit hue, saturation, value, alpha, and hex values with one undo transaction.',
    tests: ['tests/e2e/color-picker/basic.spec.ts', 'tests/engine/color/picker-model.test.ts']
  },
  'EFFECTS-PROPERTIES.INNER-SHADOW': {
    acceptance:
      'Render and edit inner shadows with correct spread, clipping, ordering, and text behavior.',
    tests: [
      'tests/engine/render/canvas/effects/inner-shadow.test.ts',
      'tests/e2e/properties/effects.spec.ts'
    ]
  },
  'AUTO-LAYOUT.HORIZONTAL-VERTICAL-FLOW': {
    acceptance: 'Lay out horizontal and vertical children with reference-compatible geometry.',
    tests: [
      'tests/engine/layout/auto-layout/horizontal/basic.test.ts',
      'tests/engine/layout/auto-layout/vertical/basic.test.ts'
    ]
  },
  'AUTO-LAYOUT.JUSTIFY-CONTENT': {
    acceptance: 'Distribute and align children along the primary axis (start, center, end, space-between).',
    tests: ['tests/engine/layout/auto-layout/alignment/primary-axis.test.ts']
  },
  'AUTO-LAYOUT.ALIGN-ITEMS': {
    acceptance: 'Align children along the counter axis (start, center, end, stretch, baseline).',
    tests: ['tests/engine/layout/auto-layout/alignment/counter-axis.test.ts']
  },
  'AUTO-LAYOUT.CHILD-SIZING-FIXED-FILL-HUG': {
    acceptance: 'Support Fixed, Fill, and Hug sizing modes across horizontal and vertical auto-layout children.',
    tests: ['tests/engine/layout/auto-layout/sizing/modes.test.ts']
  },
  'AUTO-LAYOUT.COMBINED-FLOWS-NESTED': {
    acceptance: 'Layout deeply nested auto-layout hierarchies with mixed flow directions and fills.',
    tests: ['tests/engine/layout/auto-layout/nested/basic.test.ts']
  },
  'AUTO-LAYOUT.GRID-AUTO-LAYOUT-FLOW': {
    acceptance: 'Compute CSS Grid layouts with column/row tracks, spans, and gap definitions.',
    tests: ['tests/engine/layout/grid-layout.test.ts']
  },
  'AUTO-LAYOUT.WRAP': {
    acceptance: 'Wrap children into lines with correct gaps, sizing, and counter-axis behavior.',
    tests: ['tests/engine/layout/auto-layout/wrap/layout.test.ts']
  },
  'AUTO-LAYOUT.MINMAX-WIDTH-AND-HEIGHT': {
    acceptance: 'Enforce two-axis minimum and maximum dimensions during layout and resize.',
    tests: ['tests/engine/layout/auto-layout/min-max/constraints.test.ts']
  },
  'COMPONENTS-DESIGN-SYSTEMS.VARIANTS': {
    acceptance: 'Switch variants while preserving compatible overrides, lineage, undo, and redo.',
    tests: [
      'tests/engine/editor/components/variant-overrides.test.ts',
      'tests/e2e/components.spec.ts'
    ]
  },
  'PROTOTYPING.ACTIONS-NAVIGATE-OVERLAY-SCROLL-ETC': {
    acceptance:
      'Execute supported prototype actions against navigation, overlays, variants, scrolling, and variables.',
    tests: ['tests/engine/app/prototype-interaction.test.ts']
  },
  'IMPORT-EXPORT.FIG-FILE-IMPORT': {
    acceptance:
      'Import representative `.fig` fixtures without hierarchy or supported-property loss.',
    tests: [
      'tests/engine/fig/import/property-integrity.test.ts',
      'tests/engine/fig/heavy/fixtures.test.ts'
    ]
  },
  'IMPORT-EXPORT.FIG-FILE-EXPORT': {
    acceptance: 'Export supported document semantics and reimport them without semantic drift.',
    tests: ['tests/engine/fig/export/worker.test.ts', 'tests/engine/fig/roundtrip/basic.test.ts']
  },
  'COLLABORATION-DEV-MODE.CODE-SNIPPETS': {
    acceptance: 'Generate deterministic framework snippets for the selected design subtree.',
    tests: ['tests/engine/codegen/codegen.test.ts', 'tests/e2e/code/panel.spec.ts']
  },
  'COLLABORATION-DEV-MODE.MCP-SERVER': {
    acceptance: 'Serve registered tools over supported MCP transports with scoped file access.',
    tests: [
      'tests/engine/mcp/server.test.ts',
      'tests/engine/mcp/stdio.test.ts',
      'tests/engine/mcp/path-scoping.test.ts'
    ]
  },
  'INTERFACE-NAVIGATION.NUDGE-VALUE-SETTINGS': {
    acceptance: 'Configure small and big nudge settings with arrow key stepping and undo batching.',
    tests: ['tests/engine/editor/nudge.test.ts']
  },
  'LAYERS-SHAPES.MEASURE-DISTANCES-BETWEEN-LAYERS': {
    acceptance: 'Display multi-edge distance lines and projection badges on Alt-hover and Dev Mode.',
    tests: ['tests/engine/editor/selection/properties.test.ts']
  },
  'LAYERS-SHAPES.COPYPASTE-PROPERTIES': {
    acceptance: 'Copy and paste styling and typography properties across nodes with full undo/redo support.',
    tests: ['tests/engine/editor/clipboard/properties.test.ts']
  },
  'LAYERS-SHAPES.SCALE-LAYERS-PROPORTIONALLY': {
    acceptance: 'Scale geometry, stroke weights, typography font-size, and corner radii proportionally via Scale tool (K).',
    tests: ['tests/engine/editor/resize-autolayout.test.ts']
  },
  'LAYERS-SHAPES.CONSTRAINTS-RESPONSIVE-RESIZE': {
    acceptance: 'Apply horizontal and vertical child constraints (Left, Right, Stretch, Center, Scale) on frame resize.',
    tests: ['tests/engine/editor/constraints.test.ts']
  },
  'LAYERS-SHAPES.SMART-SELECTION-DISTRIBUTEALIGN': {
    acceptance: 'Evenly space and align multi-selection (horizontal, vertical, tidy up) with full undo/redo transactions.',
    tests: ['tests/engine/editor/selection/distribution.test.ts']
  },
  'LAYERS-SHAPES.LAYOUT-GUIDES-COLUMNS-ROWS-GRID': {
    acceptance: 'Render column, row, and grid overlay guides on frames with count, gutter, offset, and stretch/center alignments.',
    tests: ['tests/engine/canvas/layout-grid.test.ts']
  },
  'LAYERS-SHAPES.MASKS': {
    acceptance: 'Clip sibling layers in frames and groups using shape and alpha masks with undo/redo transactions.',
    tests: ['tests/engine/canvas/mask.test.ts']
  },
  'TEXT-TYPOGRAPHY.TEXT-RESIZING-MODES-AUTO-FIXED-HUG': {
    acceptance: 'Support Auto-Width, Auto-Height, and Fixed-Size text sizing modes with text truncation and undo/redo.',
    tests: ['tests/engine/text/auto-resize.test.ts']
  },
  'TEXT-TYPOGRAPHY.BULLETED-NUMBERED-LISTS': {
    acceptance: 'Format unordered and ordered text lists with persistent styleRuns and undo/redo.',
    tests: ['tests/engine/text/lists-links.test.ts']
  },
  'TEXT-TYPOGRAPHY.LINKS-IN-TEXT': {
    acceptance: 'Support inline URL hyperlinks across character style runs with full undo/redo transactions.',
    tests: ['tests/engine/text/lists-links.test.ts']
  },
  'COLOR-GRADIENTS-IMAGES.BLEND-MODES': {
    acceptance: 'Render layer and fill blend modes mapped to Skia BlendMode shaders with full undo/redo transactions.',
    tests: ['tests/engine/canvas/blend-mode.test.ts']
  },
  'VECTOR-TOOLS.BOOLEAN-OPERATIONS-UNION-SUBTRACT-INTERSECT-EXCLUDE': {
    acceptance: 'Create non-destructive Boolean containers (Union, Subtract, Intersect, Exclude) with full undo/redo transactions.',
    tests: ['tests/engine/editor/boolean-operations.test.ts']
  },
  'LAYERS-SHAPES.PENCIL-FREEHAND-TOOL': {
    acceptance: 'Create smooth freehand vector paths with round caps and joins via Pencil tool (Shift+P).',
    tests: ['tests/engine/editor/pencil.test.ts']
  },
  'PROTOTYPING.TRIGGERS-CLICK-HOVER-DRAG-ETC': {
    acceptance: 'Handle interaction triggers (click, hover, mouse down, drag, delay) on interactive frames.',
    tests: ['tests/engine/app/prototype-interaction.test.ts']
  },
  'PROTOTYPING.ACTIONS-NAVIGATE-OVERLAY-SCROLL-ETC': {
    acceptance: 'Execute prototype actions (navigate, open overlay, close overlay, scroll to, change to).',
    tests: ['tests/engine/app/prototype-interaction.test.ts']
  },
  'PROTOTYPING.OVERLAYS': {
    acceptance: 'Render positioned modal overlays with backdrop blur and outside-click dismissal.',
    tests: ['tests/engine/app/prototype-interaction.test.ts']
  },
  'PROTOTYPING.PRESENT-PLAY-PROTOTYPES': {
    acceptance: 'Present interactive prototype flow player with start frame selection and step history.',
    tests: ['tests/engine/app/prototype-interaction.test.ts']
  },
  'COLLABORATION-DEV-MODE.DEV-MODE-INSPECT': {
    acceptance: 'Inspect node box models, padding, gaps, resolved tokens, and generated rules in Dev Mode.',
    tests: ['tests/engine/codegen/codegen.test.ts']
  },
  'COLLABORATION-DEV-MODE.CODE-SNIPPETS': {
    acceptance: 'Generate React, Vue, Tailwind, SwiftUI, Flutter, and CSS code snippets from scene nodes.',
    tests: ['tests/engine/codegen/codegen.test.ts']
  },
  'COLLABORATION-DEV-MODE.TAILWIND-CSS-V4-EXPORT': {
    acceptance: 'Export clean HTML with Tailwind utility classes matching scene geometry, colors, and layout.',
    tests: ['tests/engine/codegen/codegen.test.ts']
  },
  'COMPONENTS-DESIGN-SYSTEMS.VARIABLES-COLOR-NUMBER-STRING-BOOLEAN': {
    acceptance: 'Create, edit, and bind COLOR, FLOAT, STRING, and BOOLEAN design variables.',
    tests: ['tests/engine/app/variables-editor.test.ts']
  },
  'COMPONENTS-DESIGN-SYSTEMS.VARIABLE-COLLECTIONS-MODES': {
    acceptance: 'Manage variable collections and mode-specific value overrides (Light/Dark themes).',
    tests: ['tests/engine/app/variables-editor.test.ts']
  },
  'IMPORT-EXPORT.FIG-FILE-IMPORT': {
    acceptance: 'Decode Figma binary .fig files with full Kiwi schema and lossless node conversion.',
    tests: ['tests/engine/editor/clipboard/fixture-roundtrip.test.ts']
  },
  'IMPORT-EXPORT.FIG-FILE-EXPORT': {
    acceptance: 'Encode and compress scene graphs into standard .fig files with symbol definitions.',
    tests: ['tests/engine/editor/clipboard/fixture-roundtrip.test.ts']
  },
  'IMPORT-EXPORT.FIGMA-CLIPBOARD-PASTE': {
    acceptance: 'Decode and reconstruct Kiwi clipboard data copied directly from Figma.',
    tests: ['tests/engine/editor/clipboard/fixture-roundtrip.test.ts']
  },
  'IMPORT-EXPORT.FIGMA-CLIPBOARD-COPY': {
    acceptance: 'Generate Figma-compatible Kiwi clipboard payloads that paste seamlessly into Figma.',
    tests: ['tests/engine/editor/clipboard/fixture-roundtrip.test.ts']
  },
  'IMPORT-EXPORT.COPY-ASSETS-BETWEEN-TOOLS': {
    acceptance: 'Copy and paste assets between design tools using Kiwi binary and HTML payloads.',
    tests: ['tests/engine/editor/clipboard/fixture-roundtrip.test.ts']
  },
  'EFFECTS-PROPERTIES.MULTIPLE-FILLSSTROKES-PER-LAYER': {
    acceptance: 'Render and persist multiple ordered fills and strokes per layer with individual properties.',
    tests: ['tests/engine/canvas/stacked-fills-strokes.test.ts']
  },
  'TEXT-TYPOGRAPHY.RTL-TEXT-SUPPORT': {
    acceptance: 'Support RTL text shaping and bidirectional layout direction with Kiwi serialization.',
    tests: ['tests/engine/kiwi/serialize-fixes/directionality.test.ts']
  },
  'LAYERS-SHAPES.IDENTIFY-MATCHING-OBJECTS': {
    acceptance: 'Select matching layers across the canvas by type, fill, stroke, font, or layer name.',
    tests: ['tests/engine/editor/matching.test.ts']
  },
  'VECTOR-TOOLS.CONVERT-TEXT-TO-PATHS': {
    acceptance: 'Extract glyph outline commands and convert text runs into vector paths.',
    tests: ['tests/engine/editor/clipboard/text-outlines.test.ts']
  },
  'COLOR-GRADIENTS-IMAGES.EYEDROPPER-TOOL': {
    acceptance: 'Sample colors from canvas and apply to selected layers fill or stroke.',
    tests: ['tests/engine/editor/eyedropper.test.ts']
  },
  'COMPONENTS-DESIGN-SYSTEMS.COMPONENT-PROPERTIES': {
    acceptance: 'Define and override Boolean, Text, Instance-swap, and Variant component properties.',
    tests: [
      'tests/engine/editor/components/variant-overrides.test.ts',
      'tests/engine/editor/components/component-properties.test.ts'
    ]
  },
  'COLLABORATION-DEV-MODE.COMMENTS-PIN-THREAD-RESOLVE': {
    acceptance: 'Place pinned canvas comments with message threads, replies, and resolution status.',
    tests: ['tests/engine/app/creative-notes.test.ts']
  },
  'TEXT-TYPOGRAPHY.FONT-LOADING-SYSTEM-FONTS': {
    acceptance: 'Enumerate local system fonts, cache font binaries, and manage fallback font assets.',
    tests: ['tests/engine/app/font-settings.test.ts']
  },
  'VECTOR-TOOLS.SIMPLIFY-PATH': {
    acceptance: 'Simplify vector networks and reduce vertex count with Ramer-Douglas-Peucker reduction.',
    tests: ['tests/engine/vector/simplify.test.ts']
  },
  'INTERFACE-NAVIGATION.CUSTOM-FILE-THUMBNAILS': {
    acceptance: 'Set canvas frames as document cover thumbnails with centered scale raster export.',
    tests: ['tests/engine/editor/thumbnail.test.ts']
  },
  'COLLABORATION-DEV-MODE.CURSOR-CHAT': {
    acceptance: 'Broadcast and display ephemeral cursor chat messages across multiplayer peers.',
    tests: ['tests/engine/collab/cursor-chat.test.ts']
  },
  'VECTOR-TOOLS.CONVERT-STROKES-TO-PATHS': {
    acceptance: 'Expand stroke weight of vector segments into a filled VectorNetwork using parallel offsets.',
    tests: ['tests/engine/vector/offset-outline.test.ts']
  },
  'VECTOR-TOOLS.OFFSET-PATH': {
    acceptance: 'Inset or outset a vector network path by a given distance using vertex normal averaging.',
    tests: ['tests/engine/vector/offset-outline.test.ts']
  },
  'COMPONENTS-DESIGN-SYSTEMS.STYLES': {
    acceptance: 'Create, update, retrieve and serialize named paint, text, and effect style presets.',
    tests: ['tests/engine/scene-graph/named-styles.test.ts']
  },
  'IMPORT-EXPORT.VERSION-HISTORY': {
    acceptance: 'Snapshot scene graph state into named versions and restore prior versions with up to 50 entries.',
    tests: ['tests/engine/scene-graph/version-history.test.ts']
  },
  'TEXT-TYPOGRAPHY.OPENTYPE-FEATURES': {
    acceptance: 'Apply OpenType feature flags (ligatures, tabular numbers, stylistic sets) to selected text nodes.',
    tests: ['tests/engine/editor/mixed-selection.test.ts']
  },
  'TEXT-TYPOGRAPHY.VARIABLE-FONTS': {
    acceptance: 'Apply variable font axis values (wght, wdth, slnt) to selected text nodes.',
    tests: ['tests/engine/editor/mixed-selection.test.ts']
  },
  'COLOR-GRADIENTS-IMAGES.IMAGE-PROPERTY-ADJUSTMENT': {
    acceptance: 'Apply exposure, contrast, saturation, hue, brightness filters to image fills with undo.',
    tests: ['tests/engine/editor/mixed-selection.test.ts']
  },
  'COLOR-GRADIENTS-IMAGES.MIXED-SELECTION-COLOR-EDITING': {
    acceptance: 'Set uniform fill color across heterogeneous multi-node selection in one operation.',
    tests: ['tests/engine/editor/mixed-selection.test.ts']
  }
}
