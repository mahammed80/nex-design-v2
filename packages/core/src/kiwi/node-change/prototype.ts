import type { GUID, NodeChange, PluginData } from '#core/kiwi/binary/codec'
import { syncConnectionsFromReactions } from '#core/prototype/sync'
import type { PrototypeConnection } from '#core/prototype/types'
import type {
  Action,
  ActionType,
  EasingType,
  OverlaySettings,
  Reaction,
  SceneGraph,
  SceneNode,
  Transition,
  TransitionType,
  TriggerType
} from '#core/scene-graph'
import type { Vector } from '#core/types'

import { guidToString } from './guid'
import { getNexDesignPluginValue, NEX_DESIGN_PLUGIN_ID } from './plugin-data'

/**
 * Prototype interactions ↔ Kiwi `PrototypeInteraction` (schema.ts `PrototypeInteraction`,
 * `PrototypeEvent`, `PrototypeAction`). Everything Figma can represent is written to native
 * fields so files round-trip with Figma; fields Figma has no slot for (drag direction,
 * overlay backdrop, CHANGE_TO variant props, SET_VARIABLE value) go to nex-design pluginData.
 * Kiwi stores durations/timeouts in seconds, the scene graph in milliseconds.
 */

export const PROTOTYPE_EXTRAS_PLUGIN_KEY = 'prototypeReactionExtras'
export const PROTOTYPE_CONNECTIONS_PLUGIN_KEY = 'prototypeConnections'

type Direction = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM'
const DIRECTIONS: Direction[] = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM']
const DEFAULT_DIRECTION: Direction = 'LEFT'
const MS_PER_SECOND = 1000
const DEFAULT_DURATION_MS = 300

export interface KiwiPrototypeEvent {
  interactionType?: string
  interactionMaintained?: boolean
  transitionTimeout?: number
}

export interface KiwiPrototypeAction {
  transitionNodeID?: GUID
  transitionType?: string
  transitionDuration?: number
  easingType?: string
  transitionShouldSmartAnimate?: boolean
  connectionType?: string
  connectionURL?: string
  overlayRelativePosition?: Vector
  navigationType?: string
  targetVariableID?: GUID
  transitionPreserveScroll?: boolean
  easingFunction?: number[]
  extraScrollOffset?: Vector
}

export interface KiwiPrototypeInteraction {
  event?: KiwiPrototypeEvent
  actions?: KiwiPrototypeAction[]
  isDeleted?: boolean
}

interface ActionExtras {
  variantProperties?: Record<string, string>
  variableValue?: unknown
  overlay?: OverlaySettings
}

interface ReactionExtras {
  dragDirection?: Reaction['trigger']['direction']
  /** `KeyboardEvent.code` values; Figma's numeric keyCodes aren't mapped. */
  keys?: string[]
  actions: ActionExtras[]
}

const TRIGGER_TO_KIWI: Record<TriggerType, string> = {
  ON_CLICK: 'ON_CLICK',
  ON_HOVER: 'ON_HOVER',
  ON_PRESS: 'ON_PRESS',
  MOUSE_ENTER: 'MOUSE_IN',
  MOUSE_LEAVE: 'MOUSE_OUT',
  MOUSE_DOWN: 'MOUSE_DOWN',
  MOUSE_UP: 'MOUSE_UP',
  AFTER_DELAY: 'AFTER_TIMEOUT',
  ON_DRAG: 'DRAG',
  ON_KEY_DOWN: 'ON_KEY_DOWN'
}
const TRIGGER_FROM_KIWI = invert(TRIGGER_TO_KIWI)

const EASING_TO_KIWI: Record<EasingType, string> = {
  LINEAR: 'LINEAR',
  EASE_IN: 'IN_CUBIC',
  EASE_OUT: 'OUT_CUBIC',
  EASE_IN_AND_OUT: 'INOUT_CUBIC',
  BOUNCE: 'OUT_BACK_CUBIC',
  SPRING: 'SPRING',
  CUSTOM_CUBIC: 'CUSTOM_CUBIC',
  CUSTOM_SPRING: 'CUSTOM_SPRING'
}
const EASING_FROM_KIWI: Record<string, EasingType> = {
  ...invert(EASING_TO_KIWI),
  IN_BACK_CUBIC: 'EASE_IN',
  INOUT_BACK_CUBIC: 'EASE_IN_AND_OUT',
  CUSTOM_CUBIC: 'CUSTOM_CUBIC',
  GENTLE_SPRING: 'SPRING',
  CUSTOM_SPRING: 'CUSTOM_SPRING',
  SPRING_PRESET_ONE: 'SPRING',
  SPRING_PRESET_TWO: 'SPRING',
  SPRING_PRESET_THREE: 'SPRING'
}

/** Directional transitions: scene-graph type → kiwi enum prefix. */
const DIRECTIONAL_PREFIX: Partial<Record<TransitionType, string>> = {
  PUSH: 'PUSH_FROM_',
  SLIDE_IN: 'SLIDE_FROM_',
  SLIDE_OUT: 'SLIDE_OUT_TO_',
  MOVE_IN: 'MOVE_FROM_',
  MOVE_OUT: 'MOVE_OUT_TO_'
}

const NAVIGATION_TO_KIWI: Partial<Record<ActionType, string>> = {
  NAVIGATE: 'NAVIGATE',
  OPEN_OVERLAY: 'OVERLAY',
  SWAP_OVERLAY: 'SWAP',
  CHANGE_TO: 'SWAP_STATE',
  SCROLL_TO: 'SCROLL_TO'
}
const NAVIGATION_FROM_KIWI = invert(NAVIGATION_TO_KIWI)

const CONNECTION_TO_KIWI: Partial<Record<ActionType, string>> = {
  BACK: 'BACK',
  CLOSE: 'CLOSE',
  URL: 'URL',
  SET_VARIABLE: 'SET_VARIABLE'
}
const CONNECTION_FROM_KIWI = invert(CONNECTION_TO_KIWI)

function invert<K extends string, V extends string>(map: Partial<Record<K, V>>): Record<string, K> {
  const result: Record<string, K> = {}
  for (const [key, value] of Object.entries(map) as Array<[K, V]>) result[value] = key
  return result
}

function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (DIRECTIONS as string[]).includes(value)
}

function transitionTypeToKiwi(transition: Transition): string {
  const prefix = DIRECTIONAL_PREFIX[transition.type]
  if (prefix) {
    const direction = isDirection(transition.direction) ? transition.direction : DEFAULT_DIRECTION
    return `${prefix}${direction}`
  }
  if (transition.type === 'SMART') return 'SMART_ANIMATE'
  if (transition.type === 'DISSOLVE') return 'DISSOLVE'
  return 'INSTANT_TRANSITION'
}

function transitionTypeFromKiwi(
  kiwiType: string | undefined
): Pick<Transition, 'type' | 'direction'> {
  if (!kiwiType) return { type: 'INSTANT' }
  if (kiwiType === 'SMART_ANIMATE' || kiwiType === 'MAGIC_MOVE') return { type: 'SMART' }
  if (kiwiType === 'DISSOLVE' || kiwiType === 'FADE') return { type: 'DISSOLVE' }
  for (const [type, prefix] of Object.entries(DIRECTIONAL_PREFIX) as Array<
    [TransitionType, string]
  >) {
    const direction = kiwiType.startsWith(prefix) ? kiwiType.slice(prefix.length) : null
    if (isDirection(direction)) return { type, direction }
  }
  return { type: 'INSTANT' }
}

function actionToKiwi(
  action: Action,
  resolveNode: (id: string) => GUID | undefined,
  resolveVariable: (id: string) => GUID | undefined
): KiwiPrototypeAction {
  const result: KiwiPrototypeAction = {}
  const navigationType = NAVIGATION_TO_KIWI[action.type]
  if (navigationType) {
    result.connectionType = 'INTERNAL_NODE'
    result.navigationType = navigationType
    const destination = action.destinationId ? resolveNode(action.destinationId) : undefined
    if (destination) result.transitionNodeID = destination
  } else {
    result.connectionType = CONNECTION_TO_KIWI[action.type] ?? 'NONE'
  }
  if (action.type === 'URL' && action.url) result.connectionURL = action.url
  if (action.overlay?.position === 'MANUAL' && action.overlay.offset) {
    result.overlayRelativePosition = { x: action.overlay.offset.x, y: action.overlay.offset.y }
  }
  if (action.type === 'SET_VARIABLE' && action.variableId) {
    const variable = resolveVariable(action.variableId)
    if (variable) result.targetVariableID = variable
  }
  if (action.preserveScrollPosition) result.transitionPreserveScroll = true
  if (action.scrollOffset) result.extraScrollOffset = { ...action.scrollOffset }
  if (action.transition) {
    result.transitionType = transitionTypeToKiwi(action.transition)
    result.transitionDuration = action.transition.duration / MS_PER_SECOND
    result.easingType = EASING_TO_KIWI[action.transition.easing]
    if (action.transition.easingFunction?.length) {
      result.easingFunction = [...action.transition.easingFunction]
    }
    if (action.transition.type === 'SMART') result.transitionShouldSmartAnimate = true
  }
  return result
}

function applyKiwiActionFields(action: Action, kiwi: KiwiPrototypeAction): void {
  if (kiwi.transitionNodeID) action.destinationId = guidToString(kiwi.transitionNodeID)
  if (kiwi.connectionURL) action.url = kiwi.connectionURL
  if (kiwi.targetVariableID) action.variableId = guidToString(kiwi.targetVariableID)
  if (kiwi.transitionPreserveScroll) action.preserveScrollPosition = true
  if (kiwi.extraScrollOffset) action.scrollOffset = { ...kiwi.extraScrollOffset }
}

function actionFromKiwi(kiwi: KiwiPrototypeAction): Action | null {
  const type =
    kiwi.connectionType === 'INTERNAL_NODE'
      ? NAVIGATION_FROM_KIWI[kiwi.navigationType ?? 'NAVIGATE']
      : CONNECTION_FROM_KIWI[kiwi.connectionType ?? '']
  if (!type) return null

  const action: Action = { type }
  applyKiwiActionFields(action, kiwi)
  if (kiwi.overlayRelativePosition && (type === 'OPEN_OVERLAY' || type === 'SWAP_OVERLAY')) {
    action.overlay = { position: 'MANUAL', offset: { ...kiwi.overlayRelativePosition } }
  }
  if (kiwi.transitionType || kiwi.transitionDuration !== undefined) {
    const { type: transitionType, direction } = transitionTypeFromKiwi(
      kiwi.transitionShouldSmartAnimate ? 'SMART_ANIMATE' : kiwi.transitionType
    )
    action.transition = {
      type: transitionType,
      duration:
        kiwi.transitionDuration !== undefined
          ? Math.round(kiwi.transitionDuration * MS_PER_SECOND)
          : DEFAULT_DURATION_MS,
      easing: EASING_FROM_KIWI[kiwi.easingType ?? ''] ?? 'EASE_OUT',
      ...(direction ? { direction } : {}),
      ...(kiwi.easingFunction?.length ? { easingFunction: [...kiwi.easingFunction] } : {})
    }
  }
  return action
}

export function reactionsToKiwi(
  reactions: Reaction[],
  resolveNode: (id: string) => GUID | undefined,
  resolveVariable: (id: string) => GUID | undefined
): KiwiPrototypeInteraction[] {
  return reactions.map((reaction) => {
    const event: KiwiPrototypeEvent = { interactionType: TRIGGER_TO_KIWI[reaction.trigger.type] }
    if (reaction.trigger.type === 'AFTER_DELAY') {
      event.transitionTimeout = (reaction.trigger.delay ?? 0) / MS_PER_SECOND
    }
    return {
      event,
      actions: reaction.actions.map((action) => actionToKiwi(action, resolveNode, resolveVariable))
    }
  })
}

export function kiwiToReactions(interactions: KiwiPrototypeInteraction[]): Reaction[] {
  const reactions: Reaction[] = []
  for (const interaction of interactions) {
    if (interaction.isDeleted) continue
    const type = TRIGGER_FROM_KIWI[interaction.event?.interactionType ?? 'ON_CLICK']
    if (!type) continue
    const trigger: Reaction['trigger'] = { type }
    if (type === 'AFTER_DELAY') {
      trigger.delay = Math.round((interaction.event?.transitionTimeout ?? 0) * MS_PER_SECOND)
    }
    const actions = (interaction.actions ?? [])
      .map(actionFromKiwi)
      .filter((action): action is Action => action !== null)
    if (actions.length > 0) reactions.push({ trigger, actions })
  }
  return reactions
}

/** Fields that have no native Kiwi slot, aligned by reaction/action index. */
export function reactionExtras(reactions: Reaction[]): ReactionExtras[] | null {
  let hasExtras = false
  const extras = reactions.map((reaction) => {
    const entry: ReactionExtras = {
      actions: reaction.actions.map((action) => {
        const actionExtras: ActionExtras = {}
        if (action.variantProperties) actionExtras.variantProperties = action.variantProperties
        if (action.variableValue !== undefined) actionExtras.variableValue = action.variableValue
        if (action.overlay) actionExtras.overlay = action.overlay
        if (Object.keys(actionExtras).length > 0) hasExtras = true
        return actionExtras
      })
    }
    if (reaction.trigger.direction) {
      entry.dragDirection = reaction.trigger.direction
      hasExtras = true
    }
    if (reaction.trigger.keys?.length) {
      entry.keys = reaction.trigger.keys
      hasExtras = true
    }
    return entry
  })
  return hasExtras ? extras : null
}

/** Merge pluginData extras back into decoded reactions when the shapes still line up. */
export function applyReactionExtras(reactions: Reaction[], raw: string | null): Reaction[] {
  if (!raw) return reactions
  let extras: ReactionExtras[]
  try {
    extras = JSON.parse(raw) as ReactionExtras[]
  } catch {
    return reactions
  }
  if (!Array.isArray(extras) || extras.length !== reactions.length) return reactions
  return reactions.map((reaction, i) => {
    const entry = extras[i]
    if (entry.actions.length !== reaction.actions.length) return reaction
    return {
      trigger: {
        ...reaction.trigger,
        ...(entry.dragDirection ? { direction: entry.dragDirection } : {}),
        ...(entry.keys?.length ? { keys: entry.keys } : {})
      },
      actions: reaction.actions.map((action, j) => ({ ...action, ...entry.actions[j] }))
    }
  })
}

/** Replace (not append) a nex-design pluginData entry on an outgoing node change. */
export function setNodeChangePluginData(nc: NodeChange, key: string, value: string | null): void {
  const entries = (nc.pluginData ?? []).filter(
    (entry: PluginData) => !(entry.pluginID === NEX_DESIGN_PLUGIN_ID && entry.key === key)
  )
  if (value !== null) entries.push({ pluginID: NEX_DESIGN_PLUGIN_ID, key, value })
  nc.pluginData = entries
}

function remapConnections(
  connections: PrototypeConnection[],
  remap: (id: string) => string | undefined
): PrototypeConnection[] {
  const result: PrototypeConnection[] = []
  for (const connection of connections) {
    const sourceNodeId = remap(connection.sourceNodeId)
    const targetNodeId = remap(connection.targetNodeId)
    if (sourceNodeId && targetNodeId) result.push({ ...connection, sourceNodeId, targetNodeId })
  }
  return result
}

/**
 * Write prototype data into already-built node changes. Runs after every node has a GUID so
 * cross-frame and cross-page destinations resolve.
 */
export function writePrototypeNodeChanges(
  graph: SceneGraph,
  nodeChanges: NodeChange[],
  pageGuids: Map<string, GUID>,
  nodeIdToGuid: Map<string, GUID>,
  varIdToGuid: Map<string, GUID>
): void {
  const ncByGuid = new Map<string, NodeChange>()
  for (const nc of nodeChanges) if (nc.guid) ncByGuid.set(guidToString(nc.guid), nc)
  const ncFor = (nodeId: string) => {
    const guid = nodeIdToGuid.get(nodeId) ?? pageGuids.get(nodeId)
    return guid ? ncByGuid.get(guidToString(guid)) : undefined
  }
  const resolveNode = (id: string) => nodeIdToGuid.get(id)
  const resolveVariable = (id: string) => varIdToGuid.get(id)

  for (const nodeId of nodeIdToGuid.keys()) {
    const node = graph.getNode(nodeId)
    const nc = ncFor(nodeId)
    if (!node || !nc) continue
    if (node.reactions?.length) {
      nc.prototypeInteractions = reactionsToKiwi(node.reactions, resolveNode, resolveVariable)
      const extras = reactionExtras(node.reactions)
      setNodeChangePluginData(
        nc,
        PROTOTYPE_EXTRAS_PLUGIN_KEY,
        extras ? JSON.stringify(extras) : null
      )
    } else if (nc.pluginData) {
      setNodeChangePluginData(nc, PROTOTYPE_EXTRAS_PLUGIN_KEY, null)
    }
  }

  for (const pageId of pageGuids.keys()) {
    const page = graph.getNode(pageId)
    const canvasNc = ncFor(pageId)
    if (page && canvasNc) writePagePrototype(page, canvasNc, ncFor, resolveNode)
  }
}

/** Start node, flows (native `prototypeStartingPoint` on each flow's frame), and connections. */
function writePagePrototype(
  page: SceneNode,
  canvasNc: NodeChange,
  ncFor: (nodeId: string) => NodeChange | undefined,
  resolveNode: (id: string) => GUID | undefined
): void {
  const start = page.prototypeStartNodeId ? resolveNode(page.prototypeStartNodeId) : undefined
  if (start) canvasNc.prototypeStartNodeID = start
  for (const flow of page.prototypeFlows ?? []) {
    const flowNc = ncFor(flow.startNodeId)
    if (!flowNc) continue
    flowNc.prototypeStartingPoint = {
      name: flow.name,
      description: flow.description ?? '',
      position: ''
    }
  }
  const connections = remapConnections(page.prototypeConnections ?? [], (id) => {
    const guid = resolveNode(id)
    return guid ? guidToString(guid) : undefined
  })
  setNodeChangePluginData(
    canvasNc,
    PROTOTYPE_CONNECTIONS_PLUGIN_KEY,
    connections.length > 0 ? JSON.stringify(connections) : null
  )
}

function pageOf(graph: SceneGraph, nodeId: string): SceneNode | undefined {
  let current = graph.getNode(nodeId)
  while (current && current.type !== 'CANVAS') {
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return current
}

function stripPluginKey(node: SceneNode, key: string): void {
  node.pluginData = node.pluginData.filter(
    (entry) => !(entry.pluginId === NEX_DESIGN_PLUGIN_ID && entry.key === key)
  )
}

/** Decode prototype data after all scene nodes exist, remapping Kiwi GUIDs to node ids. */
export function readPrototypeNodeChanges(
  graph: SceneGraph,
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  canvasIdToPageId: Map<string, string>
): void {
  const remap = (id: string) => guidToNodeId.get(id)

  for (const [ncId, nc] of changeMap) {
    const nodeId = guidToNodeId.get(ncId)
    const node = nodeId ? graph.getNode(nodeId) : undefined
    if (!node) continue

    if (Array.isArray(nc.prototypeInteractions)) {
      const decoded = applyReactionExtras(
        kiwiToReactions(nc.prototypeInteractions as KiwiPrototypeInteraction[]),
        getNexDesignPluginValue(nc, PROTOTYPE_EXTRAS_PLUGIN_KEY)
      )
      node.reactions = decoded.map((reaction) => ({
        ...reaction,
        actions: reaction.actions.map((action) => {
          if (!action.destinationId) return action
          const destinationId = remap(action.destinationId)
          return destinationId
            ? { ...action, destinationId }
            : { ...action, destinationId: undefined }
        })
      }))
      stripPluginKey(node, PROTOTYPE_EXTRAS_PLUGIN_KEY)
    }

    const startingPoint = nc.prototypeStartingPoint as
      | { name?: string; description?: string }
      | undefined
    if (startingPoint?.name) {
      const page = pageOf(graph, node.id)
      if (page)
        page.prototypeFlows = [
          ...(page.prototypeFlows ?? []),
          {
            name: startingPoint.name,
            startNodeId: node.id,
            ...(startingPoint.description ? { description: startingPoint.description } : {})
          }
        ]
    }
  }

  for (const [canvasId, pageId] of canvasIdToPageId) {
    const canvasNc = changeMap.get(canvasId)
    const page = graph.getNode(pageId)
    if (!canvasNc || !page) continue
    const start = canvasNc.prototypeStartNodeID as GUID | undefined
    if (start) page.prototypeStartNodeId = remap(guidToString(start)) ?? null
    const rawConnections = getNexDesignPluginValue(canvasNc, PROTOTYPE_CONNECTIONS_PLUGIN_KEY)
    if (rawConnections) {
      try {
        page.prototypeConnections = remapConnections(
          JSON.parse(rawConnections) as PrototypeConnection[],
          remap
        )
      } catch {
        page.prototypeConnections = []
      }
    }
    // Connections live on `prototypeConnections`; don't also keep the serialized copy.
    stripPluginKey(page, PROTOTYPE_CONNECTIONS_PLUGIN_KEY)
    syncConnectionsFromReactions(graph, pageId)
  }
}
