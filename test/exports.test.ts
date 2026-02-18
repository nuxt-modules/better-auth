import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'
import yaml from 'yaml'

describe('exports-snapshot', async () => {
  it('module exports', async () => {
    const manifest = await getPackageExportsManifest({ importMode: 'dist' })
    await expect(yaml.stringify(manifest.exports)).toMatchFileSnapshot('./exports/module.yaml')
  }, 20_000)
})
