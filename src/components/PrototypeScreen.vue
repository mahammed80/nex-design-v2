<script setup lang="ts">
import { useRafFn } from '@vueuse/core'
import { computed, onMounted, shallowRef, toRaw, useTemplateRef, watch } from 'vue'

import type { SkiaRenderer } from '@nex-design/core/canvas'
import { renderNodeToPixels } from '@nex-design/core/io/formats/raster'
import type { SceneNode, Transition } from '@nex-design/core/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import type { StateManager } from '@/app/prototype/prototype-engine'
import { playerRenderer } from '@/app/prototype/rendering/player-renderer'
import { buildSessionGraph } from '@/app/prototype/rendering/session-graph'
import { matchLayers, smartAnimateFrame } from '@/app/prototype/rendering/smart-animate'
import { easingFn } from '@/app/prototype/transition-engine'

/**
 * One prototype screen (or overlay) drawn by the editor's CanvasKit renderer, so the player
 * shows exactly what the canvas shows — gradients, images, clipping, effects, vectors, text.
 * When `smartFrom` is set, the screen smart-animates in from that screen.
 */
const { frameId, stateManager, renderScale, smartFrom, transition } = defineProps<{
  frameId: string
  stateManager: StateManager
  /** Device pixels per design pixel. */
  renderScale: number
  smartFrom?: string
  transition?: Transition
}>()
const emit = defineEmits<{ rendered: [ok: boolean] }>()

const editor = useEditorStore()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const frame = computed<SceneNode | undefined>(() => {
  void stateManager.version.value
  return stateManager.getNode(frameId)
})

const renderer = shallowRef<SkiaRenderer | null>(null)

function draw(nodes: Map<string, SceneNode>): boolean {
  const element = canvas.value
  const context = element?.getContext('2d')
  const active = renderer.value
  if (!active || !element || !context) return false
  const graph = buildSessionGraph(editor.graph, nodes, toRaw(stateManager.variableValues))
  const result = renderNodeToPixels(active.ck, active, graph, frameId, renderScale)
  if (!result) return false
  if (element.width !== result.width) element.width = result.width
  if (element.height !== result.height) element.height = result.height
  context.putImageData(
    new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height),
    0,
    0
  )
  return true
}

function drawCurrent() {
  emit('rendered', draw(stateManager.rawNodes()))
}

let matches = new Map<string, string>()
let startedAt = 0
const ease = computed(() => easingFn(transition?.easing ?? 'EASE_OUT'))
const animation = useRafFn(
  ({ timestamp }) => {
    if (!smartFrom) return
    if (startedAt === 0) startedAt = timestamp
    const duration = Math.max(1, transition?.duration ?? 300)
    const progress = Math.min(1, (timestamp - startedAt) / duration)
    if (progress >= 1) {
      animation.pause()
      drawCurrent()
      return
    }
    const nodes = stateManager.rawNodes()
    draw(smartAnimateFrame(nodes, smartFrom, frameId, matches, ease.value(progress)))
  },
  { immediate: false }
)

onMounted(async () => {
  renderer.value = await playerRenderer(editor)
  if (!renderer.value) {
    emit('rendered', false)
    return
  }
  if (smartFrom && stateManager.getNode(smartFrom)) {
    matches = matchLayers(stateManager.rawNodes(), smartFrom, frameId)
    startedAt = 0
    emit(
      'rendered',
      draw(smartAnimateFrame(stateManager.rawNodes(), smartFrom, frameId, matches, 0))
    )
    animation.resume()
  } else {
    drawCurrent()
  }
})

// Session changes (variant swaps, set-variable) and zoom changes redraw the settled screen.
watch([() => stateManager.version.value, () => renderScale], () => {
  if (!animation.isActive.value) drawCurrent()
})
</script>

<template>
  <canvas
    v-if="frame"
    ref="canvas"
    data-test-id="prototype-screen-canvas"
    class="pointer-events-none absolute top-0 left-0"
    :style="{ width: `${frame.width}px`, height: `${frame.height}px` }"
  />
</template>
