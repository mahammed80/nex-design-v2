import { describe, test, expect } from 'bun:test'
import { buildRemotePeers, remotePeersToCursors } from '@/app/collab/awareness'

describe('Cursor Chat Awareness', () => {
  test('parses remote peer cursor chat messages', () => {
    const states = new Map<number, Record<string, unknown>>([
      [
        2,
        {
          user: { name: 'Bob', color: {r: 1, g: 0, b: 0, a: 1} },
          cursor: { x: 100, y: 200, pageId: 'page-1' },
          cursorChat: { message: 'Looking good! 👍', timestamp: 1700000000 }
        }
      ]
    ])

    const peers = buildRemotePeers(states, 1)

    expect(peers.length).toBe(1)
    expect(peers[0].clientId).toBe(2)
    expect(peers[0].cursorChat?.message).toBe('Looking good! 👌')
    expect(peers[0].cursorChat?.timestamp).toBe(1700000000)


    const cursors = remotePeersToCursors(peers, 'page-1')
    expect(cursors.length).toBe(1)
    expect(cursors[0].cursorChat?.message).toBe('Looking good! 👌')
  })
})
