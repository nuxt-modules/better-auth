import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import yaml from 'yaml'

function listRuntimeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listRuntimeFiles(path)
    return /\.(?:m|c)?js$/.test(entry.name) ? [path] : []
  })
}

describe('exports-snapshot', async () => {
  it('module exports', async () => {
    if (!existsSync('dist/module.mjs') || !existsSync('dist/runtime/config.js') || !existsSync('dist/runtime/composables.js')) {
      const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
        encoding: 'utf8',
        env: process.env,
      })
      expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
    }

    const moduleExports = await import('../dist/module.mjs')
    const configExports = await import('../dist/runtime/config.js')

    const manifest = {
      '.': {
        default: typeof moduleExports.default,
        defineClientAuth: typeof moduleExports.defineClientAuth,
        defineServerAuth: typeof moduleExports.defineServerAuth,
      },
      './composables': {
        useAction: 'function',
        useAuthAsyncData: 'function',
        useAuthClient: 'function',
        useAuthClientAction: 'function',
        useAuthRequestFetch: 'function',
        useSignIn: 'function',
        useSignUp: 'function',
        useUserSession: 'function',
        useUserSessionState: 'function',
      },
      './config': {
        defineClientAuth: typeof configExports.defineClientAuth,
        defineServerAuth: typeof configExports.defineServerAuth,
      },
    }

    await expect(yaml.stringify(manifest)).toMatchFileSnapshot('./exports/module.yaml')
  }, 60_000)

  it('does not import module-owned composables from #imports in built runtime', () => {
    if (!existsSync('dist/runtime/composables.js')) {
      const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
        encoding: 'utf8',
        env: process.env,
      })
      expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
    }

    const runtimeFiles = listRuntimeFiles('dist/runtime/app')
    const coupledFiles = runtimeFiles.filter((file) => {
      const contents = readFileSync(file, 'utf8')
      return /import\s*\{[^}]*useUserSession[^}]*\}\s*from\s*["']#imports["']/.test(contents)
    })

    expect(coupledFiles).toEqual([])
  }, 60_000)
})
