<script setup lang="ts">
import { computed } from 'vue'
import type { SceneNode } from '@nex-design/core/scene-graph'

const props = withDefaults(
  defineProps<{
    node: SceneNode
    nodesMap: Map<string, SceneNode>
    isRoot?: boolean
  }>(),
  {
    isRoot: false
  }
)

const emit = defineEmits<{
  (e: 'interaction', payload: { nodeId: string; triggerType: string }): void
}>()

// Style mapping
const style = computed(() => {
  const n = props.node
  const s: Record<string, string> = {
    position: 'absolute',
    left: props.isRoot ? '0px' : `${n.x}px`,
    top: props.isRoot ? '0px' : `${n.y}px`,
    width: `${n.width}px`,
    height: `${n.height}px`,
    opacity: String(n.opacity ?? 1),
    transform: n.rotation ? `rotate(${n.rotation}deg)` : '',
    transformOrigin: 'center'
  }

  if (n.type === 'ELLIPSE') {
    s.borderRadius = '50%'
  } else if (n.cornerRadius) {
    s.borderRadius = `${n.cornerRadius}px`
  } else if (n.independentCorners) {
    s.borderRadius = `${n.topLeftRadius}px ${n.topRightRadius}px ${n.bottomRightRadius}px ${n.bottomLeftRadius}px`
  }

  // Background color (fills)
  const solidFill = n.fills?.find((f) => f.type === 'SOLID' && f.visible)
  if (solidFill) {
    const c = solidFill.color
    s.backgroundColor = `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${solidFill.opacity ?? 1})`
  } else if (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE') {
    s.backgroundColor = 'transparent'
  }

  // Borders (strokes)
  const stroke = n.strokes?.[0]
  if (stroke && stroke.visible) {
    const c = stroke.color
    s.border = `${stroke.weight}px solid rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${stroke.opacity ?? 1})`
  }

  // Typography
  if (n.type === 'TEXT') {
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

    // Add text color
    const textFill = n.fills?.find((f) => f.type === 'SOLID' && f.visible)
    if (textFill) {
      const tc = textFill.color
      s.color = `rgba(${tc.r * 255}, ${tc.g * 255}, ${tc.b * 255}, ${textFill.opacity ?? 1})`
    } else {
      s.color = 'black'
    }
  }

  // Box Shadow (effects)
  const shadow = n.effects?.find((e) => e.type === 'DROP_SHADOW' && e.visible)
  if (shadow) {
    const c = shadow.color
    s.boxShadow = `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.spread}px rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, ${c.a})`
  }

  // Pointer events - only interact if there are reactions configured
  if (n.reactions && n.reactions.length > 0) {
    s.cursor = 'pointer'
    s.pointerEvents = 'auto'
  } else {
    s.pointerEvents = 'none'
  }

  return s
})

const children = computed(() => {
  return props.node.childIds
    .map((id) => props.nodesMap.get(id))
    .filter((n): n is SceneNode => n !== undefined && n.visible)
})

function handleTrigger(triggerType: string) {
  if (props.node.reactions?.some((r) => r.trigger.type === triggerType)) {
    emit('interaction', { nodeId: props.node.id, triggerType })
  }
}
</script>

<template>
  <div
    :style="style"
    @click.stop="handleTrigger('ON_CLICK')"
    @mouseenter="handleTrigger('MOUSE_ENTER')"
    @mouseleave="handleTrigger('MOUSE_LEAVE')"
    @mousedown="handleTrigger('MOUSE_DOWN')"
    @mouseup="handleTrigger('MOUSE_UP')"
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
