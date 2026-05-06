import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('pinia setup store auth regression', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/pinia-setup-store', import.meta.url)),
  })

  it('renders setup stores that expose auth state directly', async () => {
    await expect($fetch('/')).resolves.toContain('Pinia Auth Store')
  })
})
