import type { FileUIPart } from 'ai'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_TEXT_ATTACHMENT_CHARS = 40_000
const MAX_INLINE_IMAGE_BYTES = 900_000
const MAX_PROXY_PAYLOAD_CHARS = 1_800_000
const MAX_IMAGE_DIMENSION = 1600

const TEXT_MEDIA_TYPES = new Set([
  'application/json',
  'image/svg+xml',
  'text/markdown',
  'text/plain'
])

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () =>
      reject(reader.error ?? new Error('Could not read file.'))
    )
    reader.readAsDataURL(blob)
  })
}

async function optimizeImage(blob: Blob): Promise<{ blob: Blob; mediaType: string }> {
  if (
    blob.size <= MAX_INLINE_IMAGE_BYTES ||
    blob.type === 'image/gif' ||
    typeof createImageBitmap !== 'function' ||
    typeof document === 'undefined'
  ) {
    return { blob, mediaType: blob.type }
  }

  const bitmap = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return { blob, mediaType: blob.type }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const optimized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82)
    })
    return optimized ? { blob: optimized, mediaType: 'image/webp' } : { blob, mediaType: blob.type }
  } finally {
    bitmap.close()
  }
}

async function imagePart(
  blob: Blob,
  filename: string,
  fallbackMediaType = 'image/png'
): Promise<FileUIPart> {
  const optimized = await optimizeImage(blob)
  return {
    type: 'file',
    mediaType: optimized.mediaType || fallbackMediaType,
    filename,
    url: await blobToDataUrl(optimized.blob)
  }
}

function attachmentMediaType(file: File): string {
  if (file.type) return file.type
  if (file.name.endsWith('.md')) return 'text/markdown'
  if (file.name.endsWith('.json')) return 'application/json'
  if (file.name.endsWith('.svg')) return 'image/svg+xml'
  return 'text/plain'
}

function assertAttachmentSize(file: File): void {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is larger than the 10 MB attachment limit.`)
  }
}

export async function prepareChatAttachments(
  text: string,
  files: File[]
): Promise<{ text: string; files: FileUIPart[] }> {
  const imageParts: FileUIPart[] = []
  const textBlocks: string[] = []

  for (const file of files) {
    assertAttachmentSize(file)
    const mediaType = attachmentMediaType(file)
    if (TEXT_MEDIA_TYPES.has(mediaType)) {
      const content = (await file.text()).slice(0, MAX_TEXT_ATTACHMENT_CHARS)
      textBlocks.push(`Attached file: ${file.name}\n\n${content}`)
      continue
    }
    if (!mediaType.startsWith('image/')) {
      throw new Error(`${file.name} is not a supported image or text attachment.`)
    }
    imageParts.push(await imagePart(file, file.name, mediaType))
  }

  return {
    text: [text.trim(), ...textBlocks].filter(Boolean).join('\n\n---\n\n'),
    files: imageParts
  }
}

export async function referenceImagePart(
  url: string,
  filename: string
): Promise<FileUIPart | null> {
  if (!url) return null
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read the ${filename} reference image.`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) return null
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${filename} is larger than the 10 MB attachment limit.`)
  }
  return imagePart(blob, filename, blob.type)
}

export function assertChatPayloadSize(text: string, files: FileUIPart[]): void {
  const payloadChars = text.length + files.reduce((total, file) => total + file.url.length, 0)
  if (payloadChars > MAX_PROXY_PAYLOAD_CHARS) {
    throw new Error('Combined attachments are too large. Remove an image or use a smaller crop.')
  }
}
