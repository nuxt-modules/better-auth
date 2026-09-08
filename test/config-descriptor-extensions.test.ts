import type { Nuxt } from '@nuxt/schema'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'pathe'
import { addTypeTemplate } from '@nuxt/kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveAuthConfigDescriptor } from '../src/module/config-paths'
import { registerServerTypeTemplates } from '../src/module/type-templates'

const { directories } = vi.hoisted(() => ({ directories: [] as { root: string, server: string, app: string }[] }))
vi.mock('@nuxt/kit', () => ({
  getLayerDirectories: () => directories,
  addTypeTemplate: vi.fn(),
}))

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
  directories.length = 0
  vi.clearAllMocks()
})

describe('concrete auth config descriptors', () => {
  it.each(['.ts', '.js', '.mts', '.cts', '.mjs', '.cjs'])('propagates %s paths to generated type imports', (extension) => {
    const root = mkdtempSync(join(tmpdir(), 'auth-descriptor-'))
    roots.push(root)
    const layer = join(root, 'layer')
    for (const directory of [root, layer]) {
      directories.push({ root: directory, server: join(directory, 'server'), app: join(directory, 'app') })
      mkdirSync(join(directory, 'server'), { recursive: true })
    }
    const path = join(layer, `server/auth.config${extension}`)
    writeFileSync(path, 'export default () => ({})')
    const nuxt = { options: { _layers: [{ config: {} }, { config: { auth: { serverConfig: 'server/auth.config' } } }] } } as unknown as Nuxt

    for (const configuredFile of ['server/auth.config', path.slice(0, -extension.length), path]) {
      const descriptor = resolveAuthConfigDescriptor(nuxt, 'server', configuredFile)
      expect(descriptor).toMatchObject({ configuredFile, path, exists: true, declaringLayerRoot: configuredFile.startsWith('/') ? root : layer })
      expect(descriptor.file).toBe(configuredFile.startsWith('/') ? path : relative(root, path))
      registerServerTypeTemplates({ serverConfigPath: descriptor.path, hasHubDb: false, runtimeTypesPath: '/runtime/types', sharedServerConfigSafe: true, h3TypesPath: 'h3', nitroTypesPath: 'nitropack/types' })
      const template = vi.mocked(addTypeTemplate).mock.calls.map(([template]) => template).find(template => template.filename === 'types/nuxt-better-auth-infer.d.ts')!
      expect(template.getContents!({} as never)).toContain(`import type createServerAuth from '${path}'`)
    }

    // An inherited custom path must resolve against its declaring layer.
    nuxt.options._layers[1]!.config.auth = { serverConfig: 'server/custom' }
    const customPath = join(layer, `server/custom${extension}`)
    writeFileSync(customPath, 'export default () => ({})')
    expect(resolveAuthConfigDescriptor(nuxt, 'server', 'server/custom')).toMatchObject({
      configuredFile: 'server/custom',
      path: customPath,
      file: relative(root, customPath),
      declaringLayerRoot: layer,
      exists: true,
    })
    expect(resolveAuthConfigDescriptor(nuxt, 'server', 'server/custom.ts')).toMatchObject({
      configuredFile: 'server/custom.ts',
      path: join(layer, 'server/custom.ts'),
      exists: extension === '.ts',
    })
  })
})
