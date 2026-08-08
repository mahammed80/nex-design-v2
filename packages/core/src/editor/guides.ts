import { randomHex } from '#core/random'

import type { EditorContext, Guide } from './types'

export function createGuidesActions(ctx: EditorContext) {
  function addGuide(type: 'horizontal' | 'vertical', value: number, label = 'Add guide') {
    const id = `guide:${randomHex(8)}`
    const guide: Guide = { id, type, value }

    ctx.state.guides = [...ctx.state.guides, guide]
    ctx.requestRender()

    ctx.undo.push({
      label,
      forward: () => {
        ctx.state.guides = [...ctx.state.guides, guide]
        ctx.requestRender()
      },
      inverse: () => {
        ctx.state.guides = ctx.state.guides.filter((g) => g.id !== id)
        if (ctx.state.selectedGuideId === id) {
          ctx.state.selectedGuideId = null
        }
        ctx.requestRender()
      }
    })

    return id
  }

  function removeGuide(id: string, label = 'Delete guide') {
    const guide = ctx.state.guides.find((g) => g.id === id)
    if (!guide) return

    const prevSelected = ctx.state.selectedGuideId
    ctx.state.guides = ctx.state.guides.filter((g) => g.id !== id)
    if (prevSelected === id) {
      ctx.state.selectedGuideId = null
    }
    ctx.requestRender()

    ctx.undo.push({
      label,
      forward: () => {
        ctx.state.guides = ctx.state.guides.filter((g) => g.id !== id)
        if (ctx.state.selectedGuideId === id) {
          ctx.state.selectedGuideId = null
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.state.guides = [...ctx.state.guides, guide]
        if (prevSelected === id) {
          ctx.state.selectedGuideId = id
        }
        ctx.requestRender()
      }
    })
  }

  function updateGuideValue(id: string, value: number) {
    ctx.state.guides = ctx.state.guides.map((g) => (g.id === id ? { ...g, value } : g))
    ctx.requestRender()
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
