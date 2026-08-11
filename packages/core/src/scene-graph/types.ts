import type { PrototypeConnection } from '#core/prototype/types'
import type { Color, Matrix, Vector } from '#core/types'

export interface SceneGraphEvents {
  'node:created': (node: SceneNode) => void
  'node:updated': (id: string, changes: Partial<SceneNode>) => void
  'node:deleted': (id: string) => void
  'node:reparented': (nodeId: string, oldParentId: string | null, newParentId: string) => void
  'node:reordered': (nodeId: string, parentId: string, index: number) => void
}

export type SceneGraphEventHandlers = Partial<{
  created: (node: SceneNode) => void
  updated: (id: string, changes: Partial<SceneNode>) => void
  deleted: (id: string) => void
  reparented: (nodeId: string, oldParentId: string | null, newParentId: string) => void
  reordered: (nodeId: string, parentId: string, index: number) => void
}>

export type DocumentColorSpace = 'srgb' | 'display-p3'

export type HandleMirroring = 'NONE' | 'ANGLE' | 'ANGLE_AND_LENGTH'
export type WindingRule = 'NONZERO' | 'EVENODD'

export interface VectorVertex {
  x: number
  y: number
  strokeCap?: string
  strokeJoin?: string
  cornerRadius?: number
  handleMirroring?: HandleMirroring
}

export interface VectorSegment {
  start: number
  end: number
  tangentStart: Vector
  tangentEnd: Vector
}

export interface VectorRegion {
  windingRule: WindingRule
  loops: number[][]
}

export interface VectorNetwork {
  vertices: VectorVertex[]
  segments: VectorSegment[]
  regions: VectorRegion[]
}

export interface GeometryPath {
  windingRule: WindingRule
  commandsBlob: Uint8Array
}

export type NodeType =
  | 'CANVAS'
  | 'FRAME'
  | 'RECTANGLE'
  | 'ROUNDED_RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'STAR'
  | 'POLYGON'
  | 'VECTOR'
  | 'GROUP'
  | 'SECTION'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'CONNECTOR'
  | 'SHAPE_WITH_TEXT'
  | 'BOOLEAN_OPERATION'

export type FillType =
  | 'SOLID'
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'
  | 'IMAGE'
export type BlendMode =
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY'
  | 'PASS_THROUGH'
export type ImageScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE'

export interface GradientStop {
  color: Color
  position: number
}

export type GradientTransform = Matrix

export interface BgRemovalSettings {
  enabled?: boolean
  targetColor?: [number, number, number] // [r, g, b] in [0, 1]
  hueThreshold?: number // 0 to 1
  satThreshold?: number // 0 to 1
  valThreshold?: number // 0 to 1
  edgeSmoothness?: number // 0 to 1
  erodeRadius?: number // 0 to 2
  dilateRadius?: number // 0 to 2
}

export interface BlendSettings {
  enabled?: boolean
  mode?: string // darken, multiply, color-burn, linear-burn, lighten, screen, color-dodge, linear-dodge, overlay, soft-light, hard-light, vivid-light, difference, exclusion, subtract, divide, hue, saturation, color, luminosity
  color?: [number, number, number] // [r, g, b] in [0, 1]
  opacity?: number // 0 to 1
}

export interface ImageFilters {
  brightness?: number // -1.0 to 1.0 (default 0)
  contrast?: number // -1.0 to 1.0 (default 0)
  exposure?: number // -1.0 to 1.0 (default 0)
  highlights?: number // -1.0 to 1.0 (default 0)
  shadows?: number // -1.0 to 1.0 (default 0)
  whites?: number // -1.0 to 1.0 (default 0)
  blacks?: number // -1.0 to 1.0 (default 0)
  gamma?: number // -1.0 to 1.0 (default 0)
  // Color Correction
  hue?: number
  saturation?: number
  vibrance?: number
  temperature?: number
  tint?: number

  // CMYK Adjustments
  cyan?: number
  magenta?: number
  yellow?: number
  key?: number

  bgRemoval?: BgRemovalSettings
  blend?: BlendSettings
  lumaThresholdEnabled?: boolean
  lumaThreshold?: number // 0 to 1
  lumaTolerance?: number // 0 to 1

  pointsR?: [number, number][] // list of [x, y] coordinates, sorted by x
  pointsG?: [number, number][]
  pointsB?: [number, number][]
}

export interface Fill {
  type: FillType
  color: Color
  opacity: number
  visible: boolean
  blendMode?: BlendMode
  gradientStops?: GradientStop[]
  gradientTransform?: GradientTransform
  imageHash?: string
  imageScaleMode?: ImageScaleMode
  imageTransform?: GradientTransform
  filters?: ImageFilters
}

export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL'
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND'
export type MaskType = 'ALPHA' | 'VECTOR' | 'LUMINANCE'

export interface Stroke {
  color: Color
  weight: number
  opacity: number
  visible: boolean
  align: 'INSIDE' | 'CENTER' | 'OUTSIDE'
  cap?: StrokeCap
  join?: StrokeJoin
  dashPattern?: number[]
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR' | 'FOREGROUND_BLUR'
  color: Color
  offset: Vector
  radius: number
  spread: number
  visible: boolean
  blendMode?: BlendMode
}

export type ConstraintType = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
export type TextAutoResize = 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE'
export type TextAlignVertical = 'TOP' | 'CENTER' | 'BOTTOM'
export type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'
export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
export type TextDirection = 'AUTO' | 'LTR' | 'RTL'
export type LayoutDirection = 'AUTO' | 'LTR' | 'RTL'

export interface OpenTypeFeatures {
  kerning?: boolean
  ligatures?: boolean
  hinting?: boolean
  [tag: string]: boolean | number | string | undefined
}

export interface CharacterStyleOverride {
  fontWeight?: number
  italic?: boolean
  textDecoration?: TextDecoration
  fontSize?: number
  fontFamily?: string
  letterSpacing?: number
  wordSpacing?: number
  lineHeight?: number | null
  fills?: Fill[]
  textCase?: TextCase
  baselineShift?: number
  superscript?: boolean
  subscript?: boolean
  openTypeFeatures?: OpenTypeFeatures
}

export interface StyleRun {
  start: number
  length: number
  style: CharacterStyleOverride
}

export interface ArcData {
  startingAngle: number
  endingAngle: number
  innerRadius: number
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'
export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL'

export type GridTrackSizing = 'FIXED' | 'FR' | 'AUTO'

export interface GridTrack {
  sizing: GridTrackSizing
  value: number
}

export interface GridPosition {
  column: number
  row: number
  columnSpan: number
  rowSpan: number
}
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
export type LayoutCounterAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE'
export type LayoutAlignSelf = 'AUTO' | 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE'
export type LayoutWrap = 'NO_WRAP' | 'WRAP'

export interface PluginDataEntry {
  pluginId: string
  key: string
  value: string
}

export interface PluginRelaunchDataEntry {
  pluginId: string
  command: string
  message: string
  isDeleted: boolean
}

export interface SceneNode {
  id: string
  type: NodeType
  name: string
  parentId: string | null
  childIds: string[]

  x: number
  y: number
  width: number
  height: number
  rotation: number
  figmaDerivedLayout: { x?: number; y?: number; width?: number; height?: number } | null

  fills: Fill[]
  strokes: Stroke[]
  effects: Effect[]
  opacity: number

  cornerRadius: number
  topLeftRadius: number
  topRightRadius: number
  bottomRightRadius: number
  bottomLeftRadius: number
  independentCorners: boolean
  cornerSmoothing: number

  visible: boolean
  locked: boolean
  clipsContent: boolean

  blendMode: BlendMode
  booleanOperation?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'

  text: string
  fontSize: number
  fontFamily: string
  fontWeight: number
  italic: boolean
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textDirection: TextDirection
  textAlignVertical: TextAlignVertical
  textAutoResize: TextAutoResize
  textCase: TextCase
  textDecoration: TextDecoration
  lineHeight: number | null
  letterSpacing: number
  wordSpacing: number
  paragraphSpacing: number
  listStyle: 'NONE' | 'UNORDERED' | 'ORDERED'
  baselineShift: number
  openTypeFeatures: OpenTypeFeatures
  maxLines: number | null

  styleRuns: StyleRun[]

  horizontalConstraint: ConstraintType
  verticalConstraint: ConstraintType

  layoutMode: LayoutMode
  layoutDirection: LayoutDirection
  layoutWrap: LayoutWrap
  primaryAxisAlign: LayoutAlign
  counterAxisAlign: LayoutCounterAlign
  primaryAxisSizing: LayoutSizing
  counterAxisSizing: LayoutSizing
  itemSpacing: number
  counterAxisSpacing: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number

  layoutPositioning: 'AUTO' | 'ABSOLUTE'
  layoutGrow: number
  layoutAlignSelf: LayoutAlignSelf

  vectorNetwork: VectorNetwork | null
  fillGeometry: GeometryPath[]
  strokeGeometry: GeometryPath[]

  arcData: ArcData | null

  strokeCap: StrokeCap
  strokeJoin: StrokeJoin
  dashPattern: number[]

  borderTopWeight: number
  borderRightWeight: number
  borderBottomWeight: number
  borderLeftWeight: number
  independentStrokeWeights: boolean

  strokeMiterLimit: number

  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null

  isMask: boolean
  maskType: MaskType

  gridTemplateColumns: GridTrack[]
  gridTemplateRows: GridTrack[]
  gridColumnGap: number
  gridRowGap: number
  gridPosition: GridPosition | null

  counterAxisAlignContent: 'AUTO' | 'SPACE_BETWEEN'
  itemReverseZIndex: boolean
  strokesIncludedInLayout: boolean

  expanded: boolean
  textTruncation: 'DISABLED' | 'ENDING'
  autoRename: boolean

  pointCount: number
  starInnerRadius: number

  componentId: string | null
  overrides: Record<string, unknown>
  componentPropertyDefinitions: ComponentPropertyDefinition[]
  componentPropertyValues: Record<string, string>

  boundVariables: Record<string, string>

  pluginData: PluginDataEntry[]
  pluginRelaunchData: PluginRelaunchDataEntry[]

  internalOnly: boolean

  flipX: boolean
  flipY: boolean

  textPicture: Uint8Array | null
  layoutGrids?: LayoutGrid[]

  reactions?: Reaction[]
  prototypeStartNodeId?: string | null
  prototypeFlows?: PrototypeFlow[]
  prototypeConnections?: PrototypeConnection[]
}

export type TriggerType =
  | 'ON_CLICK'
  | 'ON_HOVER'
  | 'ON_PRESS'
  | 'MOUSE_ENTER'
  | 'MOUSE_LEAVE'
  | 'MOUSE_DOWN'
  | 'MOUSE_UP'
  | 'AFTER_DELAY'

export type ActionType =
  | 'BACK'
  | 'CLOSE'
  | 'NAVIGATE'
  | 'URL'
  | 'OPEN_OVERLAY'
  | 'SWAP_OVERLAY'
  | 'CHANGE_TO'
  | 'SET_VARIABLE'
  | 'SCROLL_TO'

export type TransitionType =
  | 'INSTANT'
  | 'DISSOLVE'
  | 'SMART'
  | 'MOVE_IN'
  | 'MOVE_OUT'
  | 'PUSH'
  | 'SLIDE_IN'
  | 'SLIDE_OUT'

export type EasingType = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_AND_OUT' | 'BOUNCE' | 'SPRING'

export interface Transition {
  type: TransitionType
  duration: number // in ms
  easing: EasingType
  direction?: string
}

export interface OverlaySettings {
  position?: 'CENTER' | 'TOP_CENTER' | 'BOTTOM_CENTER' | 'MANUAL'
  backdrop?: boolean
  backdropOpacity?: number
  closeOnOutsideClick?: boolean
}

export interface Action {
  type: ActionType
  destinationId?: string // node ID for NAVIGATE, OPEN_OVERLAY, SWAP_OVERLAY, SCROLL_TO
  url?: string // URL for URL action
  transition?: Transition
  variantProperties?: Record<string, string> // for CHANGE_TO (Component state transition)
  variableId?: string // for SET_VARIABLE
  variableValue?: unknown // for SET_VARIABLE
  overlay?: OverlaySettings
}

export interface Trigger {
  type: TriggerType
  delay?: number // delay in ms for AFTER_DELAY
}

export interface Reaction {
  trigger: Trigger
  actions: Action[]
}

export interface PrototypeFlow {
  name: string
  startNodeId: string
}

export type ComponentPropertyType = 'VARIANT' | 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP'

export interface ComponentPropertyDefinition {
  id: string
  name: string
  type: ComponentPropertyType
  defaultValue: string
  variantOptions?: string[]
}

export type VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
export type VariableValue = Color | number | string | boolean | { aliasId: string }

export interface Variable {
  id: string
  name: string
  type: VariableType
  collectionId: string
  valuesByMode: Record<string, VariableValue>
  description: string
  hiddenFromPublishing: boolean
}

export interface VariableCollectionMode {
  modeId: string
  name: string
}

export interface VariableCollection {
  id: string
  name: string
  modes: VariableCollectionMode[]
  defaultModeId: string
  variableIds: string[]
}

export interface LayoutGrid {
  id: string
  pattern: 'COLUMNS' | 'ROWS' | 'GRID'
  sectionSize?: number
  visible: boolean
  color: Color
  alignment: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH'
  count: number
  gutterSize: number
  width?: number
  height?: number
  offset: number
}
