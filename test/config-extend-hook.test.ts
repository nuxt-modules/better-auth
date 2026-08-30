import type { BetterAuthPlugin } from 'better-auth'
import type { NuxtHooks } from 'nuxt/schema'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import '../src/types/hooks'

type SchemaExtension = Parameters<NuxtHooks['better-auth:config:extend']>[0]

it('accepts only schema plugin contributions', () => {
  const pluginConfig = { plugins: [] as BetterAuthPlugin[] } satisfies SchemaExtension
  // @ts-expect-error The build hook does not extend runtime auth options.
  const runtimeConfig = { appName: 'runtime option' } satisfies SchemaExtension

  expect(pluginConfig.plugins).toEqual([])
  expect(runtimeConfig.appName).toBe('runtime option')
})

it('rejects runtime options during typechecking', { timeout: 30_000 }, () => {
  const typecheck = spawnSync('pnpm', [
    'exec',
    'tsc',
    '--noEmit',
    '--module',
    'esnext',
    '--moduleResolution',
    'bundler',
    '--target',
    'esnext',
    '--strict',
    '--skipLibCheck',
    '--types',
    'node',
    fileURLToPath(import.meta.url),
  ], {
    cwd: import.meta.dirname,
    encoding: 'utf8',
  })

  expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
})
