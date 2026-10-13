# Figma Feature Matrix

Feature-by-feature comparison of Figma Design capabilities with Nex Design's current implementation status.

::: tip Status Legend
✅ Supported — implementation exists end-to-end · 🧪 Verified — supported with current parity evidence · 🟡 Partial — core behavior exists, some sub-features missing · 🔲 Not yet implemented
:::

**Coverage:** 146 of 153 Figma feature items addressed — 58 ✅ supported, 69 🧪 verified, 19 🟡 partial, 7 🔲 not yet.

## Interface & Navigation

| Feature                          | Status | Notes                                                                                                                                                                                                                                                           |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolbar with design tools        | ✅     | Bottom toolbar (UI3 style): Select, Frame, Section, Rectangle, Ellipse, Line, Text, Hand, Pen                                                                                                                                                                   |
| Layers panel (left sidebar)      | ✅     | Tree view with expand/collapse, drag reorder, visibility toggle; resizable width                                                                                                                                                                                |
| Pages panel                      | ✅     | Add, delete, rename pages; per-page viewport state                                                                                                                                                                                                              |
| Properties panel (right sidebar) | ✅     | Sections: Appearance, Fill, Stroke, Effects, Typography, Layout, Position; resizable width                                                                                                                                                                      |
| Zoom & pan                       | ✅     | <kbd>Ctrl</kbd> + scroll, pinch, <kbd>⌘</kbd><kbd>+</kbd> / <kbd>⌘</kbd><kbd>−</kbd> / <kbd>⌘</kbd><kbd>0</kbd> (100%) / <kbd>⌘</kbd><kbd>1</kbd> (fit) / <kbd>⌘</kbd><kbd>2</kbd> (selection), <kbd>Space</kbd> + drag, middle mouse, hand tool (<kbd>H</kbd>) |
| Canvas rulers                    | ✅     | Top/left rulers with selection highlight bands and coordinate badges                                                                                                                                                                                            |
| Canvas background color          | ✅     | Per-page background via properties panel                                                                                                                                                                                                                        |
| Canvas guides                    | 🧪     | Drag horizontal/vertical guides from rulers, reposition or delete them, snap layers to them, undo/redo changes, and preserve per-page guides through `.fig` save/reopen                                                                                         |
| Actions menu / command palette   | ✅     | Fuzzy search for actions, menu commands, tools, themes, exports via <kbd>⌘</kbd><kbd>K</kbd> or <kbd>⌘</kbd><kbd>/</kbd>                                                                                                                                      |
| Context menu                     | ✅     | Right-click with clipboard, z-order, grouping, component, visibility, lock, move-to-page actions                                                                                                                                                                |
| Keyboard shortcuts               | 🟡     | Core shortcuts + components + z-order + visibility/lock implemented; Scale, Arrow, Pencil, flip, text formatting not yet wired                                                                                                                                  |
| Find and replace                 | ✅     | Global find and replace for text content and layer names with match-case and undo support (<kbd>⌘</kbd><kbd>F</kbd>)                                                                                                                                           |
| Layer outlines view              | ✅     | Outline-only CanvasKit view for all visible layers, including vector paths                                                                                                                                                                                      |
| Custom file thumbnails           | 🧪     | Set frame as document cover thumbnail with centered scale rendering and .fig export support                                                                                                   |
| Nudge value settings             | 🧪     | Configurable small and big nudge values in editor state with arrow key stepping                                                                                                                                                                                 |
| App menu (browser mode)          | ✅     | File, Edit, View, Object, Text, Arrange menus; Tauri uses native menus                                                                                                                                                                                          |
| AI tools                         | 🟡     | 90 tools via OpenRouter + MCP server; no AI-generated images or AI-powered search yet                                                                                                                                                                           |

## Layers & Shapes

| Feature                                               | Status | Notes                                                                                                                                                                         |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape tools (Rectangle, Ellipse, Line, Polygon, Star) | ✅     | All basic shape types; polygon side count and star inner radius configurable                                                                                                  |
| Frames                                                | ✅     | Clip content, independent coordinate system                                                                                                                                   |
| Groups                                                | ✅     | <kbd>⌘</kbd><kbd>G</kbd> to group, <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> to ungroup                                                                                            |
| Sections                                              | ✅     | Title pills, auto-adopt overlapping nodes, luminance-adaptive text                                                                                                            |
| Arc tool (arcs, semi-circles, rings)                  | ✅     | arcData with start/end angle and inner radius                                                                                                                                 |
| Pencil (freehand) tool                                | 🧪     | Freehand vector stroke drawing with round caps and joins (<kbd>⇧</kbd><kbd>P</kbd>)                                                                                            |
| Masks                                                 | 🧪     | Shape and alpha layer masks for clipping sibling layers in frames and groups (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>M</kbd>)                                                           |
| Layer types & hierarchy                               | ✅     | 17 node types, flat Map + parent-child tree                                                                                                                                   |
| Select layers                                         | ✅     | Click, shift-click, marquee selection                                                                                                                                         |
| Alignment & position                                  | ✅     | Position, rotation, dimensions in properties panel                                                                                                                            |
| Copy & paste objects                                  | ✅     | Standard clipboard + Figma Kiwi binary format; Copy as text/SVG/PNG/JSX                                                                                                       |
| Scale layers proportionally                           | 🧪     | Shift-resize constrains proportions and dedicated Scale tool (<kbd>K</kbd>) proportionally scales geometry, strokes, text font size, and corner radii |
| Lock & unlock layers                                  | ✅     | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> toggles lock; locked nodes can't be selected/moved from canvas                                                                           |
| Toggle layer visibility                               | ✅     | Eye icon in layers panel + <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> keyboard shortcut                                                                                             |
| Rename layers                                         | ✅     | Double-click inline rename in layers panel; <kbd>Enter</kbd>/<kbd>Escape</kbd>/blur to commit                                                                                 |
| Bring to front / Send to back                         | ✅     | ] and [ keyboard shortcuts; also in context menu                                                                                                                              |
| Move to page                                          | ✅     | Move selected nodes between pages via context menu                                                                                                                            |
| Constraints (responsive resize)                       | 🧪     | Horizontal & Vertical child constraints (Left, Right, Stretch, Center, Scale) applied during parent frame resize                                                             |
| Smart selection (distribute/align)                    | 🧪     | Evenly space and align multi-selection (horizontal, vertical, tidy up) with full undo/redo transactions                                                                       |
| Layout guides (columns, rows, grid)                   | 🧪     | Column, Row, and Grid overlay guides on frames with count, gutter, offset, and stretch/center/min/max alignments                                                                |
| Measure distances between layers                      | 🧪     | Alt-hover multi-edge distance lines and Dev Mode measurement overlays with bounding projections and badges                                                                     |
| Edit objects in bulk                                  | ✅     | Multi-selection properties panel: edit position, size, appearance, fill, stroke, effects across multiple nodes; shared values display normally, differing values show "Mixed" |
| Identify matching objects                             | 🧪     | Select similar layers across page by Type, Fill color, Stroke, Font, or Name                                                                                                  |
| Copy/paste properties                                 | 🧪     | Copy/paste fill, stroke, effects, corner radii, opacity, and typography properties via <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> / <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> with undo/redo |
| Parent-child relationships                            | ✅     | Full hierarchy with parentIndex, reparenting via drag                                                                                                                         |

## Vector Tools

| Feature                                                  | Status | Notes                                                                       |
| -------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Vector networks                                          | ✅     | Figma-compatible model, not simple paths                                    |
| Pen tool                                                 | ✅     | Corner points, bezier curves, open/closed paths                             |
| Edit vector layers                                       | 🟡     | Creation works; advanced vertex editing (bend, delete points, join) limited |
| Boolean operations (Union, Subtract, Intersect, Exclude) | 🧪     | Non-destructive Boolean operations with Union, Subtract, Intersect, Exclude containers and full undo/redo |
| Flatten layers                                           | 🟡     | Single-path flattening works; complex multi-path fidelity remains           |
| Convert strokes to paths                                 | 🧪     | `outlineStrokeNetwork()` expands each segment into a parallel-sided filled VectorNetwork |
| Convert text to paths                                    | 🧪     | Flatten text runs and extract glyph outline commands into vector paths      |
| Shape builder tool                                       | 🔲     | Interactive boolean tool                                                    |
| Offset path                                              | 🧪     | `offsetVectorNetwork(network, amount)` insets or outsets using averaged vertex normals |
| Simplify path                                            | 🧪     | Ramer-Douglas-Peucker vertex reduction preserving curve topology and sharp corners |

## Text & Typography

| Feature                                | Status | Notes                                                                                                                                                                                                   |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text tool & inline editing             | ✅     | Canvas-native editing, phantom textarea, cursor/selection/word select, drag to select, double/triple-click, rich text style runs (<kbd>⌘</kbd><kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>, **S** button) |
| Text rendering (Paragraph API)         | ✅     | CanvasKit Paragraph for shaping, line-breaking, metrics                                                                                                                                                 |
| Font loading (system fonts)            | 🧪     | Inter default, font-kit in Tauri with OnceLock cache + preloading, queryLocalFonts in browser                                                                                                           |
| Font family & weight                   | ✅     | FontPicker with virtual scroll, search, CSS preview; weight selection in properties panel                                                                                                               |
| Font size & line height                | ✅     | Editable in typography section                                                                                                                                                                          |
| Text alignment                         | ✅     | Horizontal (Left, Center, Right, Justified) and Vertical (Top, Center, Bottom) alignment with Paragraph API                                                                                             |
| Text styles                            | 🟡     | Per-selection bold/italic/underline/strikethrough (<kbd>⌘</kbd><kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>, **S** button); not yet reusable named text style presets                                     |
| Text resizing modes (auto, fixed, hug) | 🧪     | Auto-Width (WIDTH_AND_HEIGHT), Auto-Height (HEIGHT), and Fixed-Size (NONE with truncation) text modes                                                                                                  |
| Bulleted & numbered lists              | 🧪     | Unordered (bulleted) and ordered (numbered) list formatting in text nodes                                                                                               |
| Links in text                          | 🧪     | Inline URL hyperlinks within text character style runs                                                                                                                  |
| Emojis & smart symbols                 | 🟡     | CanvasKit Paragraph renders Unicode emoji via fallback fonts; no explicit emoji picker                                                                                  |
| OpenType features                      | 🧪     | `applyOpenTypeFeaturesSelected()` sets ligature/tabular/stylistic flags; `OpenTypeFeatures` type stored in node and style runs                                          |
| Variable fonts                         | 🧪     | `applyVariableFontAxesSelected()` sets wght/wdth/slnt axis values stored as openTypeFeatures numeric entries                                                            |
| CJK text support                       | 🟡     | CanvasKit Paragraph renders CJK via system fonts; no explicit CJK font picker or vertical text flow                                                                     |
| RTL text support                       | 🧪     | Right-to-left text shaping (Arabic, Hebrew) with bidirectional layout and .fig serialization                                                                            |
| Icon fonts                             | 🟡     | Iconify API client in `@nex-design/core/icons`; icon glyphs rendered via CanvasKit text layer with custom font family                                                   |

## Color, Gradients & Images

| Feature                           | Status | Notes                                                                |
| --------------------------------- | ------ | -------------------------------------------------------------------- |
| Color picker (HSV)                | ✅     | HSV square, hue slider, alpha slider, hex input                      |
| Solid fills                       | ✅     | Hex color with opacity                                               |
| Linear gradient                   | ✅     | Gradient stops, transform handles                                    |
| Radial gradient                   | ✅     | Rendered via CanvasKit shaders                                       |
| Angular gradient                  | ✅     | Sweep/conic gradient support                                         |
| Diamond gradient                  | ✅     | Four-point diamond gradient                                          |
| Image fills                       | ✅     | Decoded from blob data with scale modes (fill, fit, crop, tile)      |
| Pattern fills                     | 🟡     | TILE image scale mode renders repeating fills; no custom pattern editor     |
| Blend modes                       | 🧪     | Layer and fill blend modes (multiply, screen, overlay, darken, lighten, etc.) mapped to Skia BlendMode shaders |
| Add images & videos               | 🟡     | Image fills rendered; no drag-and-drop image import or video support |
| Image property adjustment         | 🧪     | `applyImageFiltersToSelected()` sets exposure, contrast, saturation, hue, brightness, shadows, highlights with undo |
| Crop an image                     | 🟡     | `imageScaleMode: 'CROP'` + `imageTransform` stores crop state; no interactive crop handle UI yet |
| Eyedropper tool                   | 🧪     | Eyedropper tool (<kbd>I</kbd>) samples canvas colors and applies them to selected fill or stroke |
| Mixed selection color editing     | 🧪     | `setFillColorForSelection()` applies a uniform solid fill color across heterogeneous multi-node selection |
| Color models (RGB, HSL, HSB, Hex) | 🟡     | HSV + Hex in picker; no HSL or RGB mode toggle                       |

## Effects & Properties

| Feature                            | Status | Notes                                                                     |
| ---------------------------------- | ------ | ------------------------------------------------------------------------- |
| Drop shadow                        | ✅     | Offset, blur radius, color via CanvasKit filters                          |
| Inner shadow                       | ✅     | Inset shadow effect                                                       |
| Layer blur                         | ✅     | Gaussian blur on layer                                                    |
| Background blur                    | ✅     | Blur content behind layer                                                 |
| Foreground blur                    | ✅     | Blur in foreground                                                        |
| Stroke weight                      | ✅     | Configurable in properties panel                                          |
| Stroke cap (round, square, arrow)  | ✅     | `NONE`, `ROUND`, `SQUARE`, `ARROW_LINES`, `ARROW_EQUILATERAL`             |
| Stroke join (miter, bevel, round)  | ✅     | All three join types                                                      |
| Dash patterns                      | ✅     | Dash-on/dash-off stroke pattern                                           |
| Stroke alignment                   | ✅     | Inside/Center/Outside with clip-based rendering matching Figma behavior   |
| Individual stroke weights per side | ✅     | Top/Right/Bottom/Left with side selector dropdown                         |
| Corner radius                      | ✅     | Uniform and per-corner radius with independent toggle in properties panel |
| Multiple fills/strokes per layer   | 🧪     | Ordered stacked fills and strokes with individual opacity, visibility, and alignments |

## Auto Layout

| Feature                                       | Status | Notes                                                   |
| --------------------------------------------- | ------ | ------------------------------------------------------- |
| Horizontal & vertical flow                    | ✅     | Yoga WASM flexbox engine                                |
| Toggle auto layout (<kbd>⇧</kbd><kbd>A</kbd>) | ✅     | Toggle on frame or wrap selection                       |
| Gap (spacing between children)                | ✅     | Configurable in properties panel                        |
| Padding (uniform & per-side)                  | ✅     | All four sides independently                            |
| Justify content                               | 🧪     | Start, center, end, space-between alignment             |
| Align items                                   | 🧪     | Start, center, end, stretch alignment                   |
| Child sizing (fixed, fill, hug)               | 🧪     | Per-child sizing modes (Fixed, Fill, Hug)               |
| Wrap                                          | 🧪     | Flex wrap for multi-line layout                         |
| Grid auto layout flow                         | 🧪     | CSS Grid via Yoga fork — column/row tracks, gaps, spans |
| Combined flows (nested)                       | 🧪     | Nested auto-layout frames with different directions     |
| Drag reorder within auto layout               | ✅     | Visual insertion indicator                              |
| Min/max width and height                      | 🧪     | Inspector controls and Yoga enforcement for both axes   |

## Components & Design Systems

| Feature                                    | Status | Notes                                                                                                                                   |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Create components                          | 🟡     | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> creates from frame/group or wraps selection; no component properties UI yet                        |
| Component sets                             | ✅     | Creation, canvas treatment, variant definitions, property editing, and insertion                                                        |
| Component instances                        | ✅     | Creation, live sync, override reset, detach, and go-to-main controls                                                                    |
| Variants                                   | ✅     | Creation, property management, switching, override preservation, and undo/redo                                                          |
| Component properties                       | 🧪     | Boolean toggles, Text properties, Instance-swap slots, and Variant definitions on components |
| Override propagation                       | ✅     | Changes to main component propagate to all instances; overrides preserved                                                               |
| Variables (color, number, string, boolean) | 🧪     | `COLOR`, `FLOAT`, `STRING`, and `BOOLEAN` variables with editing and binding UI |
| Variable collections & modes               | 🧪     | Collections, modes (Light/Dark), default mode, and value overrides by mode |
| Styles (color, text, effect, layout)       | 🧪     | `NamedStyleRegistry` stores `PaintStylePreset`, `TextStylePreset`, `EffectStylePreset` with toJSON/fromJSON round-trip |
| Libraries (publish, share, update)         | 🟡     | Style registry serializes to JSON for cross-document sharing; no live publish/subscribe UI yet                          |
| Detach instance                            | ✅     | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> converts instance back to frame                                                                    |
| Go to main component                       | ✅     | Navigate to source component, cross-page                                                                                                |

## Prototyping

| Feature                                   | Status | Notes                                                                  |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Prototype connections                     | ✅     | Canvas handles, reconnect/delete, Bézier controls, edge snapping, and .fig round-trip |
| Triggers (click, hover, drag, etc.)       | 🧪     | Click, hover, press, enter/leave, mouse down/up, drag, and delay triggers |
| Actions (navigate, overlay, scroll, etc.) | 🧪     | Navigate, back, close, overlay, scroll, change-to, and preview-local set-variable |
| Animations & transitions                  | 🧪     | Instant, dissolve, duration, and easing; directional push/slide/move need a direction picker |
| Smart animate                             | 🟡     | Fade-and-scale approximation; layer matching and interruption remain   |
| Overlays                                  | 🟡     | Open, swap, and close; position settings and overlay stacking remain   |
| Scroll & overflow behavior                | 🟡     | Scroll-to works; nested scrolling and position preservation remain     |
| Prototype flows                           | 🟡     | Starting points work; named multi-flow management remains              |
| Variables in prototypes                   | 🟡     | Variable assignment works; conditions and expressions remain           |
| Easing & spring animations                | ✅     | Linear, ease-in/out, combined ease, and spring presets                 |
| Present & play prototypes                 | 🧪     | Graph-driven presentation player with start-frame selection            |

## Import & Export

| Feature                   | Status | Notes                                                                                                                                                     |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| .fig file import          | 🧪     | Full Kiwi codec: 194 definitions, ~390 fields per `NodeChange` with lossless round-trip                                                                    |
| .fig file export          | 🧪     | Kiwi encoding + Zstd compression + thumbnail generation; `COMPONENT`/COMPONENT_SET mapped to `SYMBOL` for round-trip                                      |
| Save / Save As            | ✅     | <kbd>⌘</kbd><kbd>S</kbd> / <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>; native dialogs (Tauri), File System Access API (Chrome/Edge), download fallback (Safari) |
| Figma clipboard (paste)   | 🧪     | Decode Kiwi binary from Figma clipboard with full property fidelity                                                                                       |
| Figma clipboard (copy)    | 🧪     | Encode Kiwi binary that Figma can read with exact scene hierarchy                                                                                         |
| Sketch file import        | 🔲     | .sketch file parsing                                                                                                                                      |
| Image/SVG/PDF export      | ✅     | PNG, JPG, WEBP, SVG, and vector PDF export                                                                                                                |
| Version history           | 🧪     | `VersionHistory` takes named snapshots and restores prior scene graph states with up to 50 versions                                                        |
| Copy assets between tools | 🧪     | Figma clipboard (Kiwi binary), Copy as text/SVG/PNG/JSX                                                                                                   |

## Plugin API & Scripting

| Feature                            | Status | Notes                                                                                  |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Eval command with Figma Plugin API | ✅     | Headless JavaScript execution with figma global object matching Figma's plugin surface |

## Collaboration & Dev Mode

| Feature                         | Status | Notes                                                                                                       |
| Comments (pin, thread, resolve) | 🧪     | Pinned canvas notes and comments with thread replies, sorting, and resolution status                        |
| Cursor chat                     | 🧪     | Ephemeral cursor chat bubbles (<kbd>/</kbd>) broadcast over WebRTC awareness with peer attribution |
| Branching & merging             | 🔲     | Version branches for design files                                                                           |
| Dev Mode (inspect)              | 🧪     | Box model, dimensions, colors, typography, framework code, and asset export                                 |
| Code Connect                    | 🔲     | Link design components to code                                                                              |
| Code snippets                   | 🧪     | Copyable Tailwind, CSS, React, Vue, Flutter, and SwiftUI output                                             |
| Tailwind CSS v4 export          | 🧪     | Export as HTML with Tailwind utility classes from Code panel, CLI, or programmatically                      |
| Figma for VS Code               | 🔲     | Editor plugin integration                                                                                   |
| MCP server                      | ✅     | Stdio + HTTP transports backed by shared core and extended tool registries                                  |
| CLI tools                       | ✅     | Headless CLI: info, tree, find, export, analyze, node, pages, variables, eval; MCP server with stdio + HTTP |

## Figma Draw

| Feature            | Status | Notes                                     |
| ------------------ | ------ | ----------------------------------------- |
| Illustration tools | 🔲     | Figma Draw's specialized drawing tools    |
| Pattern transforms | 🔲     | Create repeating patterns with transforms |
