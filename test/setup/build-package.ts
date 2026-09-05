import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Build once before any worker can import package exports or prepare a consumer.
// An existing dist may come from another version or a development stub build.
export default function setup() {
  const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: process.env,
    encoding: 'utf8',
    timeout: 120_000,
  })
  if (build.status !== 0)
    throw new Error(`nuxt-module-build failed: ${build.error || ''}\n${build.stdout}\n${build.stderr}`)
}
