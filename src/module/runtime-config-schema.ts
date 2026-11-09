import type { Nuxt } from '@nuxt/schema'
import { createRequire } from 'node:module'
import { join } from 'pathe'
import { z } from 'zod'

/** Nuxt 5 validates runtime config against the schemas it lists in `_runtimeConfigSchemas`. */
export function supportsRuntimeConfigSchemas(nuxt: Nuxt): boolean {
  return Array.isArray((nuxt.options as { _runtimeConfigSchemas?: unknown })._runtimeConfigSchemas)
}

/**
 * Schemas for the runtime config values users set with `NUXT_*` variables. The module sets the
 * redirect values from its options first, and Nuxt keeps a value already in the runtime config as
 * the default. The secret and `siteUrl` stay unset until then, so a schema an app declares at the
 * same path can still require them.
 */
export function createRuntimeConfigSchema(clientOnly: boolean) {
  const publicConfig = {
    siteUrl: z.string().default(''),
    auth: {
      redirects: {
        login: z.string(),
        guest: z.string(),
        authenticated: z.string().optional(),
        logout: z.string().optional(),
        sessionExpired: z.string().optional(),
      },
      preserveRedirect: z.boolean(),
      redirectQueryKey: z.string(),
    },
  }
  if (clientOnly)
    return { public: publicConfig }
  return { betterAuthSecret: z.string().default(''), public: publicConfig }
}

interface NuxtKitWithSchemas {
  updateRuntimeConfig: (runtimeConfig: Record<string, unknown>) => void | Promise<void>
}

/**
 * Registers the schemas with the Kit that the app's Nuxt resolves. The module's own `@nuxt/kit`
 * can be a 4.x copy, whose `updateRuntimeConfig` would merge the schema objects in as values.
 */
export async function registerRuntimeConfigSchema(nuxt: Nuxt, clientOnly: boolean): Promise<void> {
  const nuxtPackage = createRequire(join(nuxt.options.rootDir, 'package.json')).resolve('nuxt/package.json')
  const { createJiti } = await import('jiti')
  const kit = await import(createJiti(nuxtPackage).esmResolve('@nuxt/kit')) as NuxtKitWithSchemas
  await kit.updateRuntimeConfig(createRuntimeConfigSchema(clientOnly))
}
