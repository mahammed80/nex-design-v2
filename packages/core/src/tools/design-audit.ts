import type { SceneGraph, SceneNode } from '#core/scene-graph'

import { detectIssues } from './describe/issues'
import { defineTool } from './schema'

export interface DesignAuditFinding {
  severity: 'error' | 'warning' | 'info'
  category: 'layout' | 'originality' | 'consistency'
  nodeId: string
  message: string
  suggestion: string
}

function descendants(graph: SceneGraph, root: SceneNode): SceneNode[] {
  const result: SceneNode[] = []
  const pending = [root.id]
  while (pending.length > 0) {
    const id = pending.pop()
    if (!id) continue
    const node = graph.getNode(id)
    if (!node) continue
    result.push(node)
    pending.push(...node.childIds)
  }
  return result
}

export function auditDesign(graph: SceneGraph, root: SceneNode): DesignAuditFinding[] {
  const nodes = descendants(graph, root)
  const findings: DesignAuditFinding[] = []
  for (const node of nodes) {
    for (const issue of detectIssues(node, 4, graph)) {
      findings.push({
        severity: issue.severity ?? 'warning',
        category: 'layout',
        nodeId: node.id,
        message: issue.message,
        suggestion: issue.suggestion ?? 'Inspect and correct the affected node.'
      })
    }
  }

  const radii = new Set(nodes.map((node) => node.cornerRadius).filter((radius) => radius > 0))
  if (radii.size > 5) {
    findings.push({
      severity: 'warning',
      category: 'consistency',
      nodeId: root.id,
      message: `The design uses ${radii.size} corner-radius values.`,
      suggestion: 'Consolidate radii into a small, intentional scale.'
    })
  }

  const topContainers = root.childIds
    .map((id) => graph.getNode(id))
    .filter((node): node is SceneNode => !!node && node.type === 'FRAME')
  const repeatedSizes = topContainers.filter(
    (node) =>
      topContainers.filter(
        (candidate) =>
          Math.abs(candidate.width - node.width) < 2 && Math.abs(candidate.height - node.height) < 2
      ).length >= 3
  )
  if (repeatedSizes.length >= 3) {
    findings.push({
      severity: 'info',
      category: 'originality',
      nodeId: root.id,
      message: `${repeatedSizes.length} top-level sections share the same dimensions.`,
      suggestion:
        'Confirm that equal cards support the content rather than reflecting a default grid.'
    })
  }
  return findings
}

export const designAudit = defineTool({
  name: 'design_audit',
  description:
    'Run a deterministic design-quality audit for layout, consistency, and generic structural patterns. Read-only.',
  params: { id: { type: 'string', description: 'Root node ID. Defaults to the current page.' } },
  execute: (figma, args) => {
    const root = args.id ? figma.graph.getNode(args.id) : figma.graph.getNode(figma.currentPageId)
    if (!root) return { error: `Node not found: ${args.id ?? figma.currentPageId}` }
    const findings = auditDesign(figma.graph, root)
    const penalties = findings.reduce((score, finding) => {
      if (finding.severity === 'error') return score + 8
      if (finding.severity === 'warning') return score + 3
      return score + 1
    }, 0)
    return {
      rootId: root.id,
      score: Math.max(0, 100 - penalties),
      counts: {
        error: findings.filter((finding) => finding.severity === 'error').length,
        warning: findings.filter((finding) => finding.severity === 'warning').length,
        info: findings.filter((finding) => finding.severity === 'info').length
      },
      findings: findings.slice(0, 80)
    }
  }
})
