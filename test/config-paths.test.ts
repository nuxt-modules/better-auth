import type { Nuxt } from '@nuxt/schema'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveAuthConfigDescriptor, resolveAuthConfigDescriptors } from '../src/module/config-paths'

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

describe('resolveAuthConfigDescriptor', () => {
  it('discovers default configs from an extended layer', async () => {
    const nuxt = await loadCase('layer-default-configs')
    const configs = resolveAuthConfigDescriptors(nuxt)

    expect(configs.server).toMatchObject({
      kind: 'server',
      configuredFile: 'server/auth.config',
      file: '../core-auth/server/auth.config',
      path: expect.stringContaining('/test/cases/core-auth/server/auth.config'),
      declaringLayerRoot: expect.stringContaining('/test/cases/core-auth'),
      isDefault: true,
      isExplicit: false,
      exists: true,
      shouldCreateDefaultFile: false,
    })
    expect(configs.client).toMatchObject({
      kind: 'client',
      configuredFile: 'app/auth.config',
      file: '../core-auth/app/auth.config',
      path: expect.stringContaining('/test/cases/core-auth/app/auth.config'),
      declaringLayerRoot: expect.stringContaining('/test/cases/core-auth'),
      isDefault: true,
      isExplicit: false,
      exists: true,
      shouldCreateDefaultFile: false,
    })
  })

  it('resolves inherited explicit relative config paths from the declaring layer', async () => {
    const nuxt = await loadCase('layer-explicit-configs')
    const configs = resolveAuthConfigDescriptors(nuxt)

    expect(configs.server).toMatchObject({
      kind: 'server',
      configuredFile: 'custom/server-auth',
      file: '../layer-explicit-configs-base/custom/server-auth',
      path: expect.stringContaining('/test/cases/layer-explicit-configs-base/custom/server-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/layer-explicit-configs-base'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
    expect(configs.client).toMatchObject({
      kind: 'client',
      configuredFile: 'custom/client-auth',
      file: '../layer-explicit-configs-base/custom/client-auth',
      path: expect.stringContaining('/test/cases/layer-explicit-configs-base/custom/client-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/layer-explicit-configs-base'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
  })

  it('resolves project-defined explicit relative config paths from the project root', async () => {
    const nuxt = await loadCase('project-explicit-configs')
    const configs = resolveAuthConfigDescriptors(nuxt)

    expect(configs.server).toMatchObject({
      kind: 'server',
      configuredFile: 'custom/server-auth',
      file: 'custom/server-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/server-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/project-explicit-configs'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
    expect(configs.client).toMatchObject({
      kind: 'client',
      configuredFile: 'custom/client-auth',
      file: 'custom/client-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/client-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/project-explicit-configs'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
  })

  it('passes through absolute config paths unchanged', async () => {
    const nuxt = await loadCase('database-less')
    const serverConfigFile = ((nuxt.options as { auth: { serverConfig: string } }).auth).serverConfig
    const clientConfigFile = ((nuxt.options as { auth: { clientConfig: string } }).auth).clientConfig

    expect(resolveAuthConfigDescriptor(nuxt, 'server')).toMatchObject({
      kind: 'server',
      configuredFile: serverConfigFile,
      file: serverConfigFile,
      path: serverConfigFile,
      declaringLayerRoot: expect.stringContaining('/test/cases/_base-module'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
    expect(resolveAuthConfigDescriptor(nuxt, 'client')).toMatchObject({
      kind: 'client',
      configuredFile: clientConfigFile,
      file: clientConfigFile,
      path: clientConfigFile,
      declaringLayerRoot: expect.stringContaining('/test/cases/_base-module'),
      isDefault: false,
      isExplicit: true,
      exists: true,
      shouldCreateDefaultFile: false,
    })
  })

  it('allows default file creation when default configs are missing from all layers', async () => {
    const nuxt = await loadCase('without-nuxthub')
    const configExists = () => false
    const configs = resolveAuthConfigDescriptors(nuxt, {
      server: 'server/auth.config',
      client: 'app/auth.config',
    }, { configExists })

    expect(configs.server).toMatchObject({
      kind: 'server',
      configuredFile: 'server/auth.config',
      file: 'server/auth.config',
      path: expect.stringContaining('/test/cases/without-nuxthub/server/auth.config'),
      declaringLayerRoot: expect.stringContaining('/test/cases/without-nuxthub'),
      isDefault: true,
      isExplicit: false,
      exists: false,
      shouldCreateDefaultFile: true,
    })
    expect(configs.client).toMatchObject({
      kind: 'client',
      configuredFile: 'app/auth.config',
      file: 'app/auth.config',
      path: expect.stringContaining('/test/cases/without-nuxthub/app/auth.config'),
      declaringLayerRoot: expect.stringContaining('/test/cases/without-nuxthub'),
      isDefault: true,
      isExplicit: false,
      exists: false,
      shouldCreateDefaultFile: true,
    })
  })

  it('does not allow default file creation for missing explicit config paths', async () => {
    const nuxt = await loadCase('project-explicit-configs')
    const configExists = () => false
    const configs = resolveAuthConfigDescriptors(nuxt, {}, { configExists })

    expect(configs.server).toMatchObject({
      kind: 'server',
      configuredFile: 'custom/server-auth',
      file: 'custom/server-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/server-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/project-explicit-configs'),
      isDefault: false,
      isExplicit: true,
      exists: false,
      shouldCreateDefaultFile: false,
    })
    expect(configs.client).toMatchObject({
      kind: 'client',
      configuredFile: 'custom/client-auth',
      file: 'custom/client-auth',
      path: expect.stringContaining('/test/cases/project-explicit-configs/custom/client-auth'),
      declaringLayerRoot: expect.stringContaining('/test/cases/project-explicit-configs'),
      isDefault: false,
      isExplicit: true,
      exists: false,
      shouldCreateDefaultFile: false,
    })
  })
})
