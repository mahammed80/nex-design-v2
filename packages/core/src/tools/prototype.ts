import { PrototypeGraph, syncConnectionsFromReactions } from '#core/prototype'
import type {
  Action,
  Reaction,
  SceneGraph,
  TransitionDirection,
  TransitionType,
  TriggerType
} from '#core/scene-graph'
import { defineTool } from '#core/tools/schema'

const TRIGGERS: readonly TriggerType[] = [
  'ON_CLICK',
  'ON_HOVER',
  'ON_PRESS',
  'MOUSE_ENTER',
  'MOUSE_LEAVE',
  'MOUSE_DOWN',
  'MOUSE_UP',
  'AFTER_DELAY',
  'ON_DRAG',
  'ON_KEY_DOWN'
]
const TRANSITIONS: readonly TransitionType[] = [
  'INSTANT',
  'DISSOLVE',
  'SMART',
  'MOVE_IN',
  'MOVE_OUT',
  'PUSH',
  'SLIDE_IN',
  'SLIDE_OUT'
]
const DIRECTIONS: readonly TransitionDirection[] = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM']

function isTrigger(value: string): value is TriggerType {
  return (TRIGGERS as readonly string[]).includes(value)
}
function isTransition(value: string): value is TransitionType {
  return (TRANSITIONS as readonly string[]).includes(value)
}
function isDirection(value: string): value is TransitionDirection {
  return (DIRECTIONS as readonly string[]).includes(value)
}

function syncPage(graph: SceneGraph, nodeId: string) {
  const pageId = PrototypeGraph.pageIdForNode(graph, nodeId)
  if (pageId) syncConnectionsFromReactions(graph, pageId)
}

/** Reject destinations that don't exist so the agent gets an actionable error. */
function missingDestinations(graph: SceneGraph, reactions: Reaction[]): string[] {
  return reactions
    .flatMap((reaction) => reaction.actions)
    .map((action) => action.destinationId)
    .filter((id): id is string => !!id && !graph.getNode(id))
}

export const listReactions = defineTool({
  name: 'list_reactions',
  description:
    'List prototype interactions (reactions) on a node and its descendants, plus the page flows and default start frame. Read-only.',
  params: { id: { type: 'string', description: 'Root node ID. Defaults to the current page.' } },
  execute: (figma, args) => {
    const rootId = args.id ?? figma.currentPageId
    const root = figma.graph.getNode(rootId)
    if (!root) return { error: `Node not found: ${rootId}` }
    const interactions: Array<{ nodeId: string; name: string; reactions: Reaction[] }> = []
    const visit = (nodeId: string) => {
      const node = figma.graph.getNode(nodeId)
      if (!node) return
      if (node.reactions?.length) {
        interactions.push({ nodeId: node.id, name: node.name, reactions: node.reactions })
      }
      for (const childId of node.childIds) visit(childId)
    }
    visit(root.id)
    const pageId =
      root.type === 'CANVAS' ? root.id : PrototypeGraph.pageIdForNode(figma.graph, root.id)
    const page = pageId ? figma.graph.getNode(pageId) : undefined
    return {
      interactions,
      flows: page?.prototypeFlows ?? [],
      startNodeId: page?.prototypeStartNodeId ?? null
    }
  }
})

export const setReactions = defineTool({
  name: 'set_reactions',
  mutates: true,
  description:
    'Replace all prototype interactions on a node. `reactions` is a JSON array of { trigger: { type, delay?, direction?, keys? }, actions: [{ type, destinationId?, url?, transition?: { type, duration, easing, direction? }, overlay? }] }. Pass [] to clear.',
  params: {
    id: { type: 'string', description: 'Node ID', required: true },
    reactions: { type: 'string', description: 'JSON array of reactions', required: true }
  },
  execute: (figma, args) => {
    if (!figma.graph.getNode(args.id)) return { error: `Node not found: ${args.id}` }
    let reactions: Reaction[]
    try {
      const parsed: unknown = JSON.parse(args.reactions)
      if (!Array.isArray(parsed)) return { error: 'reactions must be a JSON array' }
      reactions = parsed as Reaction[]
    } catch (error) {
      return { error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` }
    }
    for (const reaction of reactions) {
      if (!reaction?.trigger || !isTrigger(String(reaction.trigger.type))) {
        return { error: `Unknown trigger type: ${String(reaction?.trigger?.type)}` }
      }
      if (!Array.isArray(reaction.actions) || reaction.actions.length === 0) {
        return { error: 'Every reaction needs at least one action' }
      }
    }
    const missing = missingDestinations(figma.graph, reactions)
    if (missing.length > 0) return { error: `Destination not found: ${missing.join(', ')}` }
    figma.graph.updateNode(args.id, { reactions: structuredClone(reactions) })
    syncPage(figma.graph, args.id)
    return { id: args.id, count: reactions.length }
  }
})

export const addNavigation = defineTool({
  name: 'add_navigation',
  mutates: true,
  description:
    'Add a prototype interaction that navigates from a layer to a frame, e.g. a button that pushes in the next screen.',
  params: {
    id: { type: 'string', description: 'Source node ID (hotspot)', required: true },
    destination_id: { type: 'string', description: 'Destination frame ID', required: true },
    trigger: { type: 'string', description: `Trigger (default ON_CLICK): ${TRIGGERS.join(', ')}` },
    transition: {
      type: 'string',
      description: `Animation (default INSTANT): ${TRANSITIONS.join(', ')}`
    },
    direction: { type: 'string', description: 'For PUSH/SLIDE/MOVE: LEFT, RIGHT, TOP, BOTTOM' },
    duration: { type: 'number', description: 'Animation duration in ms (default 300)' },
    overlay: { type: 'boolean', description: 'Open the destination as an overlay instead' }
  },
  execute: (figma, args) => {
    const source = figma.graph.getNode(args.id)
    if (!source) return { error: `Node not found: ${args.id}` }
    if (!figma.graph.getNode(args.destination_id)) {
      return { error: `Destination not found: ${args.destination_id}` }
    }
    const trigger = args.trigger ?? 'ON_CLICK'
    const transition = args.transition ?? 'INSTANT'
    if (!isTrigger(trigger)) return { error: `Unknown trigger: ${trigger}` }
    if (!isTransition(transition)) return { error: `Unknown transition: ${transition}` }
    if (args.direction && !isDirection(args.direction)) {
      return { error: `Unknown direction: ${args.direction}` }
    }
    const action: Action = {
      type: args.overlay ? 'OPEN_OVERLAY' : 'NAVIGATE',
      destinationId: args.destination_id,
      transition: {
        type: transition,
        duration: args.duration ?? 300,
        easing: 'EASE_OUT',
        ...(args.direction && isDirection(args.direction) ? { direction: args.direction } : {})
      },
      ...(args.overlay
        ? { overlay: { position: 'CENTER', backdrop: true, closeOnOutsideClick: true } }
        : {})
    }
    const reactions = [
      ...(source.reactions ?? []),
      { trigger: { type: trigger }, actions: [action] }
    ]
    figma.graph.updateNode(source.id, { reactions })
    syncPage(figma.graph, source.id)
    return { id: source.id, reactions: reactions.length }
  }
})

export const setFlowStart = defineTool({
  name: 'set_flow_start',
  mutates: true,
  description:
    'Mark a top-level frame as a named prototype flow starting point (and optionally the default start when pressing Play), or remove it.',
  params: {
    id: { type: 'string', description: 'Top-level frame ID', required: true },
    name: { type: 'string', description: 'Flow name (defaults to the frame name)' },
    default: { type: 'boolean', description: 'Also make it the default start frame' },
    remove: { type: 'boolean', description: 'Remove the flow instead' }
  },
  execute: (figma, args) => {
    const frame = figma.graph.getNode(args.id)
    const page = frame?.parentId ? figma.graph.getNode(frame.parentId) : undefined
    if (!frame || page?.type !== 'CANVAS') return { error: `${args.id} is not a top-level frame` }
    const others = (page.prototypeFlows ?? []).filter((flow) => flow.startNodeId !== frame.id)
    const flows = args.remove
      ? others
      : [...others, { name: args.name ?? frame.name, startNodeId: frame.id }]
    figma.graph.updateNode(page.id, {
      prototypeFlows: flows,
      ...(args.default ? { prototypeStartNodeId: frame.id } : {}),
      ...(args.remove && page.prototypeStartNodeId === frame.id
        ? { prototypeStartNodeId: null }
        : {})
    })
    return { pageId: page.id, flows }
  }
})
