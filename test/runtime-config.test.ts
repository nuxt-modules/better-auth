import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setupRuntimeConfig } from '../src/module/runtime'

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
  delete process.env.NUXT_PUBLIC_SITE_URL
  delete process.env.NUXT_BETTER_AUTH_SECRET
  delete process.env.BETTER_AUTH_SECRET
})

describe('setupRuntimeConfig siteUrl hydration', () => {
  it('declares public.siteUrl when no value is configured', () => {
    delete process.env.NUXT_PUBLIC_SITE_URL
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('')
  })

  it('hydrates public.siteUrl from NUXT_PUBLIC_SITE_URL when missing', () => {
    process.env.NUXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('http://localhost:3000')
  })

  it('does not override explicit public.siteUrl with env value', () => {
    process.env.NUXT_PUBLIC_SITE_URL = 'http://localhost:3000'
    const nuxt = createNuxtWithRuntimeConfig({ siteUrl: 'http://127.0.0.1:3000' })
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(nuxt.options.runtimeConfig.public.siteUrl).toBe('http://127.0.0.1:3000')
  })

  it('warns with both runtimeConfig and env guidance when siteUrl is missing in clientOnly mode', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect(consola.warn).toHaveBeenCalledWith('clientOnly mode: set runtimeConfig.public.siteUrl (or NUXT_PUBLIC_SITE_URL) to your frontend URL')
  })
})

describe('setupRuntimeConfig secret resolution', () => {
  it('prefers runtimeConfig over env variables', () => {
    process.env.NUXT_BETTER_AUTH_SECRET = 'nuxi-secret-for-testing-only-32chars'
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'runtime-secret-for-testing-only-32chars'
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('runtime-secret-for-testing-only-32chars')
  })

  it('uses NUXT_BETTER_AUTH_SECRET when runtimeConfig is unset', () => {
    process.env.NUXT_BETTER_AUTH_SECRET = 'nuxi-secret-for-testing-only-32chars'
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('nuxi-secret-for-testing-only-32chars')
  })

  it('falls back to BETTER_AUTH_SECRET when NUXT_BETTER_AUTH_SECRET is unset', () => {
    process.env.BETTER_AUTH_SECRET = 'fallback-secret-for-testing-only-32chars'
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })

    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('fallback-secret-for-testing-only-32chars')
  })

  it('allows production builds without a configured secret', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    nuxt.options.dev = false
    const consola = createConsolaMock()

    expect(() => setupRuntimeConfig({
      nuxt,
      options: {},
      clientOnly: false,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })).not.toThrow()
    expect((nuxt.options as any).runtimeConfig.betterAuthSecret).toBe('')
  })
})

describe('setupRuntimeConfig hubSecondaryStorage validation', () => {
  it('warns and disables NuxtHub KV when atomic secondary storage is unavailable', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = setupRuntimeConfig({
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

  it('throws when hubSecondaryStorage: "custom" in clientOnly mode', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    expect(() => setupRuntimeConfig({
      nuxt,
      options: { hubSecondaryStorage: 'custom' },
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: false,
      consola,
    })).toThrow('hubSecondaryStorage is not available in clientOnly mode')
  })

  it('enables secondary storage for "custom" mode', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'a]3kf9$mP!xR7vL2nQ8wE5tY0uI4oH6j'
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = setupRuntimeConfig({
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

  it('does not require hub.kv for "custom" mode', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'a]3kf9$mP!xR7vL2nQ8wE5tY0uI4oH6j'
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = setupRuntimeConfig({
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
