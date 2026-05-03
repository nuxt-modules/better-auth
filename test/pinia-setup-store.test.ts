import { fileURLToPath } from 'node:url'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('pinia setup store auth regression', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/pinia-setup-store', import.meta.url)),
    browser: true,
  })

  it('hydrates setup stores that expose auth state and client facades', async () => {
    const page = await createPage()
    const errors: string[] = []

    page.on('pageerror', error => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error')
        errors.push(message.text())
    })

    await page.goto(url('/'), { waitUntil: 'hydration' })

    await expect(page.locator('h1').textContent()).resolves.toBe('Pinia Auth Store')
    await expect(page.locator('[data-testid="full-ready"]').textContent()).resolves.toContain('Full ready:')
    await expect(page.locator('[data-testid="state-ready"]').textContent()).resolves.toContain('State ready:')
    await expect(page.locator('[data-testid="full-actions"]').textContent()).resolves.toContain('function')
    expect(errors.join('\n')).not.toContain('Maximum call stack size exceeded')
    expect(errors).toEqual([])
  })
})
