import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setupRuntimeConfig } from '../src/module/runtime'
import { registerRuntimeConfigSchema } from '../src/module/runtime-config-schema'

vi.mock('../src/module/runtime-config-schema', async importOriginal => ({
  ...await importOriginal<typeof import('../src/module/runtime-config-schema')>(),
  registerRuntimeConfigSchema: vi.fn(),
}))

function createNuxtWithRuntimeConfig(publicConfig: Record<string, unknown> = {}): Nuxt {
  return {
    options: {
      runtimeConfig: {
        public: publicConfig,
      },
      dev: true,
      _prepare: false,
    },
  } as unknown as Nuxt
}

function createConsolaMock(): ConsolaInstance {
  return {
    warn: vi.fn(),
    info: vi.fn(),
  } as unknown as ConsolaInstance
}

afterEach(() => {
  vi.mocked(registerRuntimeConfigSchema).mockClear()
  delete process.env.NUXT_PUBLIC_SITE_URL
  delete process.env.NUXT_BETTER_AUTH_SECRET
  delete process.env.BETTER_AUTH_SECRET
})

describe('setupRuntimeConfig siteUrl hydration', () => {
  it('declares public.siteUrl when no value is configured', async () => {
    delete process.env.NUXT_PUBLIC_SITE_URL
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('')
  })

  it('hydrates public.siteUrl from NUXT_PUBLIC_SITE_URL when missing', async () => {
    process.env.NUXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('http://localhost:3000')
  })

  it('does not override explicit public.siteUrl with env value', async () => {
    process.env.NUXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    const nuxt = createNuxtWithRuntimeConfig({ siteUrl: 'http://127.0.0.1:3000' })
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('http://127.0.0.1:3000')
  })

  it('warns with both runtimeConfig and env guidance when siteUrl is missing in clientOnly mode', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(consola.warn).toHaveBeenCalledWith('clientOnly mode: set runtimeConfig.public.siteUrl (or NUXT_PUBLIC_SITE_URL) to your auth backend URL, or set baseURL in defineClientAuth()')
  })
})

describe('setupRuntimeConfig secret resolution', () => {
  it('prefers runtimeConfig over env variables', async () => {
    process.env.NUXT_BETTER_AUTH_SECRET = 'nuxi-secret-for-testing-only-32chars'
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'runtime-secret-for-testing-only-32chars'
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('runtime-secret-for-testing-only-32chars')
  })

  it('uses NUXT_BETTER_AUTH_SECRET when runtimeConfig is unset', async () => {
    process.env.NUXT_BETTER_AUTH_SECRET = 'nuxi-secret-for-testing-only-32chars'
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('nuxi-secret-for-testing-only-32chars')
  })

  it('falls back to BETTER_AUTH_SECRET when NUXT_BETTER_AUTH_SECRET is unset', async () => {
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('fallback-secret-for-testing-only-32chars')
  })

  it('allows production builds without a configured secret', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    nuxt.options.dev = false
    const consola = createConsolaMock()

    await expect(setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })).resolves.toEqual({ secondaryStorageEnabled: false })
    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('')
    expect(registerRuntimeConfigSchema).not.toHaveBeenCalled()
  })
})

describe('setupRuntimeConfig on Nuxt 5', () => {
  function createNuxt5(runtimeConfig: Record<string, unknown> = { public: {} }): Nuxt {
    return { options: { runtimeConfig, _runtimeConfigSchemas: [], dev: false, _prepare: false } } as unknown as Nuxt
  }

  it('leaves the secret and siteUrl to the schema default when nothing sets them', async () => {
    const nuxt = createNuxt5()

    await setupRuntimeConfig({ nuxt, options: {}, clientOnly: false, databaseProvider: 'none', hasNuxtHub: false, consola: createConsolaMock() })

    const runtimeConfig = nuxt.options.runtimeConfig as Record<string, any>
    expect(runtimeConfig.betterAuthSecret).toBeUndefined()
    expect(runtimeConfig.public.siteUrl).toBeUndefined()
    expect(runtimeConfig.public.auth.redirects.login).toBe('/login')
    expect(registerRuntimeConfigSchema).toHaveBeenCalledWith(nuxt, false)
  })

  it('keeps configured values, which become the schema defaults', async () => {
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxt5({ public: { siteUrl: 'https://example.com' } })

    await setupRuntimeConfig({ nuxt, options: {}, clientOnly: false, databaseProvider: 'none', hasNuxtHub: false, consola: createConsolaMock() })

    const runtimeConfig = nuxt.options.runtimeConfig as Record<string, any>
    expect(runtimeConfig.betterAuthSecret).toBe('fallback-secret-for-testing-only-32chars')
    expect(runtimeConfig.public.siteUrl).toBe('https://example.com')
  })

  it('registers the client-only schema without the secret', async () => {
    const nuxt = createNuxt5()

    await setupRuntimeConfig({ nuxt, options: {}, clientOnly: true, databaseProvider: 'none', hasNuxtHub: false, consola: createConsolaMock() })

    expect('betterAuthSecret' in nuxt.options.runtimeConfig).toBe(false)
    expect(registerRuntimeConfigSchema).toHaveBeenCalledWith(nuxt, true)
  })
})

describe('setupRuntimeConfig hubSecondaryStorage validation', () => {
  it('warns and disables NuxtHub KV when atomic secondary storage is unavailable', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = await setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: true },
      clientOnly: false,
      databaseProvider: 'nuxthub',
      hasNuxtHub: true,
      hub: { kv: true },
      consola,
    })

    expect(secondaryStorageEnabled).toBe(false)
    expect((nuxt.options.runtimeConfig.auth as any).hubSecondaryStorage).toBe(false)
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('continue without injecting secondary storage'))
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('https://github.com/nuxt-hub/core/pull/927'))
  })

  it('ignores hubSecondaryStorage: true with clientOnly guidance', async () => {
    const nuxt = createNuxtWithRuntimeConfig({ siteUrl: 'https://example.com' })
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = await setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: true },
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(secondaryStorageEnabled).toBe(false)
    expect(consola.warn).toHaveBeenCalledWith(expect.stringContaining('ignored in clientOnly mode'))
    expect(consola.warn).not.toHaveBeenCalledWith(expect.stringContaining('database-backed sessions'))
  })

  it('throws when hubSecondaryStorage: "custom" in clientOnly mode', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    await expect(setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: 'custom' },
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })).rejects.toThrow('hubSecondaryStorage is not available in clientOnly mode')
  })

  it('enables secondary storage for "custom" mode', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'a]3kf9$mP!xR7vL2nQ8wE5tY0uI4oH6j'
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = await setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: 'custom' },
      clientOnly: false,
      databaseProvider: 'nuxthub',
      hasNuxtHub: true,
      hub: { kv: true },
      consola,
    })

    expect(secondaryStorageEnabled).toBe(true)
  })

  it('does not require hub.kv for "custom" mode', async () => {
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'a]3kf9$mP!xR7vL2nQ8wE5tY0uI4oH6j'
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = await setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: 'custom' },
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(secondaryStorageEnabled).toBe(true)
  })
})
