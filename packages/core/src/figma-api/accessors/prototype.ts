import {
  graph,
  nodeId,
  raw,
  type NodeProxyInternals,
  type ProxyThis
} from '#core/figma-api/accessor-utils'
import { PrototypeGraph, syncConnectionsFromReactions } from '#core/prototype'
import type { Reaction } from '#core/scene-graph'

/**
 * `node.reactions` (read-only, like Figma) and `node.setReactionsAsync()`. Writing reactions
 * re-syncs the page's prototype connections so the canvas noodles match.
 */
export function installPrototypeNodeProxyAccessors(
  prototype: object,
  internals: NodeProxyInternals
): void {
  Object.defineProperties(prototype, {
    reactions: {
      get(this: ProxyThis): readonly Reaction[] {
        return Object.freeze(structuredClone(raw(this, internals).reactions ?? []))
      }
    },
    setReactionsAsync: {
      value(this: ProxyThis, reactions: readonly Reaction[]): Promise<void> {
        const sceneGraph = graph(this, internals)
        const id = nodeId(this, internals)
        sceneGraph.updateNode(id, { reactions: structuredClone([...reactions]) })
        const pageId = PrototypeGraph.pageIdForNode(sceneGraph, id)
        if (pageId) syncConnectionsFromReactions(sceneGraph, pageId)
        return Promise.resolve()
      }
    }
  })
}
