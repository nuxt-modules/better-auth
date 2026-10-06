import type { Nuxt } from '@nuxt/schema'
import { runWithNuxtContext } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'
import { resolveAppSecretShim, resolveAuthSecretPlugin, resolveH3TypesPath, resolveServerRuntimeShim, selectNitro3RouteRulesTarget } from '../src/module/compatibility'

function resolveShimFor(options: { nitroMajor?: number, builder?: string }): string {
  const nuxt = {
    _version: options.nitroMajor === 3 ? '5.0.0' : '4.6.0',
    options: {
      rootDir: '/nonexistent',
      modulesDir: [],
      ...(options.nitroMajor ? { _nitroMajor: options.nitroMajor } : {}),
      ...(options.builder ? { server: { builder: options.builder } } : {}),
    },
  } as unknown as Nuxt
  return runWithNuxtContext(nuxt, () => resolveServerRuntimeShim(path => path))
}

describe('nuxt server runtime shim', () => {
  it('keeps the h3 v1 shim on a nitropack v2 host', () => {
    expect(resolveShimFor({ nitroMajor: 2 })).toBe('./runtime/server/internal/nitro2')
  })

  it('uses the nuxt/server shim on Nitro v3', () => {
    expect(resolveShimFor({ nitroMajor: 3 })).toBe('./runtime/server/internal/portable')
  })

  it('uses the nuxt/server shim when server.builder is not Nitro', () => {
    expect(resolveShimFor({ nitroMajor: 2, builder: '@nuxt/vite-server' })).toBe('./runtime/server/internal/portable')
  })

  it('treats a Nitro server.builder like the default builder', () => {
    expect(resolveShimFor({ nitroMajor: 2, builder: '@nuxt/nitro-server' })).toBe('./runtime/server/internal/nitro2')
  })

  it('falls back to the h3 v1 shim on hosts that do not stamp a Nitro major', () => {
    expect(resolveShimFor({})).toBe('./runtime/server/internal/nitro2')
  })
})

describe('nuxt appSecret derivation', () => {
  it.each([
    ['4.0.0', './runtime/server/internal/app-secret-unavailable'],
    ['4.5.2', './runtime/server/internal/app-secret-unavailable'],
    ['4.6.0', './runtime/server/internal/app-secret'],
    ['5.0.0-2610052343-36eafab', './runtime/server/internal/app-secret'],
  ])('selects the appSecret shim for Nuxt %s', async (version, expected) => {
    // Nuxt 4.6 with Nitro 2 keeps the nitro2 server shim, so this must follow the Nuxt version.
    const nuxt = { _version: version, options: { _nitroMajor: 2 }, callHook: async () => {} } as unknown as Nuxt
    await expect(runWithNuxtContext(nuxt, () => resolveAppSecretShim(path => path))).resolves.toBe(expected)
  })
})

describe('auth secret startup plugin', () => {
  function resolvePluginFor(version: string, options: { nitroMajor?: number, builder?: string }) {
    const nuxt = {
      _version: version,
      options: {
        ...(options.nitroMajor ? { _nitroMajor: options.nitroMajor } : {}),
        ...(options.builder ? { server: { builder: options.builder } } : {}),
      },
      callHook: async () => {},
    } as unknown as Nuxt
    return runWithNuxtContext(nuxt, () => resolveAuthSecretPlugin(path => path))
  }

  it.each([
    ['4.6.0', 2],
    ['5.0.0-2610052343-36eafab', 3],
  ])('is registered on Nuxt %s with Nitro %i', async (version, nitroMajor) => {
    await expect(resolvePluginFor(version, { nitroMajor })).resolves.toBe('./runtime/server/plugins/auth-secret')
  })

  it('is not registered before Nuxt 4.6', async () => {
    await expect(resolvePluginFor('4.5.2', { nitroMajor: 2 })).resolves.toBeUndefined()
  })

  it('is not registered when server.builder is not Nitro', async () => {
    await expect(resolvePluginFor('4.6.0', { nitroMajor: 2, builder: '@nuxt/vite-server' })).resolves.toBeUndefined()
  })
})

describe('nuxt Nitro type imports', () => {
  it('types events with h3 v1 unless the host runs Nitro v3', () => {
    expect(resolveH3TypesPath(2)).toBe('h3')
    expect(resolveH3TypesPath(undefined)).toBe('h3')
    expect(resolveH3TypesPath(3)).toBe('nitro/h3')
  })

  it('augments early Nitro 3 route-rule interfaces directly', () => {
    expect(selectNitro3RouteRulesTarget('interface NitroRouteConfig {}', () => 'unused')).toEqual({
      moduleName: 'nitro/types',
      configInterface: 'NitroRouteConfig',
      rulesInterface: 'NitroRouteRules',
    })
  })

  it('resolves the h3 module owned by newer Nitro 3 releases', () => {
    expect(selectNitro3RouteRulesTarget('type NitroRouteConfig = RouteRuleConfig', () => '/nested/h3/rules.mjs')).toEqual({
      moduleName: '/nested/h3/rules.mjs',
      configInterface: 'RouteRuleConfig',
      rulesInterface: 'RouteRules',
    })
  })
})
