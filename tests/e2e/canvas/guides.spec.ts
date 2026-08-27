import { expect, test } from '@playwright/test'

import { seedLocalProfile } from '#tests/helpers/browser-session'
import { CanvasHelper } from '#tests/helpers/canvas'

test.setTimeout(30_000)

test('drags a ruler guide in canvas coordinates with undo and redo', async ({ page }) => {
  await seedLocalProfile(page, 'playwright-guides-profile')
  await page.goto('/demo')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const guideId = await page.evaluate(() => {
    const store = window.nexDesign?.getStore?.()
    if (!store) throw new Error('NexDesign store not initialized')
    store.state.zoom = 2
    store.state.panY = 50
    const id = store.addGuide('horizontal', 120)
    store.requestRender()
    return id
  })

  await canvas.drag(500, 290, 500, 350, 2)
  await canvas.waitForRender()

  const guideValue = () =>
    page.evaluate((id) => {
      const store = window.nexDesign?.getStore?.()
      return store?.state.guides.find((guide) => guide.id === id)?.value
    }, guideId)

  expect(await guideValue()).toBe(150)

  await page.evaluate(() => window.nexDesign?.getStore?.().undo.undo())
  expect(await guideValue()).toBe(120)

  await page.evaluate(() => window.nexDesign?.getStore?.().undo.redo())
  expect(await guideValue()).toBe(150)
})
