import type { Page } from '@playwright/test'

export async function seedLocalProfile(page: Page, id: string) {
  await page.addInitScript((profileId) => {
    const profile = {
      id: profileId,
      name: 'Playwright',
      createdAt: Date.now(),
      kind: 'local'
    }
    localStorage.setItem('nex-design:profiles-v1', JSON.stringify([profile]))
    localStorage.setItem('nex-design:active-profile-id', profile.id)
  }, id)
}
