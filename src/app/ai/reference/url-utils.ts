const MAX_REFERENCE_BYTES = 1_000_000
const PRIVATE_HOST_PATTERN = /^(?:localhost|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i

export function validateReferenceUrl(value: string): URL {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Only HTTP(S) references are allowed.')
  if (PRIVATE_HOST_PATTERN.test(url.hostname))
    throw new Error('Private-network references are not allowed.')
  return url
}

export function uniqueMatches(text: string, pattern: RegExp, limit: number): string[] {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[0]))].slice(0, limit)
}

export { MAX_REFERENCE_BYTES }
