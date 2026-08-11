<script setup lang="ts">
import { computed, nextTick, ref, watch, onUnmounted } from 'vue'
import { DialogRoot, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from 'reka-ui'
import { useElementSize } from '@vueuse/core'

import { useEditorStore } from '@/app/editor/active-store'
import { PresentationManager } from '@/app/prototype/presentation-manager'
import { DEVICE_PRESETS } from '@/app/prototype/device-frame-renderer'
import PrototypeNode from './PrototypeNode.vue'

const { open } = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const editor = useEditorStore()
const presentationManager = new PresentationManager(editor)

const isOpen = computed({
  get: () => open,
  set: (val) => emit('update:open', val)
})

// Sync Dialog open state with PresentationManager
watch(
  () => open,
  (open) => {
    if (open) {
      presentationManager.startPresentation()
    } else {
      presentationManager.stopPresentation()
    }
  }
)

watch(
  () => presentationManager.state.isOpen,
  (val) => {
    if (!val) {
      isOpen.value = false
    }
  }
)

const activeFrameId = computed(() => presentationManager.state.activeFrameId)
const activeFrame = computed(() => {
  if (!activeFrameId.value) return null
  return presentationManager.prototypeEngine.stateManager.getNode(activeFrameId.value) ?? null
})

const overlayFrame = computed(() => {
  const id = presentationManager.activeOverlay.nodeId
  return id ? (presentationManager.prototypeEngine.stateManager.getNode(id) ?? null) : null
})

// Map of all page nodes for rapid access
const nodesMap = computed(() => {
  return presentationManager.prototypeEngine.stateManager.nodesMap
})

// Fullscreen API Handling
const fullscreenRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)

async function handlePrototypeInteraction(payload: { nodeId: string; triggerType: string }) {
  const result = presentationManager.handleInteraction(payload.nodeId, payload.triggerType)
  if (!result?.scrollTargetId) return
  await nextTick()
  const target = document.querySelector<HTMLElement>(
    `[data-prototype-node-id="${CSS.escape(result.scrollTargetId)}"]`
  )
  target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
}

function toggleFullscreen() {
  if (!fullscreenRef.value) return
  if (!document.fullscreenElement) {
    fullscreenRef.value
      .requestFullscreen()
      .then(() => {
        isFullscreen.value = true
        presentationManager.state.isFullscreen = true
      })
      .catch((err) => {
        console.error('Fullscreen request failed:', err)
      })
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
    presentationManager.state.isFullscreen = false
  }
}

// Watch native fullscreen changes (e.g. Escape key)
watch(
  () => document.fullscreenElement,
  (el) => {
    isFullscreen.value = !!el
    presentationManager.state.isFullscreen = !!el
  }
)

// Viewport Scaling Calculations
const arenaRef = ref<HTMLDivElement | null>(null)
const { width: arenaW, height: arenaH } = useElementSize(arenaRef)

const currentPreset = computed(() => DEVICE_PRESETS[presentationManager.state.deviceType])

const layout = computed(() => {
  if (!activeFrame.value) return null
  return presentationManager.viewportManager.calculateLayout(
    arenaW.value || 800,
    arenaH.value || 600,
    activeFrame.value.width,
    activeFrame.value.height,
    currentPreset.value,
    presentationManager.state.showDeviceFrame,
    presentationManager.state.zoomMode,
    presentationManager.state.customZoom
  )
})

onUnmounted(() => {
  presentationManager.stopPresentation()
})
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md" />
      <DialogContent
        ref="fullscreenRef"
        class="fixed top-1/2 left-1/2 z-50 flex h-[90vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-panel shadow-2xl focus:outline-none overflow-hidden transition-all duration-200"
        :class="{ 'h-screen w-screen rounded-none border-none': isFullscreen }"
      >
        <DialogTitle class="sr-only">Prototype Presentation</DialogTitle>

        <!-- Presentation Toolbar (Figma Style) -->
        <div
          class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[#18181c] px-5 select-none"
        >
          <div class="flex items-center gap-3">
            <span class="font-semibold text-xs text-white tracking-wide"
              >Prototype Presentation</span
            >
            <span
              v-if="activeFrame"
              class="text-[10px] font-medium text-muted bg-[#232329] px-2.5 py-0.5 rounded-full"
            >
              {{ activeFrame.name }}
            </span>
          </div>

          <!-- Controls Panel -->
          <div class="flex items-center gap-4">
            <!-- Navigation Back/Forward History -->
            <div class="flex items-center bg-[#232329] rounded-lg p-0.5 border border-border">
              <button
                class="flex size-7 items-center justify-center rounded text-muted hover:text-white disabled:opacity-35 disabled:hover:text-muted transition-colors"
                :disabled="!presentationManager.history.canGoBack()"
                @click="presentationManager.navigationController.goBack()"
                title="Back (←)"
              >
                <icon-lucide-chevron-left class="size-4" />
              </button>
              <div class="h-4 w-px bg-border mx-0.5"></div>
              <button
                class="flex size-7 items-center justify-center rounded text-muted hover:text-white disabled:opacity-35 disabled:hover:text-muted transition-colors"
                :disabled="!presentationManager.history.canGoForward()"
                @click="presentationManager.navigationController.goForward()"
                title="Forward (→)"
              >
                <icon-lucide-chevron-right class="size-4" />
              </button>
            </div>

            <!-- Restart Button -->
            <button
              class="flex items-center gap-1.5 rounded-lg bg-[#232329] border border-border px-3 py-1.5 text-xs text-muted hover:text-white hover:bg-[#2b2b33] transition-all"
              @click="presentationManager.restartPrototype()"
              title="Restart flow (R)"
            >
              <icon-lucide-rotate-ccw class="size-3.5" />
              <span class="font-medium">Restart</span>
            </button>

            <!-- Device Selector -->
            <div class="flex items-center bg-[#232329] border border-border rounded-lg px-2 py-0.5">
              <span class="text-[10px] text-muted font-medium mr-2">Device:</span>
              <select
                v-model="presentationManager.state.deviceType"
                class="bg-transparent text-white text-xs border-none focus:outline-none pr-4 py-1 font-semibold cursor-pointer"
              >
                <option value="NONE">None</option>
                <option value="IPHONE">iPhone 15 Pro</option>
                <option value="ANDROID">Pixel 8</option>
                <option value="TABLET">iPad Pro</option>
                <option value="DESKTOP">MacBook Pro</option>
              </select>
              <button
                v-if="presentationManager.state.deviceType !== 'NONE'"
                class="ml-2 flex size-6 items-center justify-center rounded text-muted hover:text-white transition-colors"
                @click="
                  presentationManager.state.showDeviceFrame =
                    !presentationManager.state.showDeviceFrame
                "
                :title="
                  presentationManager.state.showDeviceFrame
                    ? 'Hide Device Frame'
                    : 'Show Device Frame'
                "
                :class="{ 'text-[#38bdf8]': presentationManager.state.showDeviceFrame }"
              >
                <icon-lucide-smartphone class="size-3.5" />
              </button>
            </div>

            <!-- Zoom Controller -->
            <div class="flex items-center bg-[#232329] border border-border rounded-lg p-0.5">
              <button
                class="flex size-7 items-center justify-center rounded text-muted hover:text-white transition-colors"
                @click="presentationManager.zoomController.zoomOut()"
                title="Zoom Out"
              >
                <icon-lucide-zoom-out class="size-3.5" />
              </button>
              <select
                v-model="presentationManager.state.zoomMode"
                class="bg-transparent text-white text-xs border-none focus:outline-none px-1 text-center font-semibold cursor-pointer"
              >
                <option value="FIT">Fit</option>
                <option value="FILL">Fill</option>
                <option value="100%">100%</option>
              </select>
              <button
                class="flex size-7 items-center justify-center rounded text-muted hover:text-white transition-colors"
                @click="presentationManager.zoomController.zoomIn()"
                title="Zoom In"
              >
                <icon-lucide-zoom-in class="size-3.5" />
              </button>
            </div>

            <!-- Fullscreen -->
            <button
              class="flex size-8 items-center justify-center rounded-lg bg-[#232329] border border-border text-muted hover:text-white hover:bg-[#2b2b33] transition-all"
              @click="toggleFullscreen"
              :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
            >
              <icon-lucide-minimize v-if="isFullscreen" class="size-4" />
              <icon-lucide-maximize v-else class="size-4" />
            </button>

            <div class="w-px h-6 bg-border"></div>

            <!-- Close Button -->
            <button
              class="flex size-8 items-center justify-center rounded-lg text-muted hover:text-white hover:bg-[#ff4d4d]/10 hover:text-[#ff4d4d] transition-all"
              @click="isOpen = false"
              title="Close"
            >
              <icon-lucide-x class="size-4.5" />
            </button>
          </div>
        </div>

        <!-- Simulation Arena -->
        <div
          ref="arenaRef"
          class="flex flex-1 items-center justify-center bg-[#0d0d11] overflow-auto select-none scrollbar-thin relative p-12"
        >
          <div v-if="!activeFrameId" class="text-muted text-xs font-medium tracking-wide">
            No starting frame detected. Connect reactions or set a Flow Starting Point.
          </div>

          <!-- Scaled Viewport Container -->
          <div
            v-else-if="layout"
            class="relative flex items-center justify-center transition-all duration-300 ease-out"
            :style="{
              transform: `scale(${layout.scale})`,
              transformOrigin: 'center center',
              width: `${layout.deviceWidth + layout.bezel * 2}px`,
              height: `${layout.deviceHeight + layout.bezel * 2}px`
            }"
          >
            <!-- Realistic Device hardware mockup shell -->
            <div
              class="relative bg-[#08080a] text-white flex items-center justify-center shadow-2xl transition-all duration-300 border-[#222] border-4"
              :style="{
                width: `${layout.deviceWidth + layout.bezel * 2}px`,
                height: `${layout.deviceHeight + layout.bezel * 2}px`,
                borderRadius: `${layout.radius}px`,
                padding: `${layout.bezel}px`
              }"
            >
              <!-- Screen border wrapping frame content -->
              <div
                class="relative size-full overflow-hidden bg-[#151518]"
                :style="{
                  borderRadius: `${Math.max(0, layout.radius - layout.bezel)}px`
                }"
              >
                <!-- Time & Status bar icons (iPhone/Android UI) -->
                <div
                  v-if="
                    presentationManager.state.deviceType === 'IPHONE' ||
                    presentationManager.state.deviceType === 'ANDROID'
                  "
                  class="absolute top-0 left-0 right-0 h-10 px-6 flex items-center justify-between text-[11px] font-bold tracking-wide z-30 select-none text-white pointer-events-none"
                >
                  <span>9:41</span>
                  <div class="flex items-center gap-1.5">
                    <icon-lucide-signal class="size-3" />
                    <icon-lucide-wifi class="size-3" />
                    <icon-lucide-battery class="size-3.5" />
                  </div>
                </div>

                <!-- Dynamic Island (iOS Notched Screen) -->
                <div
                  v-if="layout.hasNotch && presentationManager.state.deviceType === 'IPHONE'"
                  class="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6.5 bg-black rounded-full z-40 border border-[#333]/30 flex items-center justify-end px-3 shadow-inner pointer-events-none"
                >
                  <div
                    class="size-1.5 bg-[#1a1a24] rounded-full border border-neutral-900 shadow"
                  ></div>
                </div>

                <!-- Hole Punch Notch (Android Notch Screen) -->
                <div
                  v-if="layout.hasNotch && presentationManager.state.deviceType === 'ANDROID'"
                  class="absolute top-3 left-1/2 -translate-x-1/2 size-4.5 bg-black rounded-full z-40 border border-[#333]/30 flex items-center justify-center pointer-events-none"
                >
                  <div
                    class="size-1 bg-[#1a1a24] rounded-full border border-neutral-900 shadow"
                  ></div>
                </div>

                <!-- Home gesture line indicator (iOS Screen) -->
                <div
                  v-if="layout.hasHomeIndicator"
                  class="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-30 pointer-events-none"
                ></div>

                <!-- Transition Arena for only the Active Screen -->
                <Transition
                  :name="presentationManager.state.transitionName"
                  :style="{
                    '--transition-duration': `${presentationManager.state.transitionDuration}ms`,
                    '--transition-easing': presentationManager.prototypeEngine.animationManager.getEasingCSS(presentationManager.state.transitionEasing || 'EASE_IN_AND_OUT')
                  }"
                >
                  <!-- Outer div: handles transition animations (sliding/moving/fade) -->
                  <div :key="activeFrameId" class="absolute inset-0 size-full overflow-hidden">
                    <!-- Inner div: handles canvas layout design scaling -->
                    <div
                      class="absolute inset-0 size-full"
                      :style="{
                        transform: `scale(${layout.deviceWidth / layout.frameWidth}, ${layout.deviceHeight / layout.frameHeight})`,
                        transformOrigin: 'top left'
                      }"
                    >
                      <PrototypeNode
                        v-if="activeFrame"
                        :node="activeFrame"
                        :nodesMap="nodesMap"
                        :is-root="true"
                        @interaction="handlePrototypeInteraction"
                      />
                    </div>
                  </div>
                </Transition>

                <!-- Active Overlay Layer -->
                <div
                  v-if="presentationManager.activeOverlay.isOpen && overlayFrame"
                  class="absolute inset-0 z-50 flex items-center justify-center transition-all duration-300"
                  :class="{
                    'bg-black/50': presentationManager.activeOverlay.settings?.backdrop !== false
                  }"
                  :style="{
                    backgroundColor:
                      presentationManager.activeOverlay.settings?.backdrop === false
                        ? undefined
                        : `rgb(0 0 0 / ${presentationManager.activeOverlay.settings?.backdropOpacity ?? 0.5})`
                  }"
                  @click.self="
                    presentationManager.activeOverlay.settings?.closeOnOutsideClick !== false &&
                    (presentationManager.activeOverlay.isOpen = false)
                  "
                >
                  <div
                    class="relative shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-background"
                    :style="{
                      width: `${overlayFrame.width}px`,
                      height: `${overlayFrame.height}px`
                    }"
                  >
                    <PrototypeNode
                      :node="overlayFrame"
                      :nodesMap="nodesMap"
                      :is-root="true"
                      @interaction="handlePrototypeInteraction"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
<style scoped>
/* Dissolve Transition */
.dissolve-enter-active,
.dissolve-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.dissolve-enter-from,
.dissolve-leave-to {
  opacity: 0;
}

/* Push Left Transition */
.push-left-enter-active,
.push-left-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}
.push-left-enter-from {
  transform: translateX(100%);
}
.push-left-leave-to {
  transform: translateX(-100%);
}

/* Push Right Transition */
.push-right-enter-active,
.push-right-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}
.push-right-enter-from {
  transform: translateX(-100%);
}
.push-right-leave-to {
  transform: translateX(100%);
}

/* Push Top Transition */
.push-top-enter-active,
.push-top-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}
.push-top-enter-from {
  transform: translateY(100%);
}
.push-top-leave-to {
  transform: translateY(-100%);
}

/* Push Bottom Transition */
.push-bottom-enter-active,
.push-bottom-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}
.push-bottom-enter-from {
  transform: translateY(-100%);
}
.push-bottom-leave-to {
  transform: translateY(100%);
}

/* Move In Left */
.move-in-left-enter-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-in-left-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-in-left-enter-from {
  transform: translateX(100%);
}
.move-in-left-leave-to {
  opacity: 0.5;
}

/* Move In Right */
.move-in-right-enter-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-in-right-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-in-right-enter-from {
  transform: translateX(-100%);
}
.move-in-right-leave-to {
  opacity: 0.5;
}

/* Move In Top */
.move-in-top-enter-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-in-top-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-in-top-enter-from {
  transform: translateY(100%);
}
.move-in-top-leave-to {
  opacity: 0.5;
}

/* Move In Bottom */
.move-in-bottom-enter-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-in-bottom-leave-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-in-bottom-enter-from {
  transform: translateY(-100%);
}
.move-in-bottom-leave-to {
  opacity: 0.5;
}

/* Move Out Left */
.move-out-left-enter-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-out-left-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-out-left-enter-from {
  opacity: 0.5;
}
.move-out-left-leave-to {
  transform: translateX(-100%);
}

/* Move Out Right */
.move-out-right-enter-active {
  transition: opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
  z-index: 1;
}
.move-out-right-leave-active {
  transition: transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  z-index: 2;
}
.move-out-right-enter-from {
  opacity: 0.5;
}
.move-out-right-leave-to {
  transform: translateX(100%);
}

/* Slide Left */
.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-left-enter-from {
  transform: translateX(30%);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

/* Slide Right */
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-right-enter-from {
  transform: translateX(-30%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}

/* Slide In Left */
.slide-in-left-enter-active,
.slide-in-left-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-in-left-enter-from {
  transform: translateX(30%);
  opacity: 0;
}
.slide-in-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

/* Slide In Right */
.slide-in-right-enter-active,
.slide-in-right-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-in-right-enter-from {
  transform: translateX(-30%);
  opacity: 0;
}
.slide-in-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}

/* Slide Out Left */
.slide-out-left-enter-active,
.slide-out-left-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-out-left-enter-from {
  transform: translateX(30%);
  opacity: 0;
}
.slide-out-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

/* Slide Out Right */
.slide-out-right-enter-active,
.slide-out-right-leave-active {
  transition:
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    opacity var(--transition-duration, 300ms) var(--transition-easing, ease);
}
.slide-out-right-enter-from {
  transform: translateX(-30%);
  opacity: 0;
}
.slide-out-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}

/* Smart Animate / Cross scale */
.smart-animate-enter-active,
.smart-animate-leave-active {
  transition:
    opacity var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1)),
    transform var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}
.smart-animate-enter-from,
.smart-animate-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Instant Transition */
.instant-enter-active,
.instant-leave-active {
  transition: none;
}
</style>
