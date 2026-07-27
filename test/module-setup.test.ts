import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthModuleOptions } from '../src/runtime/config'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectAuthRouteRules, resolveAuthModuleSetup } from '../src/module/setup'

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

function createModuleOptions(nuxt: Nuxt, overrides: Partial<BetterAuthModuleOptions> = {}): BetterAuthModuleOptions {
  const configured = ((nuxt.options as { auth?: BetterAuthModuleOptions }).auth || {}) as BetterAuthModuleOptions
  const defaults: BetterAuthModuleOptions = {
    clientOnly: false,
    serverConfig: 'server/auth.config',
    clientConfig: 'app/auth.config',
    redirects: { login: '/login', guest: '/' },
    preserveRedirect: true,
    redirectQueryKey: 'redirect',
    hubSecondaryStorage: false,
  }

  return {
    ...defaults,
    ...configured,
    ...overrides,
    redirects: {
      ...defaults.redirects,
      ...configured.redirects,
      ...overrides.redirects,
    },
  }
}

function createConsolaMock() {
  return {
    warn: vi.fn(),
    info: vi.fn(),
  } as Parameters<typeof resolveAuthModuleSetup>[0]['consola']
}

afterEach(async () => {
  while (loadedNuxtInstances.length) {
    const nuxt = loadedNuxtInstances.pop()
    await nuxt?.close()
  }
})

describe('resolveAuthModuleSetup', () => {
  it('captures NuxtHub-backed setup state and auth route rules', async () => {
    const nuxt = await loadCase('core-auth')
    nuxt.options.alias['hub:db'] = '/virtual/hub-db'

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    })

    expect(setup.hub.hasNuxtHub).toBe(true)
    expect(setup.hub.hasHubDbAvailable).toBe(true)
    expect(setup.database.providerId).toBe('nuxthub')
    expect(setup.database.hasHubDb).toBe(true)
    expect(collectAuthRouteRules(nuxt)).toMatchObject({
      '/protected': { auth: 'user' },
      '/admin': { auth: { user: { role: 'admin' } } },
      '/login': { auth: 'guest' },
    })
    expect(setup.prepareTypes).toMatchObject({
      hasHubDb: true,
    })
    expect(setup.serverTypes?.serverConfigPath).toContain('/test/cases/core-auth/server/auth.config')
  })

  it('captures a non-NuxtHub setup without selecting a database provider', async () => {
    const nuxt = await loadCase('without-nuxthub')

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    })

    expect(setup.hub.hasNuxtHub).toBe(false)
    expect(setup.hub.hasHubDbAvailable).toBe(false)
    expect(setup.database.providerId).toBe('none')
    expect(setup.database.hasHubDb).toBe(false)
    expect(setup.schemaGeneration).toBeUndefined()
  })

  it('supports client-only mode without server setup state', async () => {
    const nuxt = await loadCase('without-nuxthub')

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt, { clientOnly: true }),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    })

    expect(setup.clientOnly).toBe(true)
    expect(setup.database.providerId).toBe('none')
    expect(setup.aliases['#auth/server']).toBeUndefined()
    expect(setup.prepareTypes).toBeUndefined()
    expect(setup.serverTypes).toBeUndefined()
    expect(setup.schemaGeneration).toBeUndefined()
  })

  it('prefers a higher-priority external provider from the provider hook', async () => {
    const nuxt = await loadCase('without-nuxthub')
    let aliasesDuringProviderSelection: Record<string, string | undefined> | undefined

    nuxt.hook('better-auth:database:providers', (providers) => {
      providers.external = {
        priority: 200,
        isEnabled: ({ nuxt }) => {
          aliasesDuringProviderSelection = {
            server: nuxt.options.alias['#auth/server'],
            client: nuxt.options.alias['#auth/client'],
          }
          return true
        },
        buildDatabaseCode: () => 'export function createDatabase() { return "external" }',
      }
    })

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    })

    expect(setup.database.providerId).toBe('external')
    expect(setup.database.hasHubDb).toBe(false)
    expect(aliasesDuringProviderSelection).toEqual({
      server: setup.configs.server.path,
      client: setup.configs.client.path,
    })
  })

  it('allows provider setup route-rule mutations to affect collected auth route rules', async () => {
    const nuxt = await loadCase('without-nuxthub')

    nuxt.hook('better-auth:database:providers', (providers) => {
      providers.external = {
        priority: 200,
        isEnabled: () => true,
        setup: ({ nuxt }) => {
          nuxt.options.routeRules ||= {}
          nuxt.options.routeRules['/provider-protected'] = { auth: 'user' }
        },
        buildDatabaseCode: () => 'export function createDatabase() { return "external" }',
      }
    })

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    })

    await setup.database.providerDefinition?.setup?.({
      nuxt,
      options: createModuleOptions(nuxt),
      clientOnly: setup.clientOnly,
    })

    expect(collectAuthRouteRules(nuxt)).toMatchObject({
      '/provider-protected': { auth: 'user' },
    })
  })

  it('throws when the effective server auth config is missing', async () => {
    const nuxt = await loadCase('without-nuxthub')

    await expect(resolveAuthModuleSetup({
      nuxt,
      options: createModuleOptions(nuxt),
      runtimeTypesAugmentPath: '/virtual/runtime-types/augment',
      consola: createConsolaMock(),
    }, {
      configExists: path => !path.endsWith('/server/auth.config'),
    })).rejects.toThrow('Missing')
  })
})
