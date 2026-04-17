import type { Nuxt } from '@nuxt/schema'
import type { NuxtHubOptions } from './module/hub'
import type { BetterAuthModuleOptions, ModuleDatabaseProviderId } from './runtime/config'
import type {
  BetterAuthDatabaseProviderBuildContext,
  BetterAuthDatabaseProviderDefinition,
  BetterAuthDatabaseProviderEnabledContext,
  BetterAuthDatabaseProviderSetupContext,
} from './types/hooks'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { addTemplate, createResolver, defineNuxtModule, getLayerDirectories, hasNuxtModule } from '@nuxt/kit'
import { consola as _consola } from 'consola'
import { dirname, join, relative } from 'pathe'
import { version } from '../package.json'
import { resolveDatabaseProvider } from './database-provider'
import { getEffectiveModuleConfigFile, resolveModuleConfigPath, shouldCreateDefaultModuleConfig } from './module/config-paths'
import { registerAuthMiddlewareHook, registerDevtools, registerRouteRulesMetaHook, registerServerRuntime, registerTemplateHmrHook } from './module/hooks'
import { getHubCasing, getHubDialect } from './module/hub'
import { setupRuntimeConfig } from './module/runtime'
import { setupBetterAuthSchema } from './module/schema'
import { promptForSecret } from './module/secret'
import { buildDatabaseCode, buildSecondaryStorageCode } from './module/templates'
import { registerServerTypeTemplates, registerSharedTypeTemplates } from './module/type-templates'

import './types/hooks'

const consola = _consola.withTag('nuxt-better-auth')

async function createDefaultAuthConfigFiles(nuxt: Nuxt): Promise<void> {
  const project = getLayerDirectories(nuxt)[0]!
  const rootDir = project.root
  const serverPath = join(project.server, 'auth.config.ts')
  const clientPath = join(project.app, 'auth.config.ts')
  const serverConfigFile = getEffectiveModuleConfigFile(nuxt, 'server')
  const clientConfigFile = getEffectiveModuleConfigFile(nuxt, 'client')

  const serverTemplate = `import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
`

  const clientTemplate = `import { defineClientAuth } from '@onmax/nuxt-better-auth/config'

export default defineClientAuth({})
`

  if (shouldCreateDefaultModuleConfig(nuxt, 'server', serverConfigFile)) {
    await mkdir(dirname(serverPath), { recursive: true })
    await writeFile(serverPath, serverTemplate)
    consola.success(`Created ${relative(rootDir, serverPath)}`)
  }

  if (shouldCreateDefaultModuleConfig(nuxt, 'client', clientConfigFile)) {
    await mkdir(dirname(clientPath), { recursive: true })
    await writeFile(clientPath, clientTemplate)
    consola.success(`Created ${relative(rootDir, clientPath)}`)
  }
}

export type { BetterAuthModuleOptions } from './runtime/config'

export default defineNuxtModule<BetterAuthModuleOptions>({
  meta: { name: '@onmax/nuxt-better-auth', version, configKey: 'auth', compatibility: { nuxt: '>=4.0.0' } },
  defaults: {
    clientOnly: false,
    serverConfig: 'server/auth.config',
    clientConfig: 'app/auth.config',
    redirects: { login: '/login', guest: '/' },
    preserveRedirect: true,
    redirectQueryKey: 'redirect',
    hubSecondaryStorage: false,
  },
  async onInstall(nuxt) {
    const configuredSecret = nuxt.options.runtimeConfig?.betterAuthSecret as string | undefined
    const generatedSecret = await promptForSecret(nuxt.options.rootDir, consola, { configuredSecret, prepare: Boolean(nuxt.options._prepare) })
    if (generatedSecret)
      process.env.NUXT_BETTER_AUTH_SECRET = generatedSecret

    await createDefaultAuthConfigFiles(nuxt)
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const clientOnly = options.clientOnly!
    const serverConfigFile = options.serverConfig!
    const clientConfigFile = options.clientConfig!
    const { file: resolvedServerConfigFile, path: serverConfigPath } = resolveModuleConfigPath(nuxt, 'server', serverConfigFile)
    const { file: resolvedClientConfigFile, path: clientConfigPath } = resolveModuleConfigPath(nuxt, 'client', clientConfigFile)

    const serverConfigExists = existsSync(`${serverConfigPath}.ts`) || existsSync(`${serverConfigPath}.js`)
    const clientConfigExists = existsSync(`${clientConfigPath}.ts`) || existsSync(`${clientConfigPath}.js`)

    if (!clientOnly && !serverConfigExists)
      throw new Error(`[nuxt-better-auth] Missing ${resolvedServerConfigFile}.ts - export default defineServerAuth(...)`)
    if (!clientConfigExists)
      throw new Error(`[nuxt-better-auth] Missing ${resolvedClientConfigFile}.ts - export default defineClientAuth(...)`)

    const hasNuxtHub = hasNuxtModule('@nuxthub/core', nuxt)
    const hub = hasNuxtHub ? (nuxt.options as { hub?: NuxtHubOptions }).hub : undefined
    const hasHubDbAvailable = !clientOnly && hasNuxtHub && !!hub?.db
    let databaseProvider: ModuleDatabaseProviderId = 'none'
    let hasHubDb = false

    nuxt.options.alias['#nuxt-better-auth'] = resolver.resolve('./runtime/types/augment')
    if (!clientOnly)
      nuxt.options.alias['#auth/server'] = serverConfigPath
    nuxt.options.alias['#auth/client'] = clientConfigPath

    if (clientOnly) {
      setupRuntimeConfig({
        nuxt,
        options,
        clientOnly,
        databaseProvider,
        hasNuxtHub,
        hub,
        consola,
      })
    }
    else {
      const hubDialect = getHubDialect(hub) ?? 'sqlite'
      const usePlural = options.schema?.usePlural ?? false
      const camelCase = (options.schema?.casing ?? getHubCasing(hub)) !== 'snake_case'

      const providers: Record<string, BetterAuthDatabaseProviderDefinition> = {
        nuxthub: {
          priority: 100,
          isEnabled: ({ hasHubDbAvailable }) => hasHubDbAvailable,
          buildDatabaseCode: () => buildDatabaseCode({
            provider: 'nuxthub',
            hubDialect,
            usePlural,
            camelCase,
          }),
        },
        none: {
          priority: 0,
          buildDatabaseCode: () => buildDatabaseCode({
            provider: 'none',
            hubDialect,
            usePlural,
            camelCase,
          }),
        },
      }

      const enabledCtx: BetterAuthDatabaseProviderEnabledContext = { nuxt, options, clientOnly, hasHubDbAvailable }
      await nuxt.callHook('better-auth:database:providers', providers)
      const resolvedProvider = resolveDatabaseProvider({ providers, context: enabledCtx })
      databaseProvider = resolvedProvider.id
      hasHubDb = databaseProvider === 'nuxthub'

      const { useHubKV } = setupRuntimeConfig({
        nuxt,
        options,
        clientOnly,
        databaseProvider,
        hasNuxtHub,
        hub,
        consola,
      })

      if (useHubKV && !nuxt.options.alias['hub:kv']) {
        throw new Error('[nuxt-better-auth] hub:kv not found. Ensure @nuxthub/core is loaded before this module and hub.kv is enabled.')
      }

      const secondaryStorageTemplate = addTemplate({
        filename: 'better-auth/secondary-storage.mjs',
        getContents: () => buildSecondaryStorageCode(useHubKV),
        write: true,
      })
      nuxt.options.alias['#auth/secondary-storage'] = secondaryStorageTemplate.dst

      if (hasHubDb && !nuxt.options.alias['hub:db']) {
        throw new Error('[nuxt-better-auth] hub:db not found. Ensure @nuxthub/core is loaded before this module and hub.db is configured.')
      }

      const setupCtx: BetterAuthDatabaseProviderSetupContext = { nuxt, options, clientOnly }
      await resolvedProvider.definition.setup?.(setupCtx)

      const buildCtx: BetterAuthDatabaseProviderBuildContext = { hubDialect, usePlural, camelCase }
      const databaseTemplate = addTemplate({
        filename: 'better-auth/database.mjs',
        getContents: () => resolvedProvider.definition.buildDatabaseCode(buildCtx),
        write: true,
      })
      nuxt.options.alias['#auth/database'] = databaseTemplate.dst

      const schemaTemplate = addTemplate({
        filename: 'better-auth/schema.mjs',
        getContents: () => {
          if (!hasHubDb)
            return 'export const schema = undefined\n'

          return `export * from './schema.${hubDialect}.mjs'
import * as schema from './schema.${hubDialect}.mjs'
export { schema }
`
        },
        write: true,
      })
      nuxt.options.alias['#auth/schema'] = schemaTemplate.dst

      registerServerTypeTemplates({
        serverConfigPath,
        hasHubDb,
        runtimeTypesPath: resolver.resolve('./runtime/types'),
      })

      if (hasHubDb) {
        // Keep @nuxthub/db as a bare specifier during Nitro bundling so the
        // prerender entry doesn't rewrite it to a broken relative path like
        // `../../../../../../../../@nuxthub/db/db.mjs` when `.nuxt` lives
        // inside `node_modules/.cache/nuxt/`.
        // @ts-expect-error Nitro augments NuxtHooks at runtime.
        nuxt.hook('nitro:config', (nitroConfig: { externals?: { external?: string[] } }) => {
          nitroConfig.externals ||= {}
          nitroConfig.externals.external ||= []
          if (!nitroConfig.externals.external.includes('@nuxthub/db'))
            nitroConfig.externals.external.push('@nuxthub/db')
        })

        await setupBetterAuthSchema(nuxt, serverConfigPath, options, consola, options.hubSecondaryStorage ?? false)
      }
    }

    registerSharedTypeTemplates({
      runtimeTypesAugmentPath: resolver.resolve('./runtime/types/augment'),
      runtimeTypesPath: resolver.resolve('./runtime/types'),
      clientConfigPath,
    })

    const runtimeRouteRulesSource = (
      (nuxt.options as { nitro?: { routeRules?: Record<string, unknown> } }).nitro?.routeRules
      || (nuxt.options as { routeRules?: Record<string, unknown> }).routeRules
      || {}
    ) as Record<string, unknown>

    const authRouteRules = Object.fromEntries(
      Object.entries(runtimeRouteRulesSource).flatMap(([path, rule]) => {
        if (!rule || typeof rule !== 'object' || !('auth' in rule))
          return []
        return [[path, { auth: (rule as { auth?: unknown }).auth }]]
      }),
    )

    const authRouteRulesTemplate = addTemplate({
      filename: 'better-auth/route-rules.mjs',
      getContents: () => `export const authRouteRules = ${JSON.stringify(authRouteRules, null, 2)}\n`,
      write: true,
    })
    nuxt.options.alias['#auth/route-rules'] = authRouteRulesTemplate.dst

    registerTemplateHmrHook(nuxt)
    registerServerRuntime({ clientOnly, resolve: resolver.resolve })
    registerAuthMiddlewareHook(nuxt, resolver.resolve)

    await registerDevtools({ nuxt, clientOnly, hasHubDb, resolve: resolver.resolve })
    registerRouteRulesMetaHook(nuxt)
  },
})

export { defineClientAuth, defineServerAuth } from './runtime/config'
export type { AppSession, Auth, AuthActionError, AuthMeta, AuthMode, AuthRouteRules, AuthSession, AuthSocialProviderId, AuthUser, InferSession, InferUser, RequireSessionOptions, ServerAuthContext, UserMatch } from './runtime/types'
