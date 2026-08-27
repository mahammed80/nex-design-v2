import { randomHex } from '#core/random'

import type { EditorContext, Guide } from './types'

export function createGuidesActions(ctx: EditorContext) {
  function applyPageGuides(pageId: string, guides: Guide[], selectedGuideId?: string | null) {
    ctx.graph.updateNode(pageId, { guides: structuredClone(guides) })
    if (ctx.state.currentPageId === pageId) {
      ctx.state.guides = structuredClone(guides)
      if (selectedGuideId !== undefined) ctx.state.selectedGuideId = selectedGuideId
    }
    ctx.requestRender()
  }

  function addGuide(type: 'horizontal' | 'vertical', value: number, label = 'Add guide') {
    const id = `guide:${randomHex(8)}`
    const guide: Guide = { id, type, value }
    const pageId = ctx.state.currentPageId
    const nextGuides = [...ctx.state.guides, guide]

    applyPageGuides(pageId, nextGuides)

    ctx.undo.push({
      label,
      forward: () => applyPageGuides(pageId, nextGuides),
      inverse: () =>
        applyPageGuides(
          pageId,
          nextGuides.filter((g) => g.id !== id),
          null
        )
    })

    return id
  }

  function removeGuide(id: string, label = 'Delete guide') {
    if (!ctx.state.guides.some((g) => g.id === id)) return

    const pageId = ctx.state.currentPageId
    const previousGuides = structuredClone(ctx.state.guides)
    const prevSelected = ctx.state.selectedGuideId
    const nextGuides = previousGuides.filter((g) => g.id !== id)
    applyPageGuides(pageId, nextGuides, prevSelected === id ? null : prevSelected)

    ctx.undo.push({
      label,
      forward: () => applyPageGuides(pageId, nextGuides, null),
      inverse: () => applyPageGuides(pageId, previousGuides, prevSelected)
    })
  }

  function updateGuideValue(id: string, value: number) {
    const guides = ctx.state.guides.map((g) => (g.id === id ? { ...g, value } : g))
    applyPageGuides(ctx.state.currentPageId, guides)
  }

  function setSelectedGuideId(id: string | null) {
    ctx.state.selectedGuideId = id
    ctx.requestRender()
  }

  function toggleGuidesVisible() {
    ctx.state.guidesVisible = !ctx.state.guidesVisible
    ctx.requestRender()
  }

  function setGuidesLocked(locked: boolean) {
    ctx.state.guidesLocked = locked
    ctx.requestRender()
  }

  return {
    addGuide,
    removeGuide,
    updateGuideValue,
    setSelectedGuideId,
    toggleGuidesVisible,
    setGuidesLocked
  }
}
