import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/define-server-auth-literal-inference', import.meta.url))

describe('defineServerAuth literal inference regression #134', () => {
  it('typechecks nested literals without as const and rejects invalid literals', { timeout: 30_000 }, () => {
    const typecheck = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.json'], {
      cwd: fixtureDir,
      encoding: 'utf8',
    })

    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  })
})
