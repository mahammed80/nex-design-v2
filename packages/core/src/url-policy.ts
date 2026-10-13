const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /^0(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^127(?:\.\d{1,3}){3}$/,
  /^169\.254(?:\.\d{1,3}){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe[89ab][0-9a-f]:/i
]

export function validateRemoteUrl(value: string, base?: string): URL {
  const url = new URL(value, base)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP(S) URLs can be imported.')
  }
  if (url.username || url.password) {
    throw new Error('URLs containing credentials cannot be imported.')
  }
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error('Private-network URLs cannot be imported.')
  }
  return url
}

export function rewriteCssUrls(css: string, stylesheetUrl: string): string {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote: string, value: string) => {
    const trimmed = value.trim()
    if (/^(?:data:|blob:|#)/i.test(trimmed)) return match
    try {
      const resolved = validateRemoteUrl(trimmed, stylesheetUrl).toString()
      return `url(${quote}${resolved}${quote})`
    } catch {
      return match
    }
  })
}
