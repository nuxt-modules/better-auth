import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { hasNuxtCompatibility, resolveServerVariant } from '@nuxt/kit'

export interface Nitro3RouteRulesTarget {
  moduleName: string
  configInterface: 'NitroRouteConfig' | 'RouteRuleConfig'
  rulesInterface: 'NitroRouteRules' | 'RouteRules'
}

function exportedNames(declaration: string): Set<string> {
  const names = new Set<string>()
  for (const [, specifiers] of declaration.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const specifier of specifiers!.split(',')) {
      const name = specifier.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim()
      if (name)
        names.add(name)
    }
  }
  return names
}

export function selectNitro3RouteRulesTarget(
  nitroTypesDeclaration: string,
  resolveH3Rules: () => string,
): Nitro3RouteRulesTarget {
  if (/\binterface\s+NitroRouteConfig\b/.test(nitroTypesDeclaration)) {
    return {
      moduleName: 'nitro/types',
      configInterface: 'NitroRouteConfig',
      rulesInterface: 'NitroRouteRules',
    }
  }

  // Nitro re-exports h3's interfaces and documents `nitro/types` as the place to augment them.
  // Mixing that with an augmentation of h3's file path lets TypeScript drop one of the two,
  // depending on load order, so other modules' rules and ours must share the specifier.
  const exported = exportedNames(nitroTypesDeclaration)
  if (exported.has('RouteRuleConfig') && exported.has('RouteRules')) {
    return {
      moduleName: 'nitro/types',
      configInterface: 'RouteRuleConfig',
      rulesInterface: 'RouteRules',
    }
  }

  return {
    moduleName: resolveH3Rules(),
    configInterface: 'RouteRuleConfig',
    rulesInterface: 'RouteRules',
  }
}

export function resolveNitro3RouteRulesTarget(nuxtRootDir: string): Nitro3RouteRulesTarget {
  const fallback: Nitro3RouteRulesTarget = {
    moduleName: 'nitro/types',
    configInterface: 'NitroRouteConfig',
    rulesInterface: 'NitroRouteRules',
  }

  try {
    const projectRequire = createRequire(join(nuxtRootDir, 'package.json'))
    const nuxtRequire = createRequire(projectRequire.resolve('nuxt/package.json'))
    // Nuxt 5 installs Nitro through its integration package in isolated pnpm layouts.
    let nitroTypesPath: string
    try {
      const integrationRequire = createRequire(nuxtRequire.resolve('@nuxt/nitro-server'))
      nitroTypesPath = integrationRequire.resolve('nitro/types')
    }
    catch {
      // Earlier Nuxt snapshots depend on Nitro directly.
      nitroTypesPath = nuxtRequire.resolve('nitro/types')
    }
    const declarationCandidates = [
      nitroTypesPath.replace(/\.mjs$/, '.d.mts'),
      nitroTypesPath.replace(/\.js$/, '.d.ts'),
      nitroTypesPath,
    ]
    const declarationPath = declarationCandidates.find(path => existsSync(path))
    if (!declarationPath)
      return fallback

    return selectNitro3RouteRulesTarget(
      readFileSync(declarationPath, 'utf8'),
      () => createRequire(nitroTypesPath).resolve('h3/rules'),
    )
  }
  catch {
    return fallback
  }
}

/**
 * The server runtime shim behind `#better-auth/nitro-compat`. Kit picks the variant the
 * host runs: `nitro2` on a `nitropack` v2 host (including Nuxt < 4.6), and the portable
 * `nuxt/server` shim on Nitro v3 or a non-Nitro `server.builder`.
 */
export function resolveServerRuntimeShim(resolve: (path: string) => string): string {
  const nitro2 = resolve('./runtime/server/internal/nitro2')
  return resolveServerVariant({
    nuxt: resolve('./runtime/server/internal/portable'),
    nitro2,
  }) ?? nitro2
}

/** h3 v2 types ship with Nitro v3 as `nitro/h3`; every other host types events with h3 v1. */
export function resolveH3TypesPath(nitroMajor: number | undefined): 'h3' | 'nitro/h3' {
  return nitroMajor === 3 ? 'nitro/h3' : 'h3'
}

/**
 * The module behind `#better-auth/app-secret`. `nuxt/server` ships `deriveSecret()` from Nuxt 4.6
 * on every server builder, including Nitro 2, so this follows the Nuxt version rather than the
 * server variant.
 */
export async function resolveAppSecretShim(resolve: (path: string) => string): Promise<string> {
  const canDeriveAppSecret = await hasNuxtCompatibility({ nuxt: '>=4.6.0-0' })
  return resolve(`./runtime/server/internal/${canDeriveAppSecret ? 'app-secret' : 'app-secret-unavailable'}`)
}

/**
 * The Nitro plugin that starts deriving the auth secret when the server starts, on Nuxt 4.6+.
 * `nuxt/server` has no plugin surface, so a non-Nitro `server.builder` gets none: the secret is
 * then derived on the first request, or by `ensureServerAuth()`.
 */
export async function resolveAuthSecretPlugin(resolve: (path: string) => string): Promise<string | undefined> {
  if (!await hasNuxtCompatibility({ nuxt: '>=4.6.0-0' }))
    return
  if (!resolveServerVariant({ nitro2: true, nitro3: true, nuxt: false }))
    return
  return resolve('./runtime/server/plugins/auth-secret')
}
