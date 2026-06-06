import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('homepage responds', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(500)
  })

  test('login page renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/login')
    const headers = res.headers()
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy']).toBeDefined()
  })
})
