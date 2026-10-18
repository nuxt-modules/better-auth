import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import yaml from 'yaml'

// Nuxt provides these modules in a consumer app. Keep the package's own
// composables real so a missing or changed export fails this snapshot.
vi.mock('#imports', () => ({}))
vi.mock('#auth/client', () => ({ default: () => ({}) }))

function listRuntimeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listRuntimeFiles(path)
    return /\.(?:m|c)?js$/.test(entry.name) ? [path] : []
  })
}

function listExportTargets(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(listExportTargets)

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(listExportTargets)

  return []
}

describe('exports-snapshot', async () => {
  it('keeps every package export target present in the publishable build', () => {
    const packageRoot = new URL('..', import.meta.url)
    const packageJSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      exports: Record<string, unknown>
    }

    const missing = listExportTargets(packageJSON.exports)
      .filter(target => target.startsWith('./'))
      .filter((target) => {
        try {
          return !statSync(new URL(target, packageRoot)).isFile()
        }
        catch {
          return true
        }
      })

    expect(missing).toEqual([])
  }, 360_000)

  it('module exports', async () => {
    const moduleExports = await import('../dist/module.mjs')
    const configExports = await import('../dist/runtime/config.js')

    const composableExports = await import('../dist/runtime/composables.js')
    const exportTypes = (exports: Record<string, unknown>) => Object.fromEntries(
      Object.entries(exports).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => [name, typeof value]),
    )
    const manifest = {
      '.': exportTypes(moduleExports),
      './composables': exportTypes(composableExports),
      './config': exportTypes(configExports),
      './test-utils/runtime': exportTypes(await import('@nuxtjs/better-auth/test-utils/runtime')),
      './test-utils/e2e': exportTypes(await import('@nuxtjs/better-auth/test-utils/e2e')),
    }

    await expect(yaml.stringify(manifest)).toMatchFileSnapshot('./exports/module.yaml')
  }, 360_000)

  it('does not import module-owned composables from #imports in built runtime', () => {
    const runtimeFiles = listRuntimeFiles('dist/runtime/app')
    const coupledFiles = runtimeFiles.filter((file) => {
      const contents = readFileSync(file, 'utf8')
      return /import\s*\{[^}]*useUserSession[^}]*\}\s*from\s*["']#imports["']/.test(contents)
    })

    expect(coupledFiles).toEqual([])
  }, 360_000)
})
