import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const auth = serverAuth(event)
    const options = auth.options
    const authContext = await ((auth as { $context?: Promise<{ trustedOrigins?: string[] }> | { trustedOrigins?: string[] } }).$context)
    const runtimeConfig = useRuntimeConfig()
    const publicAuth = runtimeConfig.public?.auth as {
      redirects?: { login?: string, guest?: string }
      preserveRedirect?: boolean
      redirectQueryKey?: string
      useDatabase?: boolean
      databaseProvider?: 'none' | 'nuxthub' | 'convex'
    } | undefined
    const privateAuth = runtimeConfig.auth as { secondaryStorage?: boolean } | undefined
    const configuredTrustedOrigins = Array.isArray(options.trustedOrigins) ? options.trustedOrigins : []
    const effectiveTrustedOrigins = authContext?.trustedOrigins || configuredTrustedOrigins

    // Session config with sensible defaults display
    const sessionConfig = options.session || {}
    const expiresInDays = sessionConfig.expiresIn ? Math.round(sessionConfig.expiresIn / 86400) : 7
    const updateAgeDays = sessionConfig.updateAge ? Math.round(sessionConfig.updateAge / 86400) : 1

    return {
      config: {
        // Module config (nuxt.config.ts)
        module: {
          redirects: publicAuth?.redirects || { login: '/login', guest: '/' },
          preserveRedirect: publicAuth?.preserveRedirect ?? true,
          redirectQueryKey: publicAuth?.redirectQueryKey ?? 'redirect',
          secondaryStorage: privateAuth?.secondaryStorage ?? false,
          useDatabase: publicAuth?.useDatabase ?? false,
          databaseProvider: publicAuth?.databaseProvider ?? 'none',
        },
        // Server config (server/auth.config.ts)
        server: {
          baseURL: options.baseURL,
          basePath: options.basePath || '/api/auth',
          socialProviders: Object.keys(options.socialProviders || {}),
          plugins: (options.plugins || []).map((p: { id?: string }) => p.id || 'unknown'),
          trustedOrigins: effectiveTrustedOrigins,
          configuredTrustedOrigins,
          session: {
            expiresIn: `${expiresInDays} days`,
            updateAge: `${updateAgeDays} days`,
            cookieCache: sessionConfig.cookieCache?.enabled ?? false,
          },
          emailAndPassword: !!options.emailAndPassword,
          rateLimit: options.rateLimit?.enabled ?? false,
          advanced: {
            useSecureCookies: options.advanced?.useSecureCookies ?? 'auto',
            disableCSRFCheck: options.advanced?.disableCSRFCheck ?? false,
          },
        },
      },
    }
  }
  catch (error: unknown) {
    console.error('[DevTools] Config fetch failed:', error)
    return { config: null, error: 'Failed to fetch configuration' }
  }
})
