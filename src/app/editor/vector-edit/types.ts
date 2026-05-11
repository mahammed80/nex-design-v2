import type { EditorState } from '@nex-design/core/editor'
import type {
  VectorNetwork,
  VectorRegion,
  VectorSegment,
  VectorVertex
} from '@nex-design/core/scene-graph'
import type { Rect } from '@nex-design/core/types'

export type NodeEditState = {
  nodeId: string
  origNetwork: VectorNetwork
  origBounds: Rect
  vertices: VectorVertex[]
  segments: VectorSegment[]
  regions: VectorRegion[]
  selectedVertexIndices: Set<number>
  draggedHandleInfo: {
    vertexIndex: number
    handleType: 'tangentStart' | 'tangentEnd'
    segmentIndex: number
  } | null
  selectedHandles: Set<string>
  hoveredHandleInfo: {
    segmentIndex: number
    tangentField: 'tangentStart' | 'tangentEnd'
  } | null
}

export type VectorEditState = EditorState & { nodeEditState: NodeEditState | null }

export type HandleInfo = {
  segmentIndex: number
  tangentField: 'tangentStart' | 'tangentEnd'
  neighborIndex: number
}
