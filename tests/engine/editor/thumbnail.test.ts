import { describe, test, expect } from 'bun:test'
import { createEditor } from '@nex-design/core/editor'
import { getNodeOrThrow } from '#tests/helpers/assert'

describe('Custom File Thumbnails / Set as Thumbnail', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const frame1 = editor.graph.createNode('FRAME', pageId, {
      name: 'Cover Frame',
      x: 0,
      y: 0,
      width: 400,
      height: 225
    })

    const frame2 = editor.graph.createNode('FRAME', pageId, {
      name: 'Other Frame',
      x: 500,
      y: 0,
      width: 400,
      height: 225
    })

    return { editor, frame1, frame2, pageId }
  }

  test('sets selected frame as document thumbnail with undo/redo', () => {
    const { editor, frame1, frame2 } = setup()

    editor.select([frame1.id])
    editor.setAsThumbnailSelected()


    let node1 = getNodeOrThrow(editor.graph, frame1.id)
    let node2 = getNodeOrThrow(editor.graph, frame2.id)
    expect(node1.isThumbnail).toBe(true)
    expect(node2.isThumbnail).toBeFalsy()


    editor.select([frame2.id])
    editor.setAsThumbnailSelected()

    node1 = getNodeOrThrow(editor.graph, frame1.id)
    node2 = getNodeOrThrow(editor.graph, frame2.id)
    expect(node1.isThumbnail).toBeFalsy()
    expect(node2.isThumbnail).toBe(true)

    editor.undo.undo()
    node2 = getNodeOrThrow(editor.graph, frame2.id)
    expect(node2.isThumbnail).toBeFalsy()
  })
})
