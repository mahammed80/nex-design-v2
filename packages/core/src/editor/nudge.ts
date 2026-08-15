import type { Vector } from '#core/types'

import { collectNodePositions, pushPositionUndo } from './history/position'
import type { EditorContext } from './types'

const NUDGE_COMMIT_DELAY = 300

export function createNudgeActions(ctx: EditorContext) {
  let nudgeOriginals: Map<string, Vector> | null = null
  let nudgeFinals: Map<string, Vector> | null = null
  let nudgeCommitTimer: ReturnType<typeof setTimeout> | null = null

  function commitNudge() {
    if (!nudgeOriginals) return
    nudgeOriginals = null
    nudgeFinals = null
    nudgeCommitTimer = null
  }

  function nudgeSelected(dx: number, dy: number) {
    const ids = [...ctx.state.selectedIds]
    if (ids.length === 0) return

    const movable: string[] = []
    for (const id of ids) {
      const node = ctx.graph.getNode(id)
      if (node && !node.locked) movable.push(id)
    }
    if (movable.length === 0) return

    const startsSequence = !nudgeOriginals
    let startedOriginals: Map<string, Vector> | null = null
    if (startsSequence) {
      startedOriginals = new Map()
      for (const id of movable) {
        const node = ctx.graph.getNode(id)
        if (node) startedOriginals.set(id, { x: node.x, y: node.y })
      }
      nudgeOriginals = startedOriginals
    }

    for (const id of movable) {
      const node = ctx.graph.getNode(id)
      if (!node) continue
      ctx.graph.updateNode(id, { x: node.x + dx, y: node.y + dy })
      ctx.runLayoutForNode(id)
    }

    if (startedOriginals) {
      nudgeFinals = collectNodePositions(ctx, startedOriginals.keys())
      pushPositionUndo(ctx, 'Nudge', startedOriginals, nudgeFinals)
    } else if (nudgeFinals) {
      const current = collectNodePositions(ctx, nudgeFinals.keys())
      for (const [id, position] of current) nudgeFinals.set(id, position)
    }

    if (nudgeCommitTimer) clearTimeout(nudgeCommitTimer)
    nudgeCommitTimer = setTimeout(commitNudge, NUDGE_COMMIT_DELAY)

    ctx.requestRender()
  }

  function flushNudge() {
    if (nudgeCommitTimer) {
      clearTimeout(nudgeCommitTimer)
      commitNudge()
    }
  }

  return { nudgeSelected, flushNudge }
}
