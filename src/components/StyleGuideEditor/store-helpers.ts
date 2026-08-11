import type { Editor } from '@nex-design/core/editor'
import type { Fill, VariableValue } from '@nex-design/core/scene-graph'

import { fillToGradientString, randomHex, type VariableItem } from './utils'

export function ensureDefaultCollection(editor: Editor) {
  const cols = editor.getCollections()
  if (cols.length === 0) {
    const colId = 'col:default'
    const col = {
      id: colId,
      name: 'Default',
      modes: [{ modeId: 'default', name: 'Mode 1' }],
      defaultModeId: 'default',
      variableIds: []
    }
    editor.addCollection(col)
    return col
  }
  return cols[0]
}

export function initDefaultTypographyVariables(editor: Editor, variables: VariableItem[]) {
  const col = ensureDefaultCollection(editor)
  const defaults = [
    { name: 'font-size-display-1', val: 72 },
    { name: 'font-size-heading-1', val: 54 },
    { name: 'font-size-heading-2', val: 40 },
    { name: 'font-size-heading-3', val: 32 },
    { name: 'font-size-body', val: 16 },
    { name: 'font-size-button', val: 14 }
  ]

  editor.undo.beginBatch('Initialize typography variables')
  let changed = false
  for (const item of defaults) {
    const exists = variables.find((v) => v.type === 'FLOAT' && v.name === item.name)
    if (!exists) {
      const id = `var:${randomHex(8)}`
      editor.addVariable({
        id,
        name: item.name,
        type: 'FLOAT',
        collectionId: col.id,
        valuesByMode: { default: item.val },
        description: '',
        hiddenFromPublishing: false
      })
      changed = true
    }
  }
  editor.undo.commitBatch()
  if (changed) {
    editor.requestRender()
    editor.state.sceneVersion++
  }
}

export function addColorVariable(editor: Editor) {
  const col = ensureDefaultCollection(editor)
  const id = `var:${randomHex(8)}`
  editor.undo.beginBatch('Add color variable')
  editor.addVariable({
    id,
    name: 'color-' + randomHex(4),
    type: 'COLOR',
    collectionId: col.id,
    valuesByMode: { default: { r: 0.9, g: 0.2, b: 0.2, a: 1 } },
    description: '',
    hiddenFromPublishing: false
  })
  editor.undo.commitBatch()
  editor.requestRender()
  editor.state.sceneVersion++
}

export function addSpacingVariable(editor: Editor) {
  const col = ensureDefaultCollection(editor)
  const id = `var:${randomHex(8)}`
  editor.undo.beginBatch('Add float variable')
  editor.addVariable({
    id,
    name: 'spacing-' + randomHex(4),
    type: 'FLOAT',
    collectionId: col.id,
    valuesByMode: { default: 16 },
    description: '',
    hiddenFromPublishing: false
  })
  editor.undo.commitBatch()
  editor.requestRender()
  editor.state.sceneVersion++
}

export function addFontVariable(editor: Editor) {
  const col = ensureDefaultCollection(editor)
  const id = `var:${randomHex(8)}`
  editor.undo.beginBatch('Add font variable')
  editor.addVariable({
    id,
    name: 'font-' + randomHex(4),
    type: 'STRING',
    collectionId: col.id,
    valuesByMode: { default: 'Inter' },
    description: '',
    hiddenFromPublishing: false
  })
  editor.undo.commitBatch()
  editor.requestRender()
  editor.state.sceneVersion++
}

export function removeVariable(editor: Editor, id: string) {
  editor.undo.beginBatch('Remove variable')
  editor.removeVariable(id)
  editor.undo.commitBatch()
  editor.requestRender()
  editor.state.sceneVersion++
}

export function updateVariableName(editor: Editor, id: string, name: string) {
  editor.renameVariable(id, name)
  editor.state.sceneVersion++
}

export function updateVariableValue(editor: Editor, id: string, val: VariableValue) {
  editor.updateVariableValue(id, 'default', val)
  editor.state.sceneVersion++
}

export function handleFillUpdate(editor: Editor, id: string, newFill: Fill) {
  const v = editor.graph.variables.get(id)
  if (!v) return

  editor.undo.beginBatch('Update palette style')
  if (newFill.type === 'SOLID') {
    if (v.type !== 'COLOR') {
      v.type = 'COLOR'
      if (v.name.startsWith('gradient-')) {
        const baseName = v.name.substring(9)
        editor.renameVariable(id, 'color-' + baseName)
      }
    }
    editor.updateVariableValue(id, 'default', newFill.color)
  } else if (newFill.type.startsWith('GRADIENT')) {
    const cssGradient = fillToGradientString(newFill)
    if (v.type !== 'STRING') {
      v.type = 'STRING'
      if (v.name.startsWith('color-')) {
        const baseName = v.name.substring(6)
        editor.renameVariable(id, 'gradient-' + baseName)
      }
    }
    editor.updateVariableValue(id, 'default', cssGradient)
  }
  editor.undo.commitBatch()
  editor.requestRender()
  editor.state.sceneVersion++
}
