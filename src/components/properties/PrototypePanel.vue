<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSelectionState } from '@nex-design/vue'
import { useEditorStore } from '@/app/editor/active-store'
import AppSelect from '@/components/ui/AppSelect.vue'
import PrototypePreview from '@/components/PrototypePreview.vue'
import type {
  TriggerType,
  ActionType,
  TransitionType,
  EasingType
} from '@nex-design/core/scene-graph'

const { selectedNode: node } = useSelectionState()
const editor = useEditorStore()

const previewOpen = ref(false)

// Get all other frames on the current page to connect to
const targetFrameOptions = computed(() => {
  if (!editor) return []
  const currentPageId = editor.state.currentPageId
  const currentNodes = editor.graph.getChildren(currentPageId)

  return currentNodes
    .filter(
      (n) =>
        n.id !== node.value?.id &&
        (n.type === 'FRAME' ||
          n.type === 'COMPONENT' ||
          n.type === 'INSTANCE' ||
          n.type === 'SECTION')
    )
    .map((n) => ({
      value: n.id,
      label: n.name || n.type
    }))
})

// Starting frame state
const isStartFrame = computed({
  get() {
    if (!editor || !node.value) return false
    const page = editor.graph.getNode(editor.state.currentPageId)
    return page?.prototypeStartNodeId === node.value.id
  },
  set(val: boolean) {
    if (!editor || !node.value) return
    editor.setPrototypeStartNode(editor.state.currentPageId, val ? node.value.id : null)
  }
})

const reactions = computed(() => node.value?.reactions ?? [])

const triggerOptions = [
  { value: 'ON_CLICK', label: 'On click' },
  { value: 'ON_HOVER', label: 'While hovering' },
  { value: 'ON_PRESS', label: 'While pressing' },
  { value: 'MOUSE_ENTER', label: 'Mouse enter' },
  { value: 'MOUSE_LEAVE', label: 'Mouse leave' },
  { value: 'MOUSE_DOWN', label: 'Mouse down' },
  { value: 'MOUSE_UP', label: 'Mouse up' },
  { value: 'AFTER_DELAY', label: 'After delay' }
]

const actionOptions = [
  { value: 'NAVIGATE', label: 'Navigate to' },
  { value: 'OPEN_OVERLAY', label: 'Open overlay' },
  { value: 'SWAP_OVERLAY', label: 'Swap overlay' },
  { value: 'CHANGE_TO', label: 'Change to (Component State)' },
  { value: 'SET_VARIABLE', label: 'Set variable' },
  { value: 'SCROLL_TO', label: 'Scroll to' },
  { value: 'BACK', label: 'Back' },
  { value: 'CLOSE', label: 'Close overlay' }
]

const overlayPositionOptions = [
  { value: 'CENTER', label: 'Centered' },
  { value: 'TOP_CENTER', label: 'Top Center' },
  { value: 'BOTTOM_CENTER', label: 'Bottom Center' },
  { value: 'MANUAL', label: 'Manual' }
]

const transitionOptions = [
  { value: 'INSTANT', label: 'Instant' },
  { value: 'DISSOLVE', label: 'Dissolve' },
  { value: 'SMART', label: 'Smart Animate' },
  { value: 'SLIDE_IN', label: 'Slide In' },
  { value: 'SLIDE_OUT', label: 'Slide Out' }
]

const easingOptions = [
  { value: 'LINEAR', label: 'Linear' },
  { value: 'EASE_IN', label: 'Ease in' },
  { value: 'EASE_OUT', label: 'Ease out' },
  { value: 'EASE_IN_AND_OUT', label: 'Ease in and out' },
  { value: 'SPRING', label: 'Spring' }
]

function addInteraction() {
  if (!editor || !node.value) return
  editor.addReaction(node.value.id, {
    trigger: { type: 'ON_CLICK' },
    actions: [
      {
        type: 'NAVIGATE',
        destinationId: targetFrameOptions.value[0]?.value ?? '',
        transition: { type: 'INSTANT', duration: 300, easing: 'EASE_IN_AND_OUT' }
      }
    ]
  })
}

function updateTrigger(idx: number, type: TriggerType) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  editor.updateReaction(node.value.id, idx, {
    trigger: { ...r.trigger, type, delay: type === 'AFTER_DELAY' ? 1000 : undefined }
  })
}

function updateDelay(idx: number, delay: number) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  editor.updateReaction(node.value.id, idx, {
    trigger: { ...r.trigger, delay }
  })
}

function updateAction(idx: number, type: ActionType) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const needsDest = ['NAVIGATE', 'OPEN_OVERLAY', 'SWAP_OVERLAY', 'SCROLL_TO'].includes(type)
  updatedActions[0] = {
    ...updatedActions[0],
    type,
    destinationId: needsDest ? (targetFrameOptions.value[0]?.value ?? '') : undefined,
    overlay: ['OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(type)
      ? { position: 'CENTER', backdrop: true, backdropOpacity: 0.5, closeOnOutsideClick: true }
      : undefined,
    transition: needsDest
      ? { type: 'INSTANT', duration: 300, easing: 'EASE_IN_AND_OUT' }
      : undefined
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateOverlayPosition(
  idx: number,
  position: 'CENTER' | 'TOP_CENTER' | 'BOTTOM_CENTER' | 'MANUAL'
) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const overlay = updatedActions[0].overlay ?? {}
  updatedActions[0] = {
    ...updatedActions[0],
    overlay: { ...overlay, position }
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateOverlayBackdrop(idx: number, backdrop: boolean) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const overlay = updatedActions[0].overlay ?? {}
  updatedActions[0] = {
    ...updatedActions[0],
    overlay: { ...overlay, backdrop }
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateDestination(idx: number, destId: string) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  updatedActions[0] = { ...updatedActions[0], destinationId: destId }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateTransitionType(idx: number, transType: TransitionType) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const t = updatedActions[0].transition ?? {
    type: 'INSTANT',
    duration: 300,
    easing: 'EASE_IN_AND_OUT'
  }
  updatedActions[0] = {
    ...updatedActions[0],
    transition: { ...t, type: transType }
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateTransitionEasing(idx: number, easing: EasingType) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const t = updatedActions[0].transition ?? {
    type: 'INSTANT',
    duration: 300,
    easing: 'EASE_IN_AND_OUT'
  }
  updatedActions[0] = {
    ...updatedActions[0],
    transition: { ...t, easing }
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function updateTransitionDuration(idx: number, duration: number) {
  if (!editor || !node.value) return
  const r = reactions.value[idx]
  const updatedActions = [...r.actions]
  const t = updatedActions[0].transition ?? {
    type: 'INSTANT',
    duration: 300,
    easing: 'EASE_IN_AND_OUT'
  }
  updatedActions[0] = {
    ...updatedActions[0],
    transition: { ...t, duration }
  }
  editor.updateReaction(node.value.id, idx, { actions: updatedActions })
}

function removeInteraction(idx: number) {
  if (!editor || !node.value) return
  editor.removeReaction(node.value.id, idx)
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4 text-xs">
    <!-- Play button -->
    <button
      class="flex w-full items-center justify-center gap-2 rounded bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 transition-colors shadow-sm mb-1"
      @click="previewOpen = true"
    >
      <icon-lucide-play class="size-3.5 fill-current" />
      <span>Play Prototype</span>
    </button>

    <!-- Flow starting point (only for frame-like elements) -->
    <div
      v-if="
        node &&
        (node.type === 'FRAME' ||
          node.type === 'COMPONENT' ||
          node.type === 'INSTANCE' ||
          node.type === 'SECTION')
      "
      class="flex flex-col gap-1 border-b border-border pb-3"
    >
      <h3 class="font-semibold text-surface">Flow starting point</h3>
      <div class="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="flow-start-chk"
          v-model="isStartFrame"
          class="accent-accent size-3.5"
        />
        <label for="flow-start-chk" class="text-surface font-medium cursor-pointer"
          >Set as Flow starting point</label
        >
      </div>
    </div>

    <!-- Interactions List -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-surface">Interactions</h3>
        <button
          v-if="node"
          class="flex items-center gap-1 rounded bg-accent px-2.5 py-1 font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
          @click="addInteraction"
        >
          <icon-lucide-plus class="size-3" />
          <span>Add</span>
        </button>
      </div>

      <div v-if="!node" class="text-muted text-center py-6">
        Select a frame or layer to configure prototype connections.
      </div>

      <div
        v-else-if="reactions.length === 0"
        class="text-muted text-center py-6 bg-hover/50 rounded border border-dashed border-border px-4"
      >
        No interactions configured. Drag the circular handle next to the selected layer on the
        canvas to link it to another frame.
      </div>

      <div v-else class="flex flex-col gap-3.5 mt-1.5">
        <div
          v-for="(r, idx) in reactions"
          :key="idx"
          class="flex flex-col gap-3 rounded border border-border bg-hover/30 p-3"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-[11px] uppercase tracking-wider text-muted"
              >Interaction {{ idx + 1 }}</span
            >
            <button
              class="text-muted hover:text-red-400 transition-colors"
              @click="removeInteraction(idx)"
            >
              <icon-lucide-trash class="size-3.5" />
            </button>
          </div>

          <!-- Trigger selection -->
          <div class="flex flex-col gap-1">
            <span class="text-muted text-[10px]">Trigger</span>
            <AppSelect
              :options="triggerOptions"
              :modelValue="r.trigger.type"
              @update:modelValue="updateTrigger(idx, $event as TriggerType)"
              class="w-full"
            />
          </div>

          <!-- Delay config if AFTER_DELAY -->
          <div v-if="r.trigger.type === 'AFTER_DELAY'" class="flex flex-col gap-1">
            <span class="text-muted text-[10px]">Delay (ms)</span>
            <input
              type="number"
              :value="r.trigger.delay ?? 1000"
              @change="updateDelay(idx, ($event.target as HTMLInputElement).valueAsNumber)"
              class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
              min="0"
            />
          </div>

          <!-- Action selection -->
          <div class="flex flex-col gap-1">
            <span class="text-muted text-[10px]">Action</span>
            <AppSelect
              :options="actionOptions"
              :modelValue="r.actions[0].type"
              @update:modelValue="updateAction(idx, $event as ActionType)"
              class="w-full"
            />
          </div>

          <!-- Destination selection if NAVIGATE, OPEN_OVERLAY, SWAP_OVERLAY, SCROLL_TO -->
          <div
            v-if="
              ['NAVIGATE', 'OPEN_OVERLAY', 'SWAP_OVERLAY', 'SCROLL_TO'].includes(r.actions[0].type)
            "
            class="flex flex-col gap-1"
          >
            <span class="text-muted text-[10px]">Target Frame</span>
            <AppSelect
              v-if="targetFrameOptions.length > 0"
              :options="targetFrameOptions"
              :modelValue="r.actions[0].destinationId ?? ''"
              @update:model-value="updateDestination(idx, $event)"
              class="w-full"
            />
            <div v-else class="text-muted text-[10px] italic">Create another frame to target</div>
          </div>

          <!-- Overlay settings if OPEN_OVERLAY / SWAP_OVERLAY -->
          <div
            v-if="['OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(r.actions[0].type)"
            class="flex flex-col gap-2 border-t border-border/50 pt-2"
          >
            <div class="flex flex-col gap-1">
              <span class="text-muted text-[10px]">Overlay Position</span>
              <AppSelect
                :options="overlayPositionOptions"
                :modelValue="r.actions[0].overlay?.position ?? 'CENTER'"
                @update:modelValue="updateOverlayPosition(idx, $event as any)"
                class="w-full"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                :id="`backdrop-chk-${idx}`"
                :checked="r.actions[0].overlay?.backdrop ?? true"
                @change="updateOverlayBackdrop(idx, ($event.target as HTMLInputElement).checked)"
                class="accent-accent size-3"
              />
              <label :for="`backdrop-chk-${idx}`" class="text-muted text-[10px] cursor-pointer"
                >Add background dimming backdrop</label
              >
            </div>
          </div>

          <!-- Transition configuration if NAVIGATE -->
          <div
            v-if="r.actions[0].type === 'NAVIGATE' && r.actions[0].transition"
            class="flex flex-col gap-2.5 border-t border-border/60 pt-2.5 mt-1"
          >
            <div class="flex flex-col gap-1">
              <span class="text-muted text-[10px]">Animation</span>
              <AppSelect
                :options="transitionOptions"
                :modelValue="r.actions[0].transition.type"
                @update:model-value="updateTransitionType(idx, $event as TransitionType)"
                class="w-full"
              />
            </div>

            <div v-if="r.actions[0].transition.type !== 'INSTANT'" class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1">
                <span class="text-muted text-[10px]">Easing</span>
                <AppSelect
                  :options="easingOptions"
                  :modelValue="r.actions[0].transition.easing"
                  @update:model-value="updateTransitionEasing(idx, $event as EasingType)"
                  class="w-full"
                />
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-muted text-[10px]">Duration (ms)</span>
                <input
                  type="number"
                  :value="r.actions[0].transition.duration"
                  @change="
                    updateTransitionDuration(idx, ($event.target as HTMLInputElement).valueAsNumber)
                  "
                  class="rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PrototypePreview v-model:open="previewOpen" />
  </div>
</template>
