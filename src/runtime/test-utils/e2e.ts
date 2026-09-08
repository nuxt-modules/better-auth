import type { TestOptions } from '@nuxt/test-utils/e2e'
import type { AuthSession, AuthUser } from '#nuxt-better-auth'
import type { LoginResult, TestHelpers } from 'better-auth/plugins'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { url } from '@nuxt/test-utils/e2e'
import { parseJSON } from 'better-auth/client'
import { getRandomPort } from 'get-port-please'
import { defu } from 'defu'

export type TestLoginOptions = Parameters<TestHelpers['login']>[0]
export type TestLoginResult = Omit<LoginResult, 'user' | 'session'> & { user: AuthUser, session: AuthSession }

/** Create isolated auth fixtures in the Nuxt server started by @nuxt/test-utils. */
export async function createAuthTestContext(options: Partial<TestOptions> = {}) {
  if (options.host || options.dev || options.build === false || options.server === false)
    throw new Error('[nuxt-better-auth] Auth E2E helpers require a local test build. Use setup() with build and server enabled, without dev or host.')

  const port = options.port || await getRandomPort('127.0.0.1')
  const siteUrl = `http://127.0.0.1:${port}`
  const token = randomUUID()
  const endpoint = '/api/auth/__test__'
  const setupOptions: Partial<TestOptions> = defu({
    port,
    dev: false,
    env: { NUXT_PUBLIC_SITE_URL: siteUrl },
    nuxtConfig: {
      test: true,
      runtimeConfig: { public: { siteUrl } },
      modules: [[fileURLToPath(new URL('./module', import.meta.url)), { token }]],
    },
  } satisfies Partial<TestOptions>, options)

  async function call<T>(action: string, data: unknown = {}): Promise<T> {
    const response = await fetch(url(endpoint), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nuxt-auth-test': token },
      body: JSON.stringify({ action, data }),
    })
    if (!response.ok)
      throw new Error(`[nuxt-better-auth] Test helper ${action} failed (${response.status}): ${await response.text()}`)
    return parseJSON(await response.text()) as T
  }

  return {
    setupOptions,
    /** Create a user with Better Auth's factory and track it for cleanup. */
    createUser: (overrides: Partial<AuthUser> & Record<string, unknown> = {}) => call<AuthUser>('createUser', overrides),
    /** Create a real session for a user created by this context. */
    async login(options: TestLoginOptions): Promise<TestLoginResult> {
      const result = await call<Omit<TestLoginResult, 'headers'> & { headers: [string, string][] }>('login', options)
      return { ...result, headers: new Headers(result.headers) }
    },
    /** Delete users created by this context, including their sessions. */
    async clear() {
      await call('clear')
    },
  }
}
