import { reactive, watch } from 'vue'

import type { OverlaySettings, PrototypeFlow, SceneNode } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

import { HistoryManager } from './history-manager'
import { NavigationController } from './navigation-controller'
import { PrototypeEngine } from './prototype-engine'
import { TransitionEngine } from './transition-engine'
import type { PresentationState } from './types'
import { ViewportManager } from './viewport-manager'
import { ZoomController } from './zoom-controller'

const SCREEN_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'SECTION'])

export interface OverlayEntry {
  nodeId: string
  settings?: OverlaySettings
  /** Screen (or overlay) that opened it; MANUAL offsets are relative to this. */
  sourceFrameId: string
}

export class PresentationManager {
  public state = reactive<PresentationState>({
    isOpen: false,
    activeFrameId: '',
    zoomMode: 'FIT',
    customZoom: 1.0,
    deviceType: 'NONE',
    showDeviceFrame: false,
    isFullscreen: false,
    transitionName: 'instant',
    transitionDuration: 300,
    transitionEasing: 'EASE_IN_AND_OUT'
  })

  public history = new HistoryManager()
  public zoomController = new ZoomController()
  public viewportManager = new ViewportManager()
  public transitionEngine = new TransitionEngine()
  public navigationController!: NavigationController
  public prototypeEngine!: PrototypeEngine

  private delayTimeouts: ReturnType<typeof setTimeout>[] = []

  constructor(private editor: EditorStore) {
    this.navigationController = new NavigationController(
      editor,
      this.history,
      this.transitionEngine,
      this.state
    )
    this.prototypeEngine = new PrototypeEngine(editor, this)

    // Watch active screen ID changes to set up delay timers
    watch(
      () => this.state.activeFrameId,
      () => {
        this.setupDelayTriggers()
      }
    )

    // Sync state settings to zoomController
    watch(
      () => this.state.zoomMode,
      (val) => {
        this.zoomController.setZoomMode(val)
      }
    )
    watch(
      () => this.state.customZoom,
      (val) => {
        this.zoomController.setCustomScale(val)
      }
    )
  }

  /** Screens of the current page's flows, for the player's flow picker. */
  get flows(): PrototypeFlow[] {
    const page = this.editor.graph.getNode(this.editor.state.currentPageId)
    return (page?.prototypeFlows ?? []).filter((flow) =>
      this.editor.graph.nodes.has(flow.startNodeId)
    )
  }

  /** Flow start if given, else the page's default start, else its first frame. */
  private resolveStartFrame(flowStartId?: string): string {
    const graph = this.editor.graph
    if (flowStartId && graph.nodes.has(flowStartId)) return flowStartId
    const pageId = this.editor.state.currentPageId
    const start = graph.getNode(pageId)?.prototypeStartNodeId
    if (start && graph.nodes.has(start)) return start
    return graph.getChildren(pageId).find((n: SceneNode) => SCREEN_TYPES.has(n.type))?.id ?? ''
  }

  startPresentation(flowStartId?: string) {
    this.history.clear()
    this.clearDelayTriggers()
    this.overlays.splice(0)
    this.zoomController.reset()
    this.state.zoomMode = 'FIT'
    this.state.customZoom = 1.0
    this.state.isOpen = true

    // Initialize state sandbox
    this.prototypeEngine.stateManager.initialize()
    this.state.previousFrameId = undefined
    this.state.transitionName = 'instant'
    this.state.activeFrameId = this.resolveStartFrame(flowStartId)

    // Try to auto-detect device type based on initial frame aspect ratio
    const current = this.editor.graph.getNode(this.state.activeFrameId)
    if (current) {
      if (current.width < 500 && current.height > 700) {
        this.state.deviceType = 'IPHONE'
        this.state.showDeviceFrame = true
      } else if (current.width > 700 && current.width < 1200) {
        this.state.deviceType = 'TABLET'
        this.state.showDeviceFrame = true
      } else if (current.width >= 1200) {
        this.state.deviceType = 'NONE'
        this.state.showDeviceFrame = false
      }
    }

    this.setupDelayTriggers()
  }

  stopPresentation() {
    this.state.isOpen = false
    this.clearDelayTriggers()
    this.history.clear()
  }

  /** Restart the current flow (the screen the session started on) from a clean state. */
  restartPrototype(flowStartId?: string) {
    this.history.clear()
    this.clearDelayTriggers()
    this.overlays.splice(0)
    this.prototypeEngine.stateManager.initialize()
    this.state.previousFrameId = undefined
    this.state.transitionName = 'instant'
    this.state.activeFrameId = this.resolveStartFrame(flowStartId)
  }

  /** Open overlays, bottom to top. Only the top one receives outside clicks and keys first. */
  public overlays = reactive<OverlayEntry[]>([])

  /** The top overlay (kept for callers that predate stacking). */
  get activeOverlay(): { isOpen: boolean; nodeId: string; settings?: OverlaySettings } {
    const top = this.overlays.at(-1)
    return { isOpen: !!top, nodeId: top?.nodeId ?? '', settings: top?.settings }
  }

  /** OPEN stacks a new overlay; SWAP replaces the top one (or opens if none is open). */
  openOverlay(nodeId: string, settings: OverlaySettings | undefined, swap: boolean) {
    const entry: OverlayEntry = {
      nodeId,
      settings,
      sourceFrameId: this.overlays.at(-1)?.nodeId ?? this.state.activeFrameId
    }
    if (swap && this.overlays.length > 0) this.overlays.splice(this.overlays.length - 1, 1, entry)
    else this.overlays.push(entry)
  }

  /** Close the top overlay; returns false when none was open. */
  closeOverlay(): boolean {
    return this.overlays.pop() !== undefined
  }

  handleInteraction(nodeId: string, triggerType: string) {
    this.state.scrollTargetId = undefined

    // Map triggerType string to TriggerManager events. Unknown triggers are ignored rather
    // than treated as clicks — one physical click emits several triggers.
    let event: string | null = null
    if (triggerType === 'ON_CLICK') event = 'click'
    else if (triggerType === 'ON_HOVER') event = 'hover-start'
    else if (triggerType === 'ON_PRESS') event = 'press-start'
    else if (triggerType === 'MOUSE_ENTER') event = 'mouse-enter'
    else if (triggerType === 'MOUSE_LEAVE') event = 'mouse-leave'
    else if (triggerType === 'MOUSE_DOWN') event = 'mouse-down'
    else if (triggerType === 'MOUSE_UP') event = 'mouse-up'
    else if (triggerType === 'AFTER_DELAY') event = 'after-delay'
    else if (triggerType.startsWith('ON_DRAG_')) {
      event = 'drag-' + triggerType.slice('ON_DRAG_'.length).toLowerCase()
    } else if (
      triggerType.startsWith('drag-') ||
      triggerType === 'hover-end' ||
      triggerType === 'press-end'
    ) {
      event = triggerType
    }
    if (!event) return undefined

    this.prototypeEngine.triggerManager.handleEvent(nodeId, event)

    if (this.state.scrollTargetId) {
      const scrollTargetId = this.state.scrollTargetId
      this.state.scrollTargetId = undefined
      return { handled: true, scrollTargetId }
    }

    return undefined
  }

  private clearDelayTriggers() {
    for (const t of this.delayTimeouts) clearTimeout(t)
    this.delayTimeouts = []
  }

  private setupDelayTriggers() {
    this.clearDelayTriggers()
    if (!this.state.activeFrameId) return

    const frame = this.prototypeEngine.stateManager.getNode(this.state.activeFrameId)
    if (!frame) return

    const walk = (node: SceneNode) => {
      if (node.reactions) {
        for (const reaction of node.reactions) {
          if (reaction.trigger.type === 'AFTER_DELAY') {
            const delay = reaction.trigger.delay ?? 1000
            const t = setTimeout(() => {
              this.handleInteraction(node.id, 'AFTER_DELAY')
            }, delay)
            this.delayTimeouts.push(t)
          }
        }
      }
      for (const childId of node.childIds) {
        const child = this.prototypeEngine.stateManager.getNode(childId)
        if (child?.visible) walk(child)
      }
    }

    walk(frame)
  }
}
