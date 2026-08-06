import type { Nuxt, NuxtPage } from '@nuxt/schema'
import type { AuthRouteRules } from '../runtime/types'
import { existsSync, statSync } from 'node:fs'
import { addComponentsDir, addImportsDir, addPlugin, addServerHandler, addServerImports, addServerImportsDir, addServerScanDir, extendPages, updateTemplates } from '@nuxt/kit'
import { defu } from 'defu'
import { isAbsolute, join } from 'pathe'
import { createRouter, toRouteMatcher } from 'radix3'
import { setupDevTools } from '../devtools'

interface ResolveInput {
  resolve: (path: string) => string
}

interface RegisterServerRuntimeInput extends ResolveInput {
  clientOnly: boolean
}

interface RegisterDevtoolsInput extends ResolveInput {
  nuxt: Nuxt
  clientOnly: boolean
  hasHubDb: boolean
}

interface RegisterPrepareTypesHookInput {
  nuxt: Nuxt
  serverDir: string
  hasHubDb: boolean
}

export function registerTemplateHmrHook(nuxt: Nuxt): void {
  nuxt.hook('builder:watch', async (_event, relativePath) => {
    if (relativePath.includes('auth.config'))
      await updateTemplates({ filter: t => t.filename.includes('nuxt-better-auth') })
  })
}

export function registerServerRuntime(input: RegisterServerRuntimeInput): void {
  const { clientOnly, resolve } = input

  if (!clientOnly) {
    addServerImportsDir(resolve('./runtime/server/utils'))
    addServerImports([{ name: 'defineServerAuth', from: resolve('./runtime/config') }])
    addServerScanDir(resolve('./runtime/server/middleware'))
    addServerHandler({ route: '/api/auth/**', handler: resolve('./runtime/server/api/auth/[...all]') })
  }

  addImportsDir(resolve('./runtime/app/composables'))
  addImportsDir(resolve('./runtime/utils'))
  if (!clientOnly)
    addPlugin({ src: resolve('./runtime/app/plugins/session.server'), mode: 'server' })
  addPlugin({ src: resolve('./runtime/app/plugins/session.client'), mode: 'client' })
  addComponentsDir({ path: resolve('./runtime/app/components') })
}

export function registerAuthMiddlewareHook(nuxt: Nuxt, resolve: (path: string) => string): void {
  nuxt.hook('app:resolve', (app) => {
    app.middleware.push({ name: 'auth', path: resolve('./runtime/app/middleware/auth.global'), global: true })
  })
}

export function registerPrepareTypesHook(input: RegisterPrepareTypesHookInput): void {
  const { nuxt, serverDir, hasHubDb } = input

  nuxt.hook('prepare:types', ({ nodeTsConfig, nodeReferences, sharedReferences }) => {
    nodeTsConfig.compilerOptions ||= {}
    nodeTsConfig.compilerOptions.paths ||= {}

    const projectReferenceTypePaths = [
      join(nuxt.options.buildDir, 'types/nitro-imports.d.ts'),
      join(nuxt.options.buildDir, 'types/auth-database.d.ts'),
      join(nuxt.options.buildDir, 'types/auth-schema.d.ts'),
      join(nuxt.options.buildDir, 'types/auth-secondary-storage.d.ts'),
    ]

    if (hasHubDb)
      projectReferenceTypePaths.push(join(nuxt.options.buildDir, 'hub/db.d.ts'))

    const exactNodeAliases = {
      '#server': serverDir,
      '#auth/server': nuxt.options.alias['#auth/server'],
      '#auth/client': nuxt.options.alias['#auth/client'],
      '#auth/database': nuxt.options.alias['#auth/database'],
      '#auth/schema': nuxt.options.alias['#auth/schema'],
      '#auth/secondary-storage': nuxt.options.alias['#auth/secondary-storage'],
      '#auth/route-rules': nuxt.options.alias['#auth/route-rules'],
    } as const

    for (const [key, value] of Object.entries(exactNodeAliases)) {
      if (typeof value === 'string')
        nodeTsConfig.compilerOptions.paths[key] = [value]
    }

    for (const [key, value] of Object.entries(nuxt.options.alias)) {
      if (typeof value !== 'string' || !isAbsolute(value))
        continue

      nodeTsConfig.compilerOptions.paths[key] ||= [value]
      if (!key.includes('*') && existsSync(value) && statSync(value).isDirectory())
        nodeTsConfig.compilerOptions.paths[`${key}/*`] ||= [join(value, '*')]
    }

    nodeTsConfig.compilerOptions.paths['#server/*'] = [join(serverDir, '*')]

    for (const path of projectReferenceTypePaths) {
      if (!nodeReferences.some(reference => 'path' in reference && reference.path === path))
        nodeReferences.push({ path })
      if (!sharedReferences.some(reference => 'path' in reference && reference.path === path))
        sharedReferences.push({ path })
    }
  })
}

export function registerNuxtHubDatabaseExternalHook(nuxt: Nuxt): void {
  // Keep @nuxthub/db as a bare specifier during Nitro bundling so the prerender
  // entry does not rewrite it to a broken relative path when `.nuxt` is nested.
  // @ts-expect-error Nitro augments NuxtHooks at runtime.
  nuxt.hook('nitro:config', (nitroConfig: { externals?: { external?: string[] } }) => {
    nitroConfig.externals ||= {}
    nitroConfig.externals.external ||= []
    if (!nitroConfig.externals.external.includes('@nuxthub/db'))
      nitroConfig.externals.external.push('@nuxthub/db')
  })
}

export async function registerDevtools(input: RegisterDevtoolsInput): Promise<void> {
  const { nuxt, clientOnly, hasHubDb, resolve } = input
  const isProduction = process.env.NODE_ENV === 'production' || !nuxt.options.dev
  if (isProduction || clientOnly)
    return

  setupDevTools(nuxt)
  addServerHandler({ route: '/api/_better-auth/config', method: 'get', handler: resolve('./runtime/server/api/_better-auth/config.get') })

  if (hasHubDb) {
    const handlers = [
      { route: '/api/_better-auth/sessions', method: 'get', handler: resolve('./runtime/server/api/_better-auth/sessions.get') },
      { route: '/api/_better-auth/sessions', method: 'delete', handler: resolve('./runtime/server/api/_better-auth/sessions.delete') },
      { route: '/api/_better-auth/users', method: 'get', handler: resolve('./runtime/server/api/_better-auth/users.get') },
      { route: '/api/_better-auth/accounts', method: 'get', handler: resolve('./runtime/server/api/_better-auth/accounts.get') },
    ] as const

    handlers.forEach(handler => addServerHandler(handler))
  }

  extendPages((pages) => {
    pages.push({ name: 'better-auth-devtools', path: '/__better-auth-devtools', file: resolve('./runtime/app/pages/__better-auth-devtools.vue'), meta: { layout: false } })
  })
}

export function registerRouteRulesMetaHook(nuxt: Nuxt): void {
  nuxt.hook('pages:extend', (pages) => {
    const options = nuxt.options as {
      nitro?: { routeRules?: Record<string, AuthRouteRules> }
      routeRules?: Record<string, AuthRouteRules>
    }
    const routeRules = (options.nitro?.routeRules || options.routeRules || {}) as Record<string, AuthRouteRules>
    if (!Object.keys(routeRules).length)
      return

    const matcher = toRouteMatcher(createRouter({ routes: routeRules }))

    const applyMetaFromRules = (page: NuxtPage) => {
      const matches = matcher.matchAll(page.path) as Partial<AuthRouteRules>[]
      if (!matches.length)
        return

      const matchedRules = defu({}, ...matches.reverse()) as AuthRouteRules

      if (matchedRules.auth !== undefined) {
        page.meta = page.meta || {}
        page.meta.auth = matchedRules.auth
      }

      page.children?.forEach(child => applyMetaFromRules(child))
    }

    pages.forEach(page => applyMetaFromRules(page))
  })
}
