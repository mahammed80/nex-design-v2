import { getDefaultCanvasBgColor } from '#core/constants'
import type { EditorState } from '#core/editor/types'

export function createDefaultEditorState(pageId: string): EditorState {
  return {
    mode: 'DESIGN',
    activeTool: 'SELECT',
    currentPageId: pageId,
    selectedIds: new Set<string>(),
    marquee: null,
    prototypeDragLine: null,
    prototypeReconnectDrag: null,
    snapGuides: [],
    rotationPreview: null,
    dropTargetId: null,
    layoutInsertIndicator: null,
    hoveredNodeId: null,
    hoveredConnectionId: null,
    editingTextId: null,
    penState: null,
    penCursorX: null,
    penCursorY: null,
    remoteCursors: [],
    documentName: 'Untitled',
    panX: 0,
    pageColor: { ...getDefaultCanvasBgColor() },
    panY: 0,
    zoom: 1,
    renderVersion: 0,
    sceneVersion: 0,
    loading: false,
    enteredContainerId: null,
    fontPreviewActive: false,
    guides: [],
    selectedGuideId: null,
    guidesVisible: true,
    guidesLocked: false
  }
}
