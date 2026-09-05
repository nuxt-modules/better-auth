import { readdirSync, readFileSync } from 'node:fs'
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

describe('exports-snapshot', async () => {
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
    }

    await expect(yaml.stringify(manifest)).toMatchFileSnapshot('./exports/module.yaml')
  }, 60_000)

  it('does not import module-owned composables from #imports in built runtime', () => {
    const runtimeFiles = listRuntimeFiles('dist/runtime/app')
    const coupledFiles = runtimeFiles.filter((file) => {
      const contents = readFileSync(file, 'utf8')
      return /import\s*\{[^}]*useUserSession[^}]*\}\s*from\s*["']#imports["']/.test(contents)
    })

    expect(coupledFiles).toEqual([])
  }, 60_000)
})
