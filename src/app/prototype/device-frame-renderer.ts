import type { DevicePreset, DeviceType } from './types'

export const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  NONE: {
    name: 'No Device',
    width: 0,
    height: 0,
    bezel: 0,
    radius: 0,
    os: 'none'
  },
  IPHONE: {
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    bezel: 12,
    radius: 40,
    hasNotch: true,
    hasHomeIndicator: true,
    os: 'ios'
  },
  ANDROID: {
    name: 'Google Pixel 8',
    width: 412,
    height: 915,
    bezel: 10,
    radius: 32,
    hasNotch: true,
    hasHomeIndicator: true,
    os: 'android'
  },
  TABLET: {
    name: 'iPad Pro 11"',
    width: 820,
    height: 1180,
    bezel: 20,
    radius: 24,
    hasHomeIndicator: true,
    os: 'ios'
  },
  DESKTOP: {
    name: 'MacBook Pro 14"',
    width: 1440,
    height: 900,
    bezel: 16,
    radius: 16,
    os: 'desktop'
  }
}
