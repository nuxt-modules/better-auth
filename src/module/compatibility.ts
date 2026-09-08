import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export interface NitroCompatibilityImports {
  h3: 'h3' | 'nitro/h3'
  runtime: 'nitro2' | 'nitro3'
}

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

export function resolveNitroCompatibilityImports(nuxtVersion: string): NitroCompatibilityImports {
  const major = Number.parseInt(nuxtVersion, 10)
  const nitroV3 = Number.isFinite(major) && major >= 5

  return {
    h3: nitroV3 ? 'nitro/h3' : 'h3',
    runtime: nitroV3 ? 'nitro3' : 'nitro2',
  }
}
