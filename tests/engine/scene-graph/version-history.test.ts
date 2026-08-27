import { describe, test, expect } from 'bun:test'
import { VersionHistory } from '@1nex-design/core/scene-graph'
import { SceneGraph } from '@nex-design/core/scene-graph'

describe('Version History (Snapshot / Restore)', () => {
  test('snapshots are listed newest first', () => {
    const graph = new SceneGraph()
    const history = new VersionHistory()
    history.snapshot(graph, 'Version 1')
    history.snapshot(graph, 'Version 2')
    const all = history.getAll()
    expect(all[0].name).toBe('Version 2')
    expect(all[1].name).toBe('Version 1')
  })

  test('restores to snapshot state', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const history = new VersionHistory()
    const snap = history.snapshot(graph, 'Before add')
    graph.createNode('RECTANGLE', pageId, { name: 'Box', y: 0, y: 0, width: 100, height: 100 })
    const sizeBefore = graph.nodes.size
    history.restore(graph, snap.id)
    expect(graph.nodes.size).toBeLessThan(sizeBefore)
  })
})
