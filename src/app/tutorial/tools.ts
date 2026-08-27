import type { Tool } from '@nex-design/core/editor'
import type { NodeType } from '@nex-design/core/scene-graph'

export type ToolTutorialCompletion =
  | { kind: 'create'; nodeType: NodeType }
  | { kind: 'move' }
  | { kind: 'pan' }

export interface ToolTutorialStep {
  tool: Tool
  title: string
  shortcut: string
  description: string
  howTo: string
  task: string
  completion: ToolTutorialCompletion
}

export const TOOL_TUTORIAL_STEPS: ToolTutorialStep[] = [
  {
    tool: 'FRAME',
    title: 'Frame Tool',
    shortcut: 'F',
    description: 'Frames are the master containers in NexDesign — like artboards, phone screens, or component cards.',
    howTo: 'Press F or click the Frame tool, then click & drag anywhere on the canvas to draw a new frame container.',
    task: 'Drag on the canvas to draw your first Frame container.',
    completion: { kind: 'create', nodeType: 'FRAME' }
  },
  {
    tool: 'SELECT',
    title: 'Move Tool',
    shortcut: 'V',
    description: 'Select, drag, resize, and inspect any layer or frame across your design.',
    howTo: 'Press V or select the arrow icon. Click any object on the canvas to select it, or drag it to move.',
    task: 'Click and drag an object or frame on the canvas to reposition it.',
    completion: { kind: 'move' }
  },
  {
    tool: 'RECTANGLE',
    title: 'Rectangle Tool',
    shortcut: 'R',
    description: 'Rectangles are the core building blocks for buttons, cards, modals, and backgrounds.',
    howTo: 'Press R or select Rectangle. Click & drag on the canvas (or inside your frame) to draw a rectangle.',
    task: 'Drag on the canvas to draw a rectangle.',
    completion: { kind: 'create', nodeType: 'RECTANGLE' }
  },
  {
    tool: 'ELLIPSE',
    title: 'Ellipse Tool',
    shortcut: 'O',
    description: 'Create perfect circles, status badges, avatars, and radial glows.',
    howTo: 'Press O or select Ellipse. Hold Shift while dragging to draw a constrained 1:1 perfect circle.',
    task: 'Drag on the canvas to draw an ellipse or circle.',
    completion: { kind: 'create', nodeType: 'ELLIPSE' }
  },
  {
    tool: 'TEXT',
    title: 'Text Tool',
    shortcut: 'T',
    description: 'Add live editable typography with custom Google Fonts, styles, and alignments.',
    howTo: 'Press T or select Text. Click on the canvas and type your title or button label.',
    task: 'Click anywhere on the canvas and type some text.',
    completion: { kind: 'create', nodeType: 'TEXT' }
  },
  {
    tool: 'PEN',
    title: 'Pen Tool',
    shortcut: 'P',
    description: 'Craft custom vector paths, illustrations, bezier curves, and custom icons point-by-point.',
    howTo: 'Press P. Click to place vector points, drag for curves, and press Enter or double-click to finish.',
    task: 'Click at least two canvas points to draw a vector line, then finish.',
    completion: { kind: 'create', nodeType: 'VECTOR' }
  },
  {
    tool: 'LINE',
    title: 'Line Tool',
    shortcut: 'L',
    description: 'Draw clean divider lines, connectors, and decorative borders.',
    howTo: 'Press L. Drag from a start point to an end point. Hold Shift to snap to 0°, 45°, or 90°.',
    task: 'Drag on the canvas to draw a divider line.',
    completion: { kind: 'create', nodeType: 'LINE' }
  },
  {
    tool: 'POLYGON',
    title: 'Polygon Tool',
    shortcut: '',
    description: 'Generate triangles, badges, and geometric multi-sided polygons.',
    howTo: 'Select Polygon from the shapes flyout, then drag on the canvas to create a shape.',
    task: 'Drag on the canvas to draw a polygon.',
    completion: { kind: 'create', nodeType: 'POLYGON' }
  },
  {
    tool: 'STAR',
    title: 'Star Tool',
    shortcut: '',
    description: 'Create star ratings, badges, sparkle indicators, and decorative accents.',
    howTo: 'Select Star from the shape flyout, then drag on the canvas to create a star.',
    task: 'Drag on the canvas to draw a star.',
    completion: { kind: 'create', nodeType: 'STAR' }
  },
  {
    tool: 'SECTION',
    title: 'Section Tool',
    shortcut: 'S',
    description: 'Sections group and organize screens into milestones, user flows, and milestones.',
    howTo: 'Press S or select Section. Drag a large bounding box around multiple frames to organize them.',
    task: 'Drag around an area of the canvas to create an organizational section.',
    completion: { kind: 'create', nodeType: 'SECTION' }
  },
  {
    tool: 'HAND',
    title: 'Hand Tool',
    shortcut: 'H',
    description: 'Pan and navigate across the infinite 2D canvas smoothly without moving design objects.',
    howTo: 'Press H (or hold Spacebar anytime), then click & drag to pan the viewport.',
    task: 'Drag the canvas to move the viewport.',
    completion: { kind: 'pan' }
  }
]

export function tutorialTargetSelector(tool: Tool): string {
  const key = tool.toLowerCase()
  return `[data-test-id="toolbar-tool-${key}"], [data-test-id="mobile-toolbar-tool-${key}"], [data-test-id="toolbar-flyout-${tool === 'SECTION' || tool === 'FRAME' ? 'frame' : 'rectangle'}"]`
}
