import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CAPABILITY_EVIDENCE } from './evidence'

export type CapabilityStatus = 'missing' | 'partial' | 'supported' | 'verified'

export interface ParityCapability {
  id: string
  category: string
  name: string
  status: CapabilityStatus
  notes: string
  acceptance: string
  evidence: string[]
}

export interface ParityRegistry {
  schemaVersion: 1
  generatedFrom: string
  sourceHash: string
  capabilities: ParityCapability[]
  summary: Record<CapabilityStatus | 'total' | 'addressed', number>
  confidenceScore: number
}

const STATUS_MAP: Record<string, CapabilityStatus> = {
  '🔲': 'missing',
  '🟡': 'partial',
  '✅': 'supported',
  '🧪': 'verified'
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase()
}

function parseTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

export function createParityRegistry(sourcePath: string): ParityRegistry {
  const source = readFileSync(sourcePath, 'utf8')
  return parseParityRegistry(source)
}

export function parseParityRegistry(source: string): ParityRegistry {
  const normalizedSource = source.replace(/^\*\*Coverage:\*\*.*$/m, '')
  const capabilities: ParityCapability[] = []
  const usedIds = new Set<string>()
  let category = ''

  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      category = line.slice(3).trim()
      continue
    }
    if (!category || !line.startsWith('|') || line.includes('| Feature |')) continue

    const [name, marker, notes = ''] = parseTableRow(line)
    const status = STATUS_MAP[marker]
    if (!name || !status) continue

    const baseId = `${slug(category)}.${slug(name)}`
    let id = baseId
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${baseId}.${suffix}`
      suffix++
    }
    usedIds.add(id)
    const documentedEvidence = CAPABILITY_EVIDENCE[id]
    const evidence = documentedEvidence?.tests ?? []
    capabilities.push({
      id,
      category,
      name,
      status: status === 'supported' && evidence.length > 0 ? 'verified' : status,
      notes,
      acceptance:
        documentedEvidence?.acceptance ??
        `Complete the documented “${name}” workflow end-to-end with undo, persistence, and platform coverage.`,
      evidence
    })
  }

  const count = (status: CapabilityStatus) =>
    capabilities.filter((capability) => capability.status === status).length
  const missing = count('missing')
  const partial = count('partial')
  const supported = count('supported')
  const verified = count('verified')
  const confidenceScore = Number(
    (((partial * 0.5 + supported * 0.75 + verified) / capabilities.length) * 100).toFixed(1)
  )

  return {
    schemaVersion: 1,
    generatedFrom: 'packages/docs/guide/figma-comparison.md',
    sourceHash: createHash('sha256').update(normalizedSource).digest('hex'),
    capabilities,
    summary: {
      total: capabilities.length,
      addressed: partial + supported + verified,
      missing,
      partial,
      supported,
      verified
    },
    confidenceScore
  }
}

export function validateRegistryEvidence(registry: ParityRegistry, root: string): string[] {
  const failures: string[] = []
  for (const capability of registry.capabilities) {
    if (!capability.acceptance.trim())
      failures.push(`${capability.id}: missing acceptance criteria`)
    for (const evidence of capability.evidence) {
      if (!existsSync(resolve(root, evidence)))
        failures.push(`${capability.id}: missing ${evidence}`)
    }
    if (capability.status === 'verified' && capability.evidence.length === 0) {
      failures.push(`${capability.id}: verified without evidence`)
    }
  }
  return failures
}

export function registryCoverageLine(registry: ParityRegistry): string {
  const { total, addressed, missing, partial, supported, verified } = registry.summary
  return `**Coverage:** ${addressed} of ${total} Figma feature items addressed — ${supported} ✅ supported, ${verified} 🧪 verified, ${partial} 🟡 partial, ${missing} 🔲 not yet.`
}
