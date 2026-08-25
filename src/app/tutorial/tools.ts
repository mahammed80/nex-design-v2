import type { Tool } from '@nex-design/core/editor'
import type { NodeType } from '@nex-design/core/scene-graph'

export type ToolTutorialCompletion =
  | { kind: 'create'; nodeType: NodeType }
  | { kind: 'move' }
  | { kind: 'pan' }

export interface ToolTutorialStep {
  tool: Tool
  title: string
  description: string
  task: string
  completion: ToolTutorialCompletion
}

export const TOOL_TUTORIAL_STEPS: ToolTutorialStep[] = [
  {
    tool: 'SELECT',
    title: 'Move tool',
    description: 'Select layers and reposition them without changing their shape.',
    task: 'Select an existing object, then drag it to a new position.',
    completion: { kind: 'move' }
  },
  {
    tool: 'FRAME',
    title: 'Frame tool',
    description: 'Frames are containers for screens, components, and auto-layout content.',
    task: 'Drag on the canvas to create a frame.',
    completion: { kind: 'create', nodeType: 'FRAME' }
  },
  {
    tool: 'SECTION',
    title: 'Section tool',
    description: 'Sections organize related work without clipping their contents.',
    task: 'Drag around an area of the canvas to create a section.',
    completion: { kind: 'create', nodeType: 'SECTION' }
  },
  {
    tool: 'RECTANGLE',
    title: 'Rectangle tool',
    description: 'Rectangles are the foundation of cards, buttons, fields, and surfaces.',
    task: 'Drag on the canvas to create a rectangle.',
    completion: { kind: 'create', nodeType: 'RECTANGLE' }
  },
  {
    tool: 'ELLIPSE',
    title: 'Ellipse tool',
    description: 'Use ellipses for circles, avatars, indicators, and decorative shapes.',
    task: 'Drag on the canvas to create an ellipse.',
    completion: { kind: 'create', nodeType: 'ELLIPSE' }
  },
  {
    tool: 'LINE',
    title: 'Line tool',
    description: 'Lines create dividers, connectors, and simple strokes.',
    task: 'Drag between two points to create a line.',
    completion: { kind: 'create', nodeType: 'LINE' }
  },
  {
    tool: 'POLYGON',
    title: 'Polygon tool',
    description: 'Polygons create triangles and other multi-sided shapes.',
    task: 'Drag on the canvas to create a polygon.',
    completion: { kind: 'create', nodeType: 'POLYGON' }
  },
  {
    tool: 'STAR',
    title: 'Star tool',
    description: 'Stars are useful for ratings, badges, and decorative accents.',
    task: 'Drag on the canvas to create a star.',
    completion: { kind: 'create', nodeType: 'STAR' }
  },
  {
    tool: 'PEN',
    title: 'Pen tool',
    description: 'The pen builds custom vector paths point by point.',
    task: 'Click at least two canvas points, then finish the path.',
    completion: { kind: 'create', nodeType: 'VECTOR' }
  },
  {
    tool: 'TEXT',
    title: 'Text tool',
    description: 'Add editable labels, headings, and body copy.',
    task: 'Click the canvas and type a short label.',
    completion: { kind: 'create', nodeType: 'TEXT' }
  },
  {
    tool: 'HAND',
    title: 'Hand tool',
    description: 'Pan around the canvas without moving any design layers.',
    task: 'Drag the canvas to move the viewport.',
    completion: { kind: 'pan' }
  }
]

export function tutorialTargetSelector(tool: Tool): string {
  const key = tool.toLowerCase()
  return `[data-test-id="toolbar-tool-${key}"], [data-test-id="mobile-toolbar-tool-${key}"], [data-test-id="toolbar-flyout-${tool === 'SECTION' || tool === 'FRAME' ? 'frame' : 'rectangle'}"]`
}
