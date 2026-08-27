import { describe, test, expect } from 'bun:test'
import { NamedStyleRegistry } from '@nex-design/core/scene-graph'

describe('Named Style Presets (Paint / Text / Effect)', () => {
  test('add and retrieve paint style', () => {
    const reg = new NamedStyleRegistry()
    reg.add({
      id: 's1', name: 'Primary Blue', type: 'PAINT',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    expect(reg.get('s1')?.name).toBe('Primary Blue')
    expect(reg.getByType('PAINT').length).toBe(1)
  })

  test('add and update text style', () => {
    const reg = new NamedStyleRegistry()
    reg.add({ id: 't1', name: 'Heading 1', type: 'TEXT', fontFamily: 'Inter', fontSize: 32, fontWeight: 700 })
    reg.update('t1', { fontSize: 36 })
    const style = reg.get('t1') as import('@nex-design/core/scene-graph').TextStylePreset
    expect(style.fontSize).toBe(36)
  })

  test('round-trip toJSON / fromJSON', () => {
    const reg = new NamedStyleRegistry()
    reg.add({ id: 'e1', name: 'Drop Shadow', type: 'EFFECT', effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0, visible: true }] })
    const json = reg.toJSON()
    const reg2 = new NamedStyleRegistry()
    reg2.fromJSON(json)
    expect(reg2.get('e1')?.name).toBe('Drop Shadow')
  })
})
