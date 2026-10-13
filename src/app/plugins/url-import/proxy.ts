import { IS_TAURI } from '@nex-design/core/constants'

const HOSTED_URL_FETCH_PROXY = 'https://app.nexdesign.dev/api/url-fetch'

export function getUrlFetchProxy(): string {
  if (IS_TAURI && !import.meta.env.DEV) return HOSTED_URL_FETCH_PROXY
  return '/api/url-fetch'
}
