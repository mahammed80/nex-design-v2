import type { Tool } from '@nex-design/core/editor'
import type { PrototypeStateSnapshot } from '@nex-design/core/prototype'
import type { NodeType, SceneNode, VectorNetwork } from '@nex-design/core/scene-graph'
import type { Rect, Vector } from '@nex-design/core/types'

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export type CornerPosition = 'nw' | 'ne' | 'se' | 'sw'

export interface DragDraw {
  type: 'draw'
  startX: number
  startY: number
  nodeId: string
}

export interface DragMove {
  type: 'move'
  startX: number
  startY: number
  currentX: number
  currentY: number
  originals: Map<string, { x: number; y: number; parentId: string }>
  duplicated?: boolean
  duplicatedPreviousSelection?: Set<string>
  autoLayoutParentId?: string
  brokeFromAutoLayout?: boolean
}

export interface DragPan {
  type: 'pan'
  startScreenX: number
  startScreenY: number
  startPanX: number
  startPanY: number
}

export interface DragResize {
  type: 'resize'
  handle: HandlePosition
  startX: number
  startY: number
  origRect: Rect
  nodeId: string
  origVectorNetwork: VectorNetwork | null
  origSubtree: Map<string, SceneNode>
}

export interface DragMarquee {
  type: 'marquee'
  startX: number
  startY: number
}

export interface DragRotate {
  type: 'rotate'
  nodeId: string
  centerX: number
  centerY: number
  startAngle: number
  origRotation: number
}

export interface DragPen {
  type: 'pen-drag'
  startX: number
  startY: number
  modifierMode: 'default' | 'continuous' | 'independent'
  frozenOppositeTangent: Vector | null
  spaceDown: boolean
  spaceStartX: number
  spaceStartY: number
  knotStartX: number
  knotStartY: number
}

export interface DragTextSelect {
  type: 'text-select'
  startX: number
  startY: number
}

export interface DragEditNode {
  type: 'edit-node'
  startX: number
  startY: number
  origPositions: Map<number, Vector>
}

export interface DragEditHandle {
  type: 'edit-handle'
  segmentIndex: number
  tangentField: 'tangentStart' | 'tangentEnd'
  vertexIndex: number
  startX: number
  startY: number
  initialTangent: Vector | null
}

export interface DragBendHandle {
  type: 'bend-handle'
  vertexIndex: number
  startX: number
  startY: number
  lockedMode: 'symmetric' | 'independent' | null
  dragSamples: Vector[]
  targetSegmentIndex: number | null
  targetTangentField: 'tangentStart' | 'tangentEnd' | null
}

export interface DragPrototype {
  type: 'prototype-drag'
  startX: number
  startY: number
  nodeId: string
  side: 'LEFT' | 'RIGHT'
}

export interface DragPrototypeReconnect {
  type: 'prototype-reconnect'
  connectionId: string
  endpoint: 'source' | 'target'
  startX: number
  startY: number
  currentX: number
  currentY: number
  hoveredNodeId?: string | null
  hoveredSide?: 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' | null
}

export interface DragPrototypeControlPoint {
  type: 'prototype-control-point'
  connectionId: string
  controlIndex: number
  startX: number
  startY: number
  origCp1: Vector | null
  origCp2: Vector | null
  beforeSnapshot: PrototypeStateSnapshot
}

export interface DragGuide {
  type: 'guide-drag'
  guideId: string
  axis: 'horizontal' | 'vertical'
  startValue: number
  isNew: boolean
}

export type DragState =
  | DragDraw
  | DragMove
  | DragPan
  | DragResize
  | DragMarquee
  | DragRotate
  | DragPen
  | DragTextSelect
  | DragEditNode
  | DragEditHandle
  | DragBendHandle
  | DragPrototype
  | DragPrototypeReconnect
  | DragPrototypeControlPoint
  | DragGuide

export const TOOL_TO_NODE: Partial<Record<Tool, NodeType>> = {
  FRAME: 'FRAME',
  SECTION: 'SECTION',
  RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  LINE: 'LINE',
  POLYGON: 'POLYGON',
  STAR: 'STAR',
  TEXT: 'TEXT'
}
