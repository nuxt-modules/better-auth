import type { Nuxt } from '@nuxt/schema'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it } from 'vitest'
import { getEffectiveModuleConfigFile, resolveModuleConfigPath, shouldCreateDefaultModuleConfig } from '../src/module/config-paths'

const loadedNuxtInstances: Nuxt[] = []

async function loadCase(caseName: string): Promise<Nuxt> {
  const nuxt = await loadNuxt({
    cwd: fileURLToPath(new URL(`./cases/${caseName}`, import.meta.url)),
    ready: false,
    dev: false,
    overrides: {},
  })
  loadedNuxtInstances.push(nuxt)
  return nuxt
}

afterEach(async () => {
  while (loadedNuxtInstances.length) {
    const nuxt = loadedNuxtInstances.pop()
    await nuxt?.close()
  }
})

describe('resolveModuleConfigPath', () => {
  it('discovers default configs from an extended layer', async () => {
    const nuxt = await loadCase('layer-default-configs')

    expect(resolveModuleConfigPath(nuxt, 'server', 'server/auth.config')).toMatchObject({
      file: '../core-auth/server/auth.config',
      path: expect.stringContaining('/test/cases/core-auth/server/auth.config'),
      isDefault: true,
    })
    expect(resolveModuleConfigPath(nuxt, 'client', 'app/auth.config')).toMatchObject({
      file: '../core-auth/app/auth.config',
      path: expect.stringContaining('/test/cases/core-auth/app/auth.config'),
      isDefault: true,
    })
  })

  it('resolves inherited explicit relative config paths from the declaring layer', async () => {
    const nuxt = await loadCase('layer-explicit-configs')
    const serverConfigFile = getEffectiveModuleConfigFile(nuxt, 'server')
    const clientConfigFile = getEffectiveModuleConfigFile(nuxt, 'client')

    expect(resolveModuleConfigPath(nuxt, 'server', serverConfigFile)).toMatchObject({
      file: '../layer-explicit-configs-base/custom/server-auth',
      path: expect.stringContaining('/test/cases/layer-explicit-configs-base/custom/server-auth'),
      isDefault: false,
    })
    expect(resolveModuleConfigPath(nuxt, 'client', clientConfigFile)).toMatchObject({
      file: '../layer-explicit-configs-base/custom/client-auth',
      path: expect.stringContaining('/test/cases/layer-explicit-configs-base/custom/client-auth'),
      isDefault: false,
    })
  })

  it('resolves project-defined explicit relative config paths from the project root', async () => {
    const nuxt = await loadCase('project-explicit-configs')
    const serverConfigFile = getEffectiveModuleConfigFile(nuxt, 'server')
    const clientConfigFile = getEffectiveModuleConfigFile(nuxt, 'client')

    expect(resolveModuleConfigPath(nuxt, 'server', serverConfigFile)).toMatchObject({
      file: 'custom/server-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/server-auth'),
      isDefault: false,
    })
    expect(resolveModuleConfigPath(nuxt, 'client', clientConfigFile)).toMatchObject({
      file: 'custom/client-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/client-auth'),
      isDefault: false,
    })
  })

  it('passes through absolute config paths unchanged', async () => {
    const nuxt = await loadCase('database-less')
    const serverConfigFile = getEffectiveModuleConfigFile(nuxt, 'server')
    const clientConfigFile = getEffectiveModuleConfigFile(nuxt, 'client')

    expect(resolveModuleConfigPath(nuxt, 'server', serverConfigFile)).toEqual({
      file: serverConfigFile,
      path: serverConfigFile,
      isDefault: false,
    })
    expect(resolveModuleConfigPath(nuxt, 'client', clientConfigFile)).toEqual({
      file: clientConfigFile,
      path: clientConfigFile,
      isDefault: false,
    })
  })
})

describe('shouldCreateDefaultModuleConfig', () => {
  it('does not scaffold defaults when an extended layer already provides default config files', async () => {
    const nuxt = await loadCase('layer-default-configs')

    expect(shouldCreateDefaultModuleConfig(nuxt, 'server')).toBe(false)
    expect(shouldCreateDefaultModuleConfig(nuxt, 'client')).toBe(false)
  })

  it('does not scaffold defaults when effective config paths are explicit custom files from an extended layer', async () => {
    const nuxt = await loadCase('layer-explicit-configs')

    expect(shouldCreateDefaultModuleConfig(nuxt, 'server')).toBe(false)
    expect(shouldCreateDefaultModuleConfig(nuxt, 'client')).toBe(false)
  })
})
