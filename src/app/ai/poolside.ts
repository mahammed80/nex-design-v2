import { IS_BROWSER, IS_TAURI } from '@nex-design/core/constants'

export const POOLSIDE_MODEL_ID = 'poolside/laguna-s-2.1'
export const POOLSIDE_MODEL_NAME = 'Poolside Laguna S 2.1'

const HOSTED_PROXY_BASE_URL = 'https://app.nexdesign.dev/api/poolside/v1'

export function getPoolsideProxyBaseUrl(): string {
  if (IS_TAURI && !import.meta.env.DEV) return HOSTED_PROXY_BASE_URL
  if (!IS_BROWSER) return '/api/poolside/v1'
  return `${window.location.origin}/api/poolside/v1`
}
