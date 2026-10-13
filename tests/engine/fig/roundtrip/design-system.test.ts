import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph } from '@nex-design/core'
import {
  applyDesignSystem,
  ensureStyleGuidePage,
  findStyleGuidePage,
  getDesignCollectionId,
  getStoredDesignMd,
  parseDesignMd,
  readDesignSystem
} from '@nex-design/core/design-system'

setDefaultTimeout(60_000)

const MARKDOWN = [
  '---',
  'version: alpha',
  'name: Roundtrip',
  'colors:',
  '  primary: "#533afd"',
  'spacing:',
  '  md: 12px',
  'components:',
  '  button:',
  '    backgroundColor: "{colors.primary}"',
  '---',
  '',
  '## Overview',
  '',
  'Survives save and open.'
].join('\n')

describe('design system .fig roundtrip', () => {
  test('stored DESIGN.md, Style Guide marker, and token collection survive', async () => {
    await initCodec()
    const graph = new SceneGraph()
    const page = ensureStyleGuidePage(graph)
    graph.updateNode(page.id, { name: 'Brand Guide' })
    applyDesignSystem(graph, parseDesignMd(MARKDOWN).doc)

    const exported = await exportFigFile(graph)
    const back = await parseFigFile(exported.buffer as ArrayBuffer)

    expect(findStyleGuidePage(back)?.name).toBe('Brand Guide')
    expect(getStoredDesignMd(back)).toContain('Survives save and open.')
    expect(getDesignCollectionId(back)).not.toBeNull()
    const system = readDesignSystem(back)
    expect(system.colors.primary).toBe('#533AFD')
    expect(system.spacing.md).toBe(12)
    expect(system.components.button.backgroundColor).toBe('{colors.primary}')
  })
})
