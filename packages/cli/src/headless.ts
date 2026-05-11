import { BUILTIN_IO_FORMATS, IORegistry, initCanvasKit } from '@nex-design/core/io'
import { computeAllLayouts } from '@nex-design/core/layout'
import type { SceneGraph } from '@nex-design/core/scene-graph'

export { initCanvasKit }

const io = new IORegistry(BUILTIN_IO_FORMATS)

export async function loadDocument(filePath: string): Promise<SceneGraph> {
  const bytes = new Uint8Array(await Bun.file(filePath).arrayBuffer())
  const { graph } = await io.readDocument({ name: filePath, data: bytes })
  computeAllLayouts(graph)
  return graph
}
