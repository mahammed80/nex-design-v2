/**
 * Typed shallow-copy helpers for Fill, Stroke, Effect, and StyleRun.
 *
 * These replace `structuredClone` for known scene-graph array types,
 * avoiding the ~24× overhead of the generic deep-clone algorithm.
 * Each helper spreads the top-level object and any nested objects
 * (color, offset, gradientStops, dashPattern, style) to ensure
 * no shared references between source and copy.
 */

import type { Effect, Fill, GeometryPath, GradientStop, Stroke, StyleRun, SceneNode } from './'

// --- Individual copy functions ---

export function cloneNode(node: SceneNode): SceneNode {
  const clone: SceneNode = {
    ...node,
    childIds: [...node.childIds],
    fills: copyFills(node.fills),
    strokes: copyStrokes(node.strokes),
    effects: copyEffects(node.effects),
    styleRuns: copyStyleRuns(node.styleRuns),
    fillGeometry: copyGeometryPaths(node.fillGeometry),
    strokeGeometry: copyGeometryPaths(node.strokeGeometry),
    overrides: node.overrides ? structuredClone(node.overrides) : {},
    layoutGrids: node.layoutGrids ? node.layoutGrids.map((g) => ({ ...g })) : [],
    reactions: node.reactions
      ? node.reactions.map((r) => ({
          trigger: { ...r.trigger },
          actions: r.actions.map((a) => ({
            ...a,
            transition: a.transition ? { ...a.transition } : undefined
          }))
        }))
      : [],
    prototypeStartNodeId: node.prototypeStartNodeId,
    prototypeFlows: node.prototypeFlows ? node.prototypeFlows.map((f) => ({ ...f })) : [],
    prototypeConnections: node.prototypeConnections
      ? structuredClone(node.prototypeConnections)
      : []
  }
  if (node.vectorNetwork) {
    clone.vectorNetwork = {
      vertices: node.vectorNetwork.vertices.map((v) => ({ ...v })),
      segments: node.vectorNetwork.segments.map((s) => ({
        ...s,
        tangentStart: { ...s.tangentStart },
        tangentEnd: { ...s.tangentEnd }
      })),
      regions: node.vectorNetwork.regions ? structuredClone(node.vectorNetwork.regions) : []
    }
  }
  if (node.boundVariables) {
    clone.boundVariables = structuredClone(node.boundVariables)
  }
  if (node.textPicture) {
    clone.textPicture = node.textPicture.slice()
  }
  return clone
}

export function copyFill(f: Fill): Fill {
  const copy: Fill = { ...f, color: { ...f.color } }
  if (f.gradientStops) copy.gradientStops = f.gradientStops.map(copyGradientStop)
  if (f.gradientTransform) copy.gradientTransform = { ...f.gradientTransform }
  if (f.imageTransform) copy.imageTransform = { ...f.imageTransform }
  return copy
}

export function copyStroke(s: Stroke): Stroke {
  const copy: Stroke = { ...s, color: { ...s.color } }
  if (s.dashPattern) {
    copy.dashPattern = [...s.dashPattern]
  }
  return copy
}

export function copyEffect(e: Effect): Effect {
  return {
    ...e,
    color: { ...e.color },
    offset: { ...e.offset }
  }
}

export function copyStyleRun(r: StyleRun): StyleRun {
  return {
    ...r,
    style: {
      ...r.style,
      fills: r.style.fills ? r.style.fills.map(copyFill) : undefined
    }
  }
}

// --- Array copy functions ---

export function copyFills(fills: Fill[]): Fill[] {
  return fills.map(copyFill)
}

export function copyStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map(copyStroke)
}

export function copyEffects(effects: Effect[]): Effect[] {
  return effects.map(copyEffect)
}

export function copyStyleRuns(runs: StyleRun[]): StyleRun[] {
  return runs.map(copyStyleRun)
}

export function copyGeometryPaths(paths: GeometryPath[]): GeometryPath[] {
  return paths.map((p) => ({
    windingRule: p.windingRule,
    commandsBlob: p.commandsBlob.slice()
  }))
}

// --- Internal helpers ---

function copyGradientStop(gs: GradientStop): GradientStop {
  return { color: { ...gs.color }, position: gs.position }
}
