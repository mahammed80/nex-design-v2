import { getToolName, isTextUIPart, isToolUIPart } from 'ai'

import type { UIDataTypes, UIMessagePart, UITools } from 'ai'

export type MessagePart = UIMessagePart<UIDataTypes, UITools>
export type ToolPart = Extract<MessagePart, { toolCallId: string }>
export type ToolState = 'pending' | 'done' | 'error'

export type MessageSegment =
  | { kind: 'part'; key: string; part: MessagePart }
  | { kind: 'tools'; key: string; parts: ToolPart[] }

export function toolDisplayName(part: ToolPart): string {
  return getToolName(part)
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function hasErrorOutput(part: ToolPart): boolean {
  return (
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    'error' in part.output
  )
}

export function toolState(part: ToolPart): ToolState {
  if (part.state === 'output-error' || hasErrorOutput(part)) return 'error'
  if (part.state === 'output-available') return 'done'
  return 'pending'
}

/** Worst state wins: a running call keeps the group running, then any error shows. */
export function groupState(parts: ToolPart[]): ToolState {
  const states = parts.map(toolState)
  if (states.includes('pending')) return 'pending'
  if (states.includes('error')) return 'error'
  return 'done'
}

/** "Batch Update ×3, Render ×2" in first-seen order. */
export function groupSummary(parts: ToolPart[]): string {
  const counts = new Map<string, number>()
  for (const part of parts) {
    const name = toolDisplayName(part)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name)).join(', ')
}

export function partKey(part: MessagePart, index: number): string {
  if ('toolCallId' in part) return part.toolCallId
  return `part-${index}`
}

/**
 * Collapse runs of consecutive tool calls so long agent loops read as one step.
 * Only visible text breaks a run; step markers, reasoning and empty text are dropped.
 */
export function segmentParts(parts: MessagePart[]): MessageSegment[] {
  const segments: MessageSegment[] = []
  parts.forEach((part, index) => {
    if (!isToolUIPart(part)) {
      if (!isTextUIPart(part) || !part.text.trim()) return
      segments.push({ kind: 'part', key: partKey(part, index), part })
      return
    }
    const last = segments.at(-1)
    if (last?.kind === 'tools') last.parts.push(part)
    else segments.push({ kind: 'tools', key: part.toolCallId, parts: [part] })
  })
  return segments
}
