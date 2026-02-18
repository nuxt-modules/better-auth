import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'
import yaml from 'yaml'

describe('exports-snapshot', async () => {
  it('module exports', async () => {
    if (!existsSync('dist/module.mjs') || !existsSync('dist/runtime/config.js')) {
      const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
        encoding: 'utf8',
        env: process.env,
      })
      expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
    }

    const manifest = await getPackageExportsManifest({ importMode: 'dist' })
    await expect(yaml.stringify(manifest.exports)).toMatchFileSnapshot('./exports/module.yaml')
  })
})
