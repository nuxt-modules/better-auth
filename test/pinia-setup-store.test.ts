import { fileURLToPath } from 'node:url'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('pinia setup store auth regression', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/pinia-setup-store', import.meta.url)),
  })

  it('renders setup stores that expose auth state and client facades', async () => {
    await expect($fetch('/')).resolves.toContain('Pinia Auth Store')
  })

  it('keeps the forwarded auth client callable methods available on client', async () => {
    const page = await createPage('/')

    await expect(page.getByTestId('client-type').textContent()).resolves.toContain('Client type: object')
    await expect(page.getByTestId('verification-type').textContent()).resolves.toContain('Verification type: function')
  })
})
