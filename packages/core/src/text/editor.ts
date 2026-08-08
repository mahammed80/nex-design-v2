import type { CanvasKit, Paragraph } from 'canvaskit-wasm'

import type { SceneNode } from '#core/scene-graph'

export interface TextCaret {
  x: number
  y0: number
  y1: number
}

export interface TextEditorState {
  nodeId: string
  text: string
  cursor: number
  selectionAnchor: number | null
  paragraph: Paragraph | null
  textDirection: 'LTR' | 'RTL'
}

export class TextEditor {
  private ck: CanvasKit
  private renderer: any = null
  private _state: TextEditorState | null = null
  caretVisible = true

  constructor(ck: CanvasKit) {
    this.ck = ck
  }

  get state(): TextEditorState | null {
    return this._state
  }
  get isActive(): boolean {
    return this._state !== null
  }
  get nodeId(): string | null {
    return this._state?.nodeId ?? null
  }

  setRenderer(renderer: any): void {
    this.renderer = renderer
  }

  start(node: SceneNode): void {
    this._state = {
      nodeId: node.id,
      text: node.text || '',
      cursor: (node.text || '').length,
      selectionAnchor: null,
      paragraph: null,
      textDirection: 'LTR'
    }
    this.rebuildParagraph(node)
  }

  stop(): { nodeId: string; text: string } | null {
    if (!this._state) return null
    if (this._state.paragraph) {
      this._state.paragraph.delete()
      this._state.paragraph = null
    }
    const result = { nodeId: this._state.nodeId, text: this._state.text }
    this._state = null
    return result
  }

  rebuildParagraph(node: SceneNode): void {
    if (!this._state || !this.renderer) return
    if (this._state.paragraph) {
      this._state.paragraph.delete()
      this._state.paragraph = null
    }
    const tempNode = { ...node, text: this._state.text }
    this._state.paragraph = this.renderer.buildParagraph(tempNode, undefined, {
      isMeasuring: false
    })
  }

  hasSelection(): boolean {
    return (
      this._state?.selectionAnchor !== null && this._state?.selectionAnchor !== this._state?.cursor
    )
  }

  getSelectionRange(): [number, number] | null {
    if (!this._state || this._state.selectionAnchor === null) return null
    const a = this._state.selectionAnchor
    const b = this._state.cursor
    return [Math.min(a, b), Math.max(a, b)]
  }

  getSelectedText(): string {
    const range = this.getSelectionRange()
    if (!range || !this._state) return ''
    return this._state.text.substring(range[0], range[1])
  }

  insert(text: string, node: SceneNode): void {
    if (!this._state) return
    const range = this.getSelectionRange()
    if (range) {
      this._state.text =
        this._state.text.substring(0, range[0]) + text + this._state.text.substring(range[1])
      this._state.cursor = range[0] + text.length
      this._state.selectionAnchor = null
    } else {
      this._state.text =
        this._state.text.substring(0, this._state.cursor) +
        text +
        this._state.text.substring(this._state.cursor)
      this._state.cursor += text.length
    }
    this.rebuildParagraph({ ...node, text: this._state.text })
  }

  delete(node: SceneNode): void {
    if (!this._state) return
    const range = this.getSelectionRange()
    if (range) {
      this._state.text =
        this._state.text.substring(0, range[0]) + this._state.text.substring(range[1])
      this._state.cursor = range[0]
      this._state.selectionAnchor = null
    } else if (this._state.cursor < this._state.text.length) {
      this._state.text =
        this._state.text.substring(0, this._state.cursor) +
        this._state.text.substring(this._state.cursor + 1)
    }
    this.rebuildParagraph({ ...node, text: this._state.text })
  }

  backspace(node: SceneNode): void {
    if (!this._state) return
    const range = this.getSelectionRange()
    if (range) {
      this.delete(node)
      return
    }
    if (this._state.cursor > 0) {
      this._state.text =
        this._state.text.substring(0, this._state.cursor - 1) +
        this._state.text.substring(this._state.cursor)
      this._state.cursor -= 1
      this.rebuildParagraph({ ...node, text: this._state.text })
    }
  }

  selectAll(): void {
    if (!this._state) return
    this._state.selectionAnchor = 0
    this._state.cursor = this._state.text.length
  }

  selectWord(pos: number): void {
    const s = this._state
    if (!s?.paragraph) return
    const range = s.paragraph.getWordBoundary(pos)
    s.selectionAnchor = range.start
    s.cursor = range.end
  }

  selectWordAt(x: number, y: number): void {
    const s = this._state
    if (!s?.paragraph) return
    const pos = s.paragraph.getGlyphPositionAtCoordinate(x, y).pos
    this.selectWord(pos)
  }

  selectLine(pos: number): void {
    const s = this._state
    if (!s?.paragraph) return
    const lineNum = s.paragraph.getLineNumberAt(pos)
    if (lineNum < 0) return
    const metrics = s.paragraph.getLineMetricsAt(lineNum)
    if (!metrics) return
    s.selectionAnchor = metrics.startIndex
    s.cursor = metrics.endExcludingWhitespaces
  }

  selectLineAt(x: number, y: number): void {
    const s = this._state
    if (!s?.paragraph) return
    const pos = s.paragraph.getGlyphPositionAtCoordinate(x, y).pos
    this.selectLine(pos)
  }

  setCursorAt(x: number, y: number, extend?: boolean): void {
    if (!this._state || !this._state.paragraph) return
    const pos = this._state.paragraph.getGlyphPositionAtCoordinate(x, y)
    const newCursor = pos.pos
    if (extend) {
      if (this._state.selectionAnchor === null) this._state.selectionAnchor = this._state.cursor
    } else {
      this._state.selectionAnchor = null
    }
    this._state.cursor = newCursor
  }

  moveToLineStart(extend?: boolean): void {
    if (!this._state) return
    if (extend && this._state.selectionAnchor === null)
      this._state.selectionAnchor = this._state.cursor
    else if (!extend) this._state.selectionAnchor = null
    this._state.cursor = 0
  }
  moveToLineEnd(extend?: boolean): void {
    if (!this._state) return
    if (extend && this._state.selectionAnchor === null)
      this._state.selectionAnchor = this._state.cursor
    else if (!extend) this._state.selectionAnchor = null
    this._state.cursor = this._state.text.length
  }
  moveWordLeft(extend?: boolean): void {
    this.moveLeft(extend)
  }
  moveWordRight(extend?: boolean): void {
    this.moveRight(extend)
  }

  moveLeft(extend?: boolean): void {
    if (!this._state) return
    if (extend && this._state.selectionAnchor === null)
      this._state.selectionAnchor = this._state.cursor
    else if (!extend && this.hasSelection()) {
      this._state.cursor = this.getSelectionRange()![0]
      this._state.selectionAnchor = null
      return
    } else if (!extend) this._state.selectionAnchor = null

    if (this._state.cursor > 0) this._state.cursor--
  }

  moveRight(extend?: boolean): void {
    if (!this._state) return
    if (extend && this._state.selectionAnchor === null)
      this._state.selectionAnchor = this._state.cursor
    else if (!extend && this.hasSelection()) {
      this._state.cursor = this.getSelectionRange()![1]
      this._state.selectionAnchor = null
      return
    } else if (!extend) this._state.selectionAnchor = null

    if (this._state.cursor < this._state.text.length) this._state.cursor++
  }

  moveUp(_extend?: boolean): void {}
  moveDown(_extend?: boolean): void {}

  clickAt(x: number, y: number, extend: boolean): void {
    this.setCursorAt(x, y, extend)
  }
  doubleClickAt(_x: number, _y: number): void {}
  tripleClickAt(_x: number, _y: number): void {}
  dragTo(x: number, y: number): void {
    this.setCursorAt(x, y, true)
  }

  getCaretRect(): TextCaret | null {
    if (!this._state || !this._state.paragraph) return null
    if (this._state.text.length === 0) {
      const metrics = this._state.paragraph.getLineMetrics()
      if (metrics.length === 0) return { x: 0, y0: 0, y1: 16 }
      const line = metrics[0]
      return { x: line.left, y0: 0, y1: line.height }
    }

    const cursor = this._state.cursor
    const text = this._state.text
    let lo = cursor
    let hi = cursor + 1
    let useRight = false

    if (cursor === 0) {
      lo = 0
      hi = 1
      useRight = this._state.textDirection === 'RTL'
    } else if (cursor >= text.length) {
      lo = text.length - 1
      hi = text.length
      useRight = this._state.textDirection !== 'RTL'
    }

    const rects = this._state.paragraph.getRectsForRange(
      lo,
      hi,
      this.ck.RectHeightStyle.Max,
      this.ck.RectWidthStyle.Tight
    )
    if (rects && rects.length > 0) {
      const [left, top, right] = rects[0].rect
      const bottom = rects[0].rect[3]
      return {
        x: useRight ? right : left,
        y0: top,
        y1: bottom
      }
    }

    return { x: 0, y0: 0, y1: 16 }
  }

  getSelectionRects(): any[] {
    if (!this._state || !this._state.paragraph || !this.hasSelection()) return []
    const range = this.getSelectionRange()!
    const rects = this._state.paragraph.getRectsForRange(
      range[0],
      range[1],
      this.ck.RectHeightStyle.Max,
      this.ck.RectWidthStyle.Tight
    )
    return rects.map((r) => {
      const [left, top, right, bottom] = r.rect
      return { x: left, y: top, width: right - left, height: bottom - top }
    })
  }
}
