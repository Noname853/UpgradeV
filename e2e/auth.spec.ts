import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login form is reachable and renders required fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('admin can log in and reach dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@tkj.com')
    await page.getByLabel(/password/i).fill('admin123')
    await page.getByRole('button', { name: /login|masuk|sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@tkj.com')
    await page.getByLabel(/password/i).fill('wrong-password')
    await page.getByRole('button', { name: /login|masuk|sign in/i }).click()

    await expect(page).toHaveURL(/\/login.*error/)
  })
})
