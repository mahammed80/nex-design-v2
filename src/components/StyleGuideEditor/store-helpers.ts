import {
  DESIGN_SYSTEM_COLLECTION_NAME,
  getDesignCollectionId,
  setDesignCollectionId,
  tokenVariableName,
  type TokenRef
} from '@nex-design/core/design-system'
import type { Editor } from '@nex-design/core/editor'
import { randomHex } from '@nex-design/core/random'
import type { Fill, VariableType, VariableValue } from '@nex-design/core/scene-graph'

import { fillToGradientString } from './utils'

/** The document's design-system collection, created (and recorded) on first use. */
export function ensureDefaultCollection(editor: Editor) {
  const existingId = getDesignCollectionId(editor.graph)
  const existing = existingId ? editor.getCollection(existingId) : undefined
  if (existing) return existing
  const collection = {
    id: `col:${randomHex(4)}`,
    name: DESIGN_SYSTEM_COLLECTION_NAME,
    modes: [{ modeId: 'default', name: 'Default' }],
    defaultModeId: 'default',
    variableIds: []
  }
  editor.undo.beginBatch('Create design system')
  editor.addCollection(collection)
  setDesignCollectionId(editor.graph, collection.id)
  editor.undo.commitBatch()
  return collection
}

function addTokenVariable(
  editor: Editor,
  label: string,
  ref: TokenRef,
  type: VariableType,
  value: VariableValue
) {
  const col = ensureDefaultCollection(editor)
  editor.undo.beginBatch(label)
  editor.addVariable({
    id: `var:${randomHex(4)}`,
    name: tokenVariableName(ref),
    type,
    collectionId: col.id,
    valuesByMode: { [col.defaultModeId]: value },
    description: '',
    hiddenFromPublishing: false
  })
  editor.undo.commitBatch()
  editor.requestRender()
}

export function addColorVariable(editor: Editor) {
  addTokenVariable(
    editor,
    'Add color token',
    { group: 'colors', token: `color-${randomHex(2)}` },
    'COLOR',
    { r: 0.9, g: 0.2, b: 0.2, a: 1 }
  )
}

export function addSpacingVariable(editor: Editor) {
  addTokenVariable(
    editor,
    'Add spacing token',
    { group: 'spacing', token: `space-${randomHex(2)}` },
    'FLOAT',
    16
  )
}

export function addFontVariable(editor: Editor) {
  addTokenVariable(
    editor,
    'Add font token',
    { group: 'typography', token: `font-${randomHex(2)}`, prop: 'fontFamily' },
    'STRING',
    'Inter'
  )
}

export function removeVariable(editor: Editor, id: string) {
  editor.removeVariable(id)
  editor.requestRender()
}

export function updateVariableName(editor: Editor, id: string, name: string) {
  editor.renameVariable(id, name)
  editor.requestRender()
}

/** The default mode of the variable's collection — never assume a literal 'default' id. */
function defaultModeIdFor(editor: Editor, id: string): string {
  const variable = editor.graph.variables.get(id)
  const collection = variable ? editor.getCollection(variable.collectionId) : undefined
  return collection?.defaultModeId ?? ensureDefaultCollection(editor).defaultModeId
}

export function updateVariableValue(editor: Editor, id: string, val: VariableValue) {
  editor.updateVariableValue(id, defaultModeIdFor(editor, id), val)
  editor.requestRender()
}

/** `colors/x` ⇄ `gradient-x` (and the legacy `color-x`): gradients are STRING variables. */
function paletteRename(name: string, toGradient: boolean): string | null {
  if (toGradient) {
    const base = name.match(/^(?:colors\/|color-)(.+)$/)?.[1]
    return base ? `gradient-${base}` : null
  }
  const base = name.match(/^gradient-(.+)$/)?.[1]
  return base ? tokenVariableName({ group: 'colors', token: base }) : null
}

export function handleFillUpdate(editor: Editor, id: string, newFill: Fill) {
  const v = editor.graph.variables.get(id)
  if (!v) return

  const toGradient = newFill.type.startsWith('GRADIENT')
  if (!toGradient && newFill.type !== 'SOLID') return
  editor.undo.beginBatch('Update palette style')
  const wantedType: VariableType = toGradient ? 'STRING' : 'COLOR'
  if (v.type !== wantedType) {
    editor.setVariableType(id, wantedType)
    const renamed = paletteRename(v.name, toGradient)
    if (renamed) editor.renameVariable(id, renamed)
  }
  editor.updateVariableValue(
    id,
    defaultModeIdFor(editor, id),
    toGradient ? fillToGradientString(newFill) : newFill.color
  )
  editor.undo.commitBatch()
  editor.requestRender()
}
