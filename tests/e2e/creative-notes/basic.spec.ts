import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test.beforeEach(async ({ page }) => {
  await page.goto('/demo?test')
  await new CanvasHelper(page).waitForInit()
})

test('captures and retains a pinned creative idea', async ({ page }) => {
  await page.getByTestId('creative-notes-open').click()
  await expect(page.getByTestId('creative-notes-panel')).toBeVisible()

  await page
    .getByTestId('creative-notes-capture')
    .fill('Explore a translucent command palette with oversized type.')
  await page.getByTestId('creative-notes-add').click()

  const note = page.getByLabel('Creative note')
  await expect(note).toHaveValue('Explore a translucent command palette with oversized type.')
  await page.getByLabel('Pin idea').click()
  await expect(page.getByLabel('Unpin idea')).toBeVisible()

  await page.getByLabel('Close creative notes').click()
  await expect(page.getByTestId('creative-notes-panel')).toBeHidden()
  await page.getByTestId('creative-notes-open').click()

  await expect(note).toHaveValue('Explore a translucent command palette with oversized type.')
  await expect(page.getByLabel('Unpin idea')).toBeVisible()
})
