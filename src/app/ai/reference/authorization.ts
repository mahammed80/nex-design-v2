const authorizedReferences = new Set<string>()
const AUTHORIZATION_PATTERN =
  /\b(i own|we own|authorized|authorised|have permission|may use|allowed to use)\b/i
const URL_PATTERN = /https?:\/\/[^\s)\]}]+/gi

export function authorizeReferencesFromRequest(request: string): void {
  if (!AUTHORIZATION_PATTERN.test(request)) return
  for (const value of request.match(URL_PATTERN) ?? []) {
    try {
      authorizedReferences.add(new URL(value).origin)
    } catch (error) {
      console.warn('Ignoring malformed reference URL:', error)
    }
  }
}

export function isReferenceAuthorized(url: URL): boolean {
  return authorizedReferences.has(url.origin)
}

export function clearReferenceAuthorizations(): void {
  authorizedReferences.clear()
}
