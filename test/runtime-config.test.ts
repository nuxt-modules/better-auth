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

describe('setupRuntimeConfig siteUrl hydration', () => {
  afterEach(() => {
    delete process.env.NUXT_PUBLIC_SITE_URL
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

describe('setupRuntimeConfig secondaryStorage validation', () => {
  it('throws when secondaryStorage enabled in clientOnly mode', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    expect(() => setupRuntimeConfig({
      nuxt,
      options: { secondaryStorage: true },
      clientOnly: true,
      databaseProvider: 'none',
      hasNuxtHub: true,
      hub: { kv: true },
      consola,
    })).toThrow('secondaryStorage is not available in clientOnly mode')
  })

  it('throws when secondaryStorage enabled without NuxtHub', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    expect(() => setupRuntimeConfig({
      nuxt,
      options: { secondaryStorage: true },
      clientOnly: false,
      databaseProvider: 'nuxthub',
      hasNuxtHub: false,
      consola,
    })).toThrow('secondaryStorage requires @nuxthub/core with hub.kv: true')
  })

  it('throws when secondaryStorage enabled without hub.kv', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    const consola = createConsolaMock()

    expect(() => setupRuntimeConfig({
      nuxt,
      options: { secondaryStorage: true },
      clientOnly: false,
      databaseProvider: 'nuxthub',
      hasNuxtHub: true,
      hub: { kv: false },
      consola,
    })).toThrow('secondaryStorage requires @nuxthub/core with hub.kv: true')
  })

  it('returns secondaryStorageEnabled true when properly configured', () => {
    const nuxt = createNuxtWithRuntimeConfig()
    ;(nuxt.options as any).runtimeConfig.betterAuthSecret = 'a]3kf9$mP!xR7vL2nQ8wE5tY0uI4oH6j'
    const consola = createConsolaMock()

    const { secondaryStorageEnabled } = setupRuntimeConfig({
      nuxt,
      options: { secondaryStorage: true },
      clientOnly: false,
      databaseProvider: 'nuxthub',
      hasNuxtHub: true,
      hub: { kv: true },
      consola,
    })

    expect(secondaryStorageEnabled).toBe(true)
  })
})
