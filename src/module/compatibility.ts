import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { resolveServerVariant } from '@nuxt/kit'

export interface Nitro3RouteRulesTarget {
  moduleName: string
  configInterface: 'NitroRouteConfig' | 'RouteRuleConfig'
  rulesInterface: 'NitroRouteRules' | 'RouteRules'
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
