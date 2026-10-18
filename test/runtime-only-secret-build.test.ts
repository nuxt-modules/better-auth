import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/runtime-only-secret-build', import.meta.url))

describe('runtime-only auth secret', () => {
  it('builds for Cloudflare without exposing the runtime secret to the build', () => {
    const env = {
      ...process.env,
      CI: '1',
    }
    delete env.NUXT_BETTER_AUTH_SECRET
    delete env.BETTER_AUTH_SECRET

    const build = spawnSync('npx', ['nuxi', 'build'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })

    expect(build.status, `nuxi build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
    expect(existsSync(join(fixtureDir, '.output/server/wrangler.json'))).toBe(true)
  }, 360_000)
})
