import type { VectorRegion, VectorVertex } from '#core/scene-graph'
import type { SnapGuide } from '#core/scene-graph/snap'
import type { TextEditor } from '#core/text/editor'
import type { Color, Rect, Vector } from '#core/types'

export interface RulerTheme {
  background: Color
  tick: Color
  text: Color
  label: Color
}

export interface RenderOverlays {
  mode?: 'DESIGN' | 'PROTOTYPE' | 'DEVELOPER'
  prototypeDragLine?: {
    startX: number
    startY: number
    endX: number
    endY: number
    hoveredNodeId?: string | null
    hoveredSide?: import('#core/prototype').ConnectionSide | null
  } | null
  prototypeReconnectDrag?: {
    connectionId: string
    endpoint: 'source' | 'target'
    currentX: number
    currentY: number
    hoveredNodeId: string | null
    hoveredSide: import('#core/prototype').ConnectionSide | null
  } | null
  hoveredNodeId?: string | null
  enteredContainerId?: string | null
  editingTextId?: string | null
  textEditor?: TextEditor | null
  marquee?: Rect | null
  snapGuides?: SnapGuide[]
  rotationPreview?: { nodeId: string; angle: number } | null
  dropTargetId?: string | null
  layoutInsertIndicator?: {
    x: number
    y: number
    length: number
    direction: 'HORIZONTAL' | 'VERTICAL'
  } | null
  penState?: {
    vertices: Vector[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    dragTangent: Vector | null
    oppositeDragTangent?: Vector | null
    closingToFirst: boolean
    pendingClose?: boolean
    cursorX?: number
    cursorY?: number
  } | null
  nodeEditState?: {
    nodeId: string
    vertices: VectorVertex[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    regions: VectorRegion[]
    selectedVertexIndices: Set<number>
    /** Set of selected handles as "segIdx:tangentField" strings */
    selectedHandles?: Set<string>
    hoveredHandleInfo?: { segmentIndex: number; tangentField: 'tangentStart' | 'tangentEnd' } | null
  } | null
  remoteCursors?: Array<{
    name: string
    color: Color
    x: number
    y: number
    selection?: string[]
  }>
  fontPreviewActive?: boolean
  guides?: import('#core/editor/types').Guide[]
  selectedGuideId?: string | null
  guidesVisible?: boolean
}
