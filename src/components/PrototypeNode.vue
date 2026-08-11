<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { colorToCSS } from '@nex-design/core/color'
import type { SceneNode } from '@nex-design/core/scene-graph'

const {
  node,
  nodesMap,
  isRoot = false
} = defineProps<{
  node: SceneNode
  nodesMap: Map<string, SceneNode>
  isRoot?: boolean
}>()

const emit = defineEmits<{
  (e: 'interaction', payload: { nodeId: string; triggerType: string }): void
}>()

function getBorderRadiusStyle(n: SceneNode): string | undefined {
  if (n.type === 'ELLIPSE') return '50%'
  if (n.cornerRadius) return `${n.cornerRadius}px`
  if (n.independentCorners) {
    return `${n.topLeftRadius}px ${n.topRightRadius}px ${n.bottomRightRadius}px ${n.bottomLeftRadius}px`
  }
  return undefined
}

function applyFillAndStroke(n: SceneNode, s: Record<string, string>) {
  const solidFill = n.fills?.find((f) => f.type === 'SOLID' && f.visible)
  if (solidFill) {
    s.backgroundColor = colorToCSS({
      ...solidFill.color,
      a: solidFill.opacity ?? solidFill.color.a
    })
  } else if (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE') {
    s.backgroundColor = 'transparent'
  }

  const stroke = n.strokes?.[0]
  if (stroke && stroke.visible) {
    s.border = `${stroke.weight}px solid ${colorToCSS({ ...stroke.color, a: stroke.opacity ?? stroke.color.a })}`
  }
}

function applyTextStyle(n: SceneNode, s: Record<string, string>) {
  if (n.type !== 'TEXT') return
  s.fontSize = `${n.fontSize}px`
  s.fontFamily = n.fontFamily
  s.fontWeight = String(n.fontWeight)
  s.textAlign = n.textAlignHorizontal.toLowerCase()
  s.display = 'flex'
  s.alignItems =
    n.textAlignVertical === 'CENTER'
      ? 'center'
      : n.textAlignVertical === 'BOTTOM'
        ? 'flex-end'
        : 'flex-start'
  s.justifyContent =
    n.textAlignHorizontal === 'CENTER'
      ? 'center'
      : n.textAlignHorizontal === 'RIGHT'
        ? 'flex-end'
        : 'flex-start'
  s.whiteSpace = 'pre-wrap'
  s.wordBreak = 'break-word'

  const textFill = n.fills?.find((f) => f.type === 'SOLID' && f.visible)
  s.color = textFill
    ? colorToCSS({ ...textFill.color, a: textFill.opacity ?? textFill.color.a })
    : 'black'
}

// Style mapping
const style = computed(() => {
  const n = node
  const s: Record<string, string> = {
    position: 'absolute',
    left: isRoot ? '0px' : `${n.x}px`,
    top: isRoot ? '0px' : `${n.y}px`,
    width: `${n.width}px`,
    height: `${n.height}px`,
    opacity: String(n.opacity ?? 1),
    transform: n.rotation ? `rotate(${n.rotation}deg)` : '',
    transformOrigin: 'center'
  }

  const borderRadius = getBorderRadiusStyle(n)
  if (borderRadius) s.borderRadius = borderRadius

  applyFillAndStroke(n, s)
  applyTextStyle(n, s)

  const shadow = n.effects?.find((e) => e.type === 'DROP_SHADOW' && e.visible)
  if (shadow) {
    s.boxShadow = `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.spread}px ${colorToCSS(shadow.color)}`
  }

  const hasReactions = Boolean(n.reactions && n.reactions.length > 0)
  s.cursor = hasReactions ? 'pointer' : 'default'
  s.pointerEvents = hasReactions ? 'auto' : 'none'

  return s
})

const children = computed(() => {
  return node.childIds
    .map((id) => nodesMap.get(id))
    .filter((n): n is SceneNode => n !== undefined && n.visible)
})

// Drag and press gesture state tracking
let dragStartX = 0
let dragStartY = 0
let isDragging = false

function onMouseDown(e: MouseEvent) {
  dragStartX = e.clientX
  dragStartY = e.clientY
  isDragging = true
  
  emit('interaction', { nodeId: node.id, triggerType: 'ON_PRESS' })
  emit('interaction', { nodeId: node.id, triggerType: 'MOUSE_DOWN' })

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (Math.hypot(dx, dy) > 30) {
    isDragging = false
    let direction = ''
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'RIGHT' : 'LEFT'
    } else {
      direction = dy > 0 ? 'DOWN' : 'UP'
    }
    emit('interaction', { nodeId: node.id, triggerType: `ON_DRAG_${direction}` })

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}

function onMouseUp(_e: MouseEvent) {
  if (!isDragging) return
  isDragging = false
  emit('interaction', { nodeId: node.id, triggerType: 'press-end' })
  emit('interaction', { nodeId: node.id, triggerType: 'MOUSE_UP' })
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function onMouseEnter() {
  emit('interaction', { nodeId: node.id, triggerType: 'ON_HOVER' })
  emit('interaction', { nodeId: node.id, triggerType: 'MOUSE_ENTER' })
}

function onMouseLeave() {
  emit('interaction', { nodeId: node.id, triggerType: 'hover-end' })
  emit('interaction', { nodeId: node.id, triggerType: 'MOUSE_LEAVE' })
  if (isDragging) {
    isDragging = false
    emit('interaction', { nodeId: node.id, triggerType: 'press-end' })
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    :data-prototype-node-id="node.id"
    :style="style"
    @click.stop="emit('interaction', { nodeId: node.id, triggerType: 'ON_CLICK' })"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousedown.stop="onMouseDown"
  >
    <!-- Vector network SVG rendering -->
    <svg
      v-if="node.type === 'VECTOR' && node.vectorNetwork"
      class="absolute inset-0 size-full pointer-events-none text-surface"
      :viewBox="`0 0 ${node.width} ${node.height}`"
    >
      <path
        v-for="(seg, i) in node.vectorNetwork.segments"
        :key="i"
        :d="`M ${node.vectorNetwork.vertices[seg.start].x} ${node.vectorNetwork.vertices[seg.start].y} L ${node.vectorNetwork.vertices[seg.end].x} ${node.vectorNetwork.vertices[seg.end].y}`"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
      />
    </svg>

    <span v-if="node.type === 'TEXT'" class="pointer-events-none">{{ node.text }}</span>

    <!-- Render children recursively -->
    <PrototypeNode
      v-for="child in children"
      :key="child.id"
      :node="child"
      :nodesMap="nodesMap"
      @interaction="emit('interaction', $event)"
    />
  </div>
</template>

