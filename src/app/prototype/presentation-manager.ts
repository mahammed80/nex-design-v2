import { reactive, watch } from 'vue'

import type { OverlaySettings, SceneNode } from '@nex-design/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

import { HistoryManager } from './history-manager'
import { InteractionEngine } from './interaction-engine'
import { NavigationController } from './navigation-controller'
import { TransitionEngine } from './transition-engine'
import type { PresentationState } from './types'
import { ViewportManager } from './viewport-manager'
import { ZoomController } from './zoom-controller'

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
    transitionDuration: 300
  })

  public history = new HistoryManager()
  public zoomController = new ZoomController()
  public viewportManager = new ViewportManager()
  public transitionEngine = new TransitionEngine()
  public navigationController!: NavigationController
  public interactionEngine!: InteractionEngine

  private delayTimeouts: ReturnType<typeof setTimeout>[] = []

  constructor(private editor: EditorStore) {
    this.navigationController = new NavigationController(
      editor,
      this.history,
      this.transitionEngine,
      this.state
    )
    this.interactionEngine = new InteractionEngine(editor, this.navigationController)

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

  startPresentation() {
    this.history.clear()
    this.clearDelayTriggers()
    this.zoomController.reset()
    this.state.zoomMode = 'FIT'
    this.state.customZoom = 1.0
    this.state.isOpen = true

    const pageId = this.editor.state.currentPageId
    const page = this.editor.graph.getNode(pageId)

    if (page?.prototypeStartNodeId && this.editor.graph.nodes.has(page.prototypeStartNodeId)) {
      this.state.activeFrameId = page.prototypeStartNodeId
    } else {
      // Fall back to first frame on current page
      const frames = this.editor.graph
        .getChildren(pageId)
        .filter(
          (n: SceneNode) =>
            n.type === 'FRAME' ||
            n.type === 'COMPONENT' ||
            n.type === 'INSTANCE' ||
            n.type === 'SECTION'
        )
      if (frames.length > 0) {
        this.state.activeFrameId = frames[0].id
      } else {
        this.state.activeFrameId = ''
      }
    }

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

  restartPrototype() {
    this.history.clear()
    this.clearDelayTriggers()

    const pageId = this.editor.state.currentPageId
    const page = this.editor.graph.getNode(pageId)

    if (page?.prototypeStartNodeId && this.editor.graph.nodes.has(page.prototypeStartNodeId)) {
      this.state.activeFrameId = page.prototypeStartNodeId
    } else {
      const frames = this.editor.graph
        .getChildren(pageId)
        .filter(
          (n: SceneNode) =>
            n.type === 'FRAME' ||
            n.type === 'COMPONENT' ||
            n.type === 'INSTANCE' ||
            n.type === 'SECTION'
        )
      if (frames.length > 0) {
        this.state.activeFrameId = frames[0].id
      }
    }
  }

  public activeOverlay = reactive<{
    isOpen: boolean
    nodeId: string
    settings?: OverlaySettings
  }>({
    isOpen: false,
    nodeId: ''
  })

  handleInteraction(nodeId: string, triggerType: string) {
    const res = this.interactionEngine.handleInteraction(nodeId, triggerType)
    if (res === 'CLOSE') {
      if (this.activeOverlay.isOpen) {
        this.activeOverlay.isOpen = false
      } else {
        this.stopPresentation()
      }
    } else if (typeof res === 'object' && res.handled && res.overlayId) {
      this.activeOverlay.isOpen = true
      this.activeOverlay.nodeId = res.overlayId
      this.activeOverlay.settings = res.overlaySettings as OverlaySettings
    }
    return typeof res === 'object' ? res : undefined
  }

  private clearDelayTriggers() {
    for (const t of this.delayTimeouts) clearTimeout(t)
    this.delayTimeouts = []
  }

  private setupDelayTriggers() {
    this.clearDelayTriggers()
    if (!this.state.activeFrameId) return

    const frame = this.editor.graph.getNode(this.state.activeFrameId)
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
        const child = this.editor.graph.getNode(childId)
        if (child?.visible) walk(child)
      }
    }

    walk(frame)
  }
}
