import type { Nuxt } from '@nuxt/schema'
import type { DbDialect } from './module/hub'
import type { BetterAuthModuleOptions } from './runtime/config'
import type { BetterAuthDatabaseProviderSetupContext } from './types/hooks'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { consola as _consola } from 'consola'
import { dirname, join, relative } from 'pathe'
import { version } from '../package.json'
import { resolveAuthConfigDescriptors } from './module/config-paths'
import { resolveNitroCompatibilityImports } from './module/compatibility'
import { registerAuthMiddlewareHook, registerDevtools, registerNuxtHubDatabaseExternalHook, registerPrepareTypesHook, registerRouteRulesMetaHook, registerServerRuntime, registerTemplateHmrHook } from './module/hooks'
import { setupBetterAuthSchema } from './module/schema'
import { promptForSecret } from './module/secret'
import { collectAuthRouteRules, resolveAuthModuleSetup } from './module/setup'
import { buildAuthRouteRulesCode, buildSchemaExportCode, buildSecondaryStorageCode } from './module/templates'
import { registerServerTypeTemplates, registerSharedTypeTemplates } from './module/type-templates'

import './types/hooks'

const consola = _consola.withTag('nuxt-better-auth')
const serverAliasImportRE = /from\s+['"]#server/
const layersAliasImportRE = /from\s+['"]#layers\//
const rootAliasImportRE = /from\s+['"]~~/
const workspaceAliasImportRE = /from\s+['"]@@/
const dbIdentifierRE = /\bdb\b/
const sessionHookAfterIdentifierRE = /\bsessionHookAfter\b/
const nuxtHubDbImportRE = /@nuxthub\/db/

function isServerConfigSharedTypeSafe(serverConfigPath: string): boolean {
  const resolvedPath = [
    serverConfigPath,
    `${serverConfigPath}.ts`,
    `${serverConfigPath}.mts`,
    `${serverConfigPath}.cts`,
    `${serverConfigPath}.js`,
    `${serverConfigPath}.mjs`,
    `${serverConfigPath}.cjs`,
  ].find(path => existsSync(path))

  if (!resolvedPath)
    return false

  const contents = readFileSync(resolvedPath, 'utf8')

  return !(
    serverAliasImportRE.test(contents)
    || layersAliasImportRE.test(contents)
    || rootAliasImportRE.test(contents)
    || workspaceAliasImportRE.test(contents)
    || dbIdentifierRE.test(contents)
    || sessionHookAfterIdentifierRE.test(contents)
    || nuxtHubDbImportRE.test(contents)
  )
}

async function createDefaultAuthConfigFiles(nuxt: Nuxt): Promise<void> {
  const configs = resolveAuthConfigDescriptors(nuxt)

  const serverTemplate = `import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
`

  const clientTemplate = `import { defineClientAuth } from '@onmax/nuxt-better-auth/config'

export default defineClientAuth({})
`

  if (configs.server.shouldCreateDefaultFile) {
    const serverPath = `${configs.server.path}.ts`
    await mkdir(dirname(serverPath), { recursive: true })
    await writeFile(serverPath, serverTemplate)
    consola.success(`Created ${relative(configs.server.declaringLayerRoot, serverPath)}`)
  }

  if (configs.client.shouldCreateDefaultFile) {
    const clientPath = `${configs.client.path}.ts`
    await mkdir(dirname(clientPath), { recursive: true })
    await writeFile(clientPath, clientTemplate)
    consola.success(`Created ${relative(configs.client.declaringLayerRoot, clientPath)}`)
  }
}

async function ensureSchemaBootstrap(schemaPath: string, dialect: DbDialect): Promise<void> {
  const dialectSchemaPath = join(dirname(schemaPath), `schema.${dialect}.mjs`)
  if (existsSync(schemaPath) && existsSync(dialectSchemaPath))
    return

  await mkdir(dirname(schemaPath), { recursive: true })
  await writeFile(schemaPath, buildSchemaExportCode(false, dialect))
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
    const nitroImports = resolveNitroCompatibilityImports(nuxt._version)
    nuxt.options.alias['#better-auth/nitro-compat'] = resolver.resolve(`./runtime/server/internal/${nitroImports.runtime}`)

    const setup = await resolveAuthModuleSetup({
      nuxt,
      options,
      runtimeTypesAugmentPath: resolver.resolve('./runtime/types/augment'),
      consola,
    })

    if (setup.aliases['#auth/server'])
      nuxt.options.alias['#auth/server'] = setup.aliases['#auth/server']
    nuxt.options.alias['#auth/client'] = setup.aliases['#auth/client']

    if (!setup.clientOnly) {
      const secondaryStorageTemplate = addTemplate({
        filename: 'better-auth/secondary-storage.mjs',
        getContents: () => buildSecondaryStorageCode(setup.runtime.useHubKV),
        write: true,
      })
      nuxt.options.alias['#auth/secondary-storage'] = secondaryStorageTemplate.dst

      const databaseTemplate = addTemplate({
        filename: 'better-auth/database.mjs',
        getContents: () => setup.database.providerDefinition!.buildDatabaseCode(setup.database.buildContext!),
        write: true,
      })
      nuxt.options.alias['#auth/database'] = databaseTemplate.dst

      const schemaTemplate = addTemplate({
        filename: 'better-auth/schema.mjs',
        getContents: () => buildSchemaExportCode(setup.database.hasHubDb, setup.database.buildContext?.hubDialect ?? 'sqlite'),
        write: true,
      })
      nuxt.options.alias['#auth/schema'] = schemaTemplate.dst

      if (setup.schemaGeneration)
        await ensureSchemaBootstrap(schemaTemplate.dst, setup.database.buildContext?.hubDialect ?? 'sqlite')
    }

    if (setup.prepareTypes) {
      registerPrepareTypesHook({
        nuxt,
        serverDir: setup.prepareTypes.serverDir,
        hasHubDb: setup.prepareTypes.hasHubDb,
      })
    }

    if (setup.database.providerDefinition) {
      const setupCtx: BetterAuthDatabaseProviderSetupContext = {
        nuxt,
        options,
        clientOnly: setup.clientOnly,
      }
      await setup.database.providerDefinition.setup?.(setupCtx)
    }

    const authRouteRulesTemplate = addTemplate({
      filename: 'better-auth/route-rules.mjs',
      getContents: () => buildAuthRouteRulesCode(collectAuthRouteRules(nuxt)),
      write: true,
    })
    nuxt.options.alias['#auth/route-rules'] = authRouteRulesTemplate.dst

    if (setup.serverTypes) {
      registerServerTypeTemplates({
        serverConfigPath: setup.serverTypes.serverConfigPath,
        hasHubDb: setup.serverTypes.hasHubDb,
        runtimeTypesPath: resolver.resolve('./runtime/types'),
        sharedServerConfigSafe: isServerConfigSharedTypeSafe(setup.serverTypes.serverConfigPath),
        h3TypesPath: nitroImports.h3,
        nitroTypesPath: nitroImports.types,
      })
    }

    if (setup.schemaGeneration) {
      if (setup.schemaGeneration.externalizeNuxtHubDatabase)
        registerNuxtHubDatabaseExternalHook(nuxt)

      await setupBetterAuthSchema(
        nuxt,
        setup.schemaGeneration.serverConfigPath,
        options,
        consola,
        setup.schemaGeneration.hubSecondaryStorage,
      )
    }

    registerSharedTypeTemplates({
      runtimeTypesAugmentPath: setup.sharedTypes.runtimeTypesAugmentPath,
      runtimeTypesPath: resolver.resolve('./runtime/types'),
      clientConfigPath: setup.sharedTypes.clientConfigPath,
      h3TypesPath: nitroImports.h3,
    })

    registerTemplateHmrHook(nuxt)
    registerServerRuntime({ clientOnly: setup.clientOnly, resolve: resolver.resolve })
    registerAuthMiddlewareHook(nuxt, resolver.resolve)

    await registerDevtools({ nuxt, clientOnly: setup.clientOnly, hasHubDb: setup.database.hasHubDb, resolve: resolver.resolve })
    registerRouteRulesMetaHook(nuxt)
  },
})

export { defineClientAuth, defineServerAuth } from './runtime/config'
export type { AppSession, Auth, AuthActionError, AuthMeta, AuthMode, AuthRouteRules, AuthSession, AuthSocialProviderId, AuthUser, InferSession, InferUser, RequireSessionOptions, ServerAuthContext, UserMatch } from './runtime/types'
