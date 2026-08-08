import type { DevicePreset, ZoomMode } from './types'

export interface ViewportLayout {
  scale: number
  frameWidth: number
  frameHeight: number
  deviceWidth: number
  deviceHeight: number
  bezel: number
  radius: number
  hasNotch: boolean
  hasHomeIndicator: boolean
}

export class ViewportManager {
  calculateLayout(
    containerWidth: number,
    containerHeight: number,
    frameWidth: number,
    frameHeight: number,
    preset: DevicePreset,
    showDeviceFrame: boolean,
    zoomMode: ZoomMode,
    customScale: number
  ): ViewportLayout {
    const hasDevice = showDeviceFrame && preset.width > 0

    // Dimensions of the content to be scaled inside the container
    const contentWidth = hasDevice ? preset.width + preset.bezel * 2 : frameWidth
    const contentHeight = hasDevice ? preset.height + preset.bezel * 2 : frameHeight

    let scale = 1.0

    const margin = 48 // Safe margin of 48px
    const maxW = Math.max(100, containerWidth - margin)
    const maxH = Math.max(100, containerHeight - margin)

    if (zoomMode === 'FIT') {
      scale = Math.min(maxW / contentWidth, maxH / contentHeight)
    } else if (zoomMode === 'FILL') {
      scale = Math.max(containerWidth / contentWidth, containerHeight / contentHeight)
    } else {
      scale = customScale
    }

    return {
      scale,
      frameWidth,
      frameHeight,
      deviceWidth: hasDevice ? preset.width : frameWidth,
      deviceHeight: hasDevice ? preset.height : frameHeight,
      bezel: hasDevice ? preset.bezel : 0,
      radius: hasDevice ? preset.radius : 0,
      hasNotch: hasDevice ? (preset.hasNotch ?? false) : false,
      hasHomeIndicator: hasDevice ? (preset.hasHomeIndicator ?? false) : false
    }
  }
}
