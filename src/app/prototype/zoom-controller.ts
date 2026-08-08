import { ref } from 'vue'

import type { ZoomMode } from './types'

export class ZoomController {
  private zoomMode = ref<ZoomMode>('FIT')
  private customScale = ref<number>(1.0)

  setZoomMode(mode: ZoomMode) {
    this.zoomMode.value = mode
  }

  getZoomMode(): ZoomMode {
    return this.zoomMode.value
  }

  getCustomScale(): number {
    return this.customScale.value
  }

  setCustomScale(scale: number) {
    this.zoomMode.value = '100%'
    this.customScale.value = Math.max(0.1, Math.min(5.0, scale))
  }

  zoomIn() {
    if (this.zoomMode.value !== '100%') {
      this.zoomMode.value = '100%'
      this.customScale.value = 1.0
    }
    this.setCustomScale(this.customScale.value + 0.1)
  }

  zoomOut() {
    if (this.zoomMode.value !== '100%') {
      this.zoomMode.value = '100%'
      this.customScale.value = 1.0
    }
    this.setCustomScale(this.customScale.value - 0.1)
  }

  reset() {
    this.zoomMode.value = 'FIT'
    this.customScale.value = 1.0
  }
}
