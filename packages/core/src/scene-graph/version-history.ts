/**
 * Snapshot-based version history for the scene graph.
 */
import type { SceneGraph } from './index'

export interface VersionSnapshot {
  id: string
  name: string
  description?: string
  timestamp: number
  nodesJson: string
}

export class VersionHistory {
  private snapshots: VersionSnapshot[] = []
  private maxVersions: number

  constructor(maxVersions = 50) {
    this.maxVersions = maxVersions
  }

  snapshot(graph: SceneGraph, name: string, description?: string): VersionSnapshot {
    const id = crypto.randomUUID()
    const nodesJson = JSON.stringify([...graph.nodes.entries()])
    const snap: VersionSnapshot = { id, name, description, timestamp: Date.now(), nodesJson }
    this.snapshots.push(snap)
    if (this.snapshots.length > this.maxVersions) {
      this.snapshots.shift()
    }
    return snap
  }

  getAll(): VersionSnapshot[] {
    return [...this.snapshots].reverse()
  }

  getById(id: string): VersionSnapshot | undefined {
    return this.snapshots.find((s) => s.id === id)
  }

  restore(graph: SceneGraph, id: string): boolean {
    const snap = this.getById(id)
    if (!snap) return false
    const entries = JSON.parse(snap.nodesJson) as [string, unknown][]
    graph.nodes.clear()
    for (const [k, v] of entries) {
      graph.nodes.set(k, v as Parameters<typeof graph.getNode>[8] extends undefined ? never : NonNullable<ReturnType<typeof graph.getNode>>)
    }
    return true
  }

  delete(id: string): boolean {
    const idx = this.snapshots.findIndex((s) => s.id === id)
    if (idx === -1) return false
    this.snapshots.splice(idx, 1)
    return true
  }

  clear(): void {
    this.snapshots = []
  }
}
