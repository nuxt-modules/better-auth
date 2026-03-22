import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { installBetterAuthNitroModule } from '../src/nitro/module'

const tempDirs: string[] = []

function createFixtureRoot(): string {
  const rootDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-nitro-'))
  tempDirs.push(rootDir)
  return rootDir
}

afterEach(async () => {
  delete process.env.NUXT_BETTER_AUTH_SECRET

  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir)
      await rm(dir, { recursive: true, force: true })
  }
})

describe('nitro module entry', () => {
  it('registers the server config alias and handlers using the default path', () => {
    const rootDir = createFixtureRoot()
    mkdirSync(join(rootDir, 'server'), { recursive: true })
    writeFileSync(join(rootDir, 'server/auth.config.ts'), 'export default () => ({})\n')

    const nitro = {
      options: {
        rootDir,
        dev: true,
        runtimeConfig: {},
      },
    } as any

    installBetterAuthNitroModule(nitro)

    expect(nitro.options.alias['#better-auth-nitro/server']).toBe(join(rootDir, 'server/auth.config.ts'))
    expect(nitro.options.plugins).toEqual(expect.arrayContaining([
      expect.stringContaining('/nitro/runtime/plugin'),
    ]))
    expect(nitro.options.handlers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        route: '/api/auth/**',
        handler: expect.stringContaining('/nitro/runtime/server/api/auth/[...all]'),
      }),
    ]))
  })

  it('supports a custom config path and injects the runtime secret', () => {
    process.env.NUXT_BETTER_AUTH_SECRET = 'test-secret-for-testing-only-32chars'

    const rootDir = createFixtureRoot()
    mkdirSync(join(rootDir, 'config'), { recursive: true })
    writeFileSync(join(rootDir, 'config/custom-auth.ts'), 'export default () => ({})\n')

    const nitro = {
      options: {
        rootDir,
        dev: false,
        runtimeConfig: {},
        betterAuth: {
          config: 'config/custom-auth',
        },
      },
    } as any

    installBetterAuthNitroModule(nitro)

    expect(nitro.options.alias['#better-auth-nitro/server']).toBe(join(rootDir, 'config/custom-auth.ts'))
    expect(nitro.options.runtimeConfig.betterAuthSecret).toBe('test-secret-for-testing-only-32chars')
  })

  it('throws when the config file cannot be resolved', () => {
    const rootDir = createFixtureRoot()
    const nitro = {
      options: {
        rootDir,
        dev: true,
        runtimeConfig: {},
      },
    } as any

    expect(() => installBetterAuthNitroModule(nitro)).toThrow('Missing server/auth.config.ts')
  })
})
