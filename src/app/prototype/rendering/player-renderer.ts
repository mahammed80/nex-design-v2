import { SkiaRenderer } from '@nex-design/core/canvas'
import { getCanvasKit } from '@nex-design/core/canvaskit'

import type { EditorStore } from '@/app/editor/active-store'

/**
 * Renderer for prototype screens. Prefers the editor canvas's renderer (fonts and caches are
 * already warm); when the canvas has no live surface (e.g. it never mounted, or WebGL failed)
 * the player creates its own offscreen CPU renderer once, like headless export does.
 */
let fallback: Promise<SkiaRenderer | null> | null = null

async function createFallbackRenderer(): Promise<SkiaRenderer | null> {
  try {
    const ck = await getCanvasKit()
    const surface = ck.MakeSurface(1, 1)
    if (!surface) return null
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 1
    renderer.viewportHeight = 1
    renderer.dpr = 1
    await renderer.loadFonts()
    return renderer
  } catch (error) {
    console.warn('[NexDesign Prototype] Could not start an offscreen renderer', error)
    return null
  }
}

export function playerRenderer(
  editor: Pick<EditorStore, 'renderer'>
): SkiaRenderer | Promise<SkiaRenderer | null> {
  if (editor.renderer) return editor.renderer
  fallback ??= createFallbackRenderer()
  return fallback
}
