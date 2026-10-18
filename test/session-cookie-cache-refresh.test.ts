import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { parseSetCookie } from 'cookie-es'
import { describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({ auth: undefined as ReturnType<typeof betterAuth> | undefined }))

vi.mock('../src/runtime/server/utils/auth', () => ({
  serverAuth: () => authState.auth,
}))

vi.mock('#better-auth/nitro-compat', () => ({
  createAuthError: (status: number, statusText: string) => Object.assign(new Error(statusText), { status }),
}))

function applyCookies(cookies: Map<string, string>, headers: string[]): void {
  for (const header of headers) {
    const cookie = parseSetCookie(header, { decode: value => value })
    if (cookie.maxAge === 0)
      cookies.delete(cookie.name)
    else if (cookie.value !== undefined)
      cookies.set(cookie.name, cookie.value)
  }
}

function createEvent(cookies: Map<string, string>) {
  return {
    context: {},
    req: new Request('https://auth.example.test/api/profile', {
      headers: { cookie: Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; ') },
    }),
    res: { headers: new Headers() },
  } as any
}

describe('refreshSessionCookieCache with Better Auth', () => {
  it.each([
    { cache: 'single cookie', originalName: 'Before', rememberMe: false },
    { cache: 'chunked cookies', originalName: 'Before'.repeat(2000), rememberMe: false },
    { cache: 'persistent cookie', originalName: 'Before', rememberMe: true },
    { cache: 'persistent chunked cookies', originalName: 'Before'.repeat(2000), updatedName: 'After'.repeat(2000), rememberMe: true },
  ])('refreshes user data in subsequent requests with $cache', async ({ originalName, updatedName = 'After', rememberMe }) => {
    const auth = betterAuth({
      secret: 'test-secret-for-testing-only-32chars!',
      baseURL: 'https://auth.example.test',
      database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
      emailAndPassword: { enabled: true },
      session: { cookieCache: { enabled: true } },
      advanced: {
        cookies: {
          session_data: {
            name: 'profile-cache',
            attributes: { domain: 'example.test', path: '/', sameSite: 'strict', partitioned: true },
          },
        },
      },
    })
    authState.auth = auth
    const { getRequestSession, refreshSessionCookieCache } = await import('../src/runtime/server/utils/session')
    const signedUp = await auth.api.signUpEmail({
      body: { name: originalName, email: 'cache@example.test', password: 'password123' },
    })
    const signedIn = await auth.api.signInEmail({
      body: { email: 'cache@example.test', password: 'password123', rememberMe },
      returnHeaders: true,
    })
    const cookies = new Map<string, string>()
    applyCookies(cookies, signedIn.headers.getSetCookie())
    const context = await auth.$context
    const cacheName = context.authCookies.sessionData.name
    const cacheNames = Array.from(cookies.keys()).filter(name => name === cacheName || name.startsWith(`${cacheName}.`))
    expect(cacheNames.length).toBeGreaterThan(0)
    if (originalName.length > 1000)
      expect(cacheNames.length).toBeGreaterThan(1)

    const sessionToken = cookies.get(context.authCookies.sessionToken.name)
    const dontRememberToken = cookies.get(context.authCookies.dontRememberToken.name)
    expect(Boolean(dontRememberToken)).toBe(!rememberMe)
    await context.internalAdapter.updateUser(signedUp.user.id, { name: updatedName })

    const event = createEvent(cookies)
    await expect(getRequestSession(event)).resolves.toMatchObject({ user: { name: originalName } })
    await expect(refreshSessionCookieCache(event)).resolves.toMatchObject({ user: { name: updatedName } })
    await expect(getRequestSession(event)).resolves.toMatchObject({ user: { name: updatedName } })

    applyCookies(cookies, event.res.headers.getSetCookie())
    expect(cookies.get(context.authCookies.sessionToken.name)).toBe(sessionToken)
    expect(cookies.get(context.authCookies.dontRememberToken.name)).toBe(dontRememberToken)
    await expect(getRequestSession(createEvent(cookies))).resolves.toMatchObject({ user: { name: updatedName } })

    const responseCookies = event.res.headers.getSetCookie().map((header: string) => parseSetCookie(header))
    expect(responseCookies.length).toBeGreaterThan(0)
    if (!rememberMe) {
      for (const cacheCookieName of cacheNames) {
        expect(responseCookies).toContainEqual(expect.objectContaining({
          name: cacheCookieName,
          maxAge: 0,
          domain: 'example.test',
          path: '/',
          sameSite: 'strict',
          secure: true,
          httpOnly: true,
          partitioned: true,
        }))
      }
    }
    else {
      const replacements = responseCookies.filter((cookie: ReturnType<typeof parseSetCookie>) => cookie.value)
      expect(replacements.length).toBeGreaterThan(0)
      for (const cookie of replacements) {
        expect(cookie.maxAge).toBe(300)
        expect(cookie.name === cacheName || cookie.name.startsWith(`${cacheName}.`)).toBe(true)
        expect(responseCookies.some((other: ReturnType<typeof parseSetCookie>) => other.name === cookie.name && other.maxAge === 0)).toBe(false)
      }
    }
  })
})
