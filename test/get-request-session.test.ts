import type { CookieOptions } from 'better-call'
import { serializeSignedCookie } from 'better-call'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionMock = vi.fn()
const createSessionMock = vi.fn()

const authContextMock = {
  authCookies: {
    sessionToken: {
      name: '__Secure-better-auth.session_token',
      attributes: {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
      } satisfies CookieOptions,
    },
    sessionData: {
      name: '__Secure-better-auth.session_data',
      attributes: {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
      } satisfies CookieOptions,
    },
    dontRememberToken: {
      name: '__Secure-better-auth.dont_remember',
      attributes: {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
      } satisfies CookieOptions,
    },
  },
  secret: 'test-secret-for-testing-only-32chars!',
  sessionConfig: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  internalAdapter: {
    createSession: createSessionMock,
  },
}

vi.mock('../src/runtime/server/utils/auth', () => ({
  serverAuth: () => ({
    api: {
      getSession: getSessionMock,
    },
    $context: Promise.resolve(authContextMock),
  }),
}))

function createEvent() {
  const headers = new Map<string, string | string[]>()
  return {
    headers: new Headers(),
    context: {},
    node: {
      res: {
        getHeader(name: string) {
          return headers.get(name.toLowerCase())
        },
        setHeader(name: string, value: string | string[]) {
          headers.set(name.toLowerCase(), value)
        },
      },
    },
  } as any
}

function getCookieValueFromSetCookieHeader(header: string): string {
  const separatorIndex = header.indexOf(';')
  const cookiePair = separatorIndex >= 0 ? header.slice(0, separatorIndex) : header
  return cookiePair.slice(cookiePair.indexOf('=') + 1)
}

function createEventWithoutContext() {
  return {
    headers: new Headers(),
  } as any
}

describe('getRequestSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('memoizes session on event.context.requestSession', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getRequestSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const first = await getRequestSession(event)
    const second = await getRequestSession(event)

    expect(first).toBe(second)
    expect(event.context.requestSession).toBe(first)
  })

  it('deduplicates concurrent resolution within a single request', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getRequestSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const p1 = getRequestSession(event)
    const p2 = getRequestSession(event)

    resolveSession?.({ user: { id: 'u1' }, session: { id: 's1' } })

    const [first, second] = await Promise.all([p1, p2])
    expect(first).toBe(second)
  })

  it('memoizes and deduplicates when event.context is unavailable', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getRequestSession } = await import('../src/runtime/server/utils/session')
    const event = createEventWithoutContext()

    const p1 = getRequestSession(event)
    const p2 = getRequestSession(event)

    resolveSession?.({ user: { id: 'u1' }, session: { id: 's1' } })

    const [first, second] = await Promise.all([p1, p2])
    const third = await getRequestSession(event)

    expect(first).toBe(second)
    expect(third).toBe(first)
    expect('context' in event).toBe(false)
  })
})

describe('getUserSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('does not memoize when session exists', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const first = await getUserSession(event)
    const second = await getUserSession(event)

    expect(first).toEqual(second)
    expect(getSessionMock).toHaveBeenCalledTimes(2)
    expect(event.context.requestSession).toBeUndefined()
  })

  it('reuses cached requestSession when available', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getRequestSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const cached = await getRequestSession(event)
    const session = await getUserSession(event)

    expect(session).toEqual(cached)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it('awaits in-flight requestSession load without starting a second fetch', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getRequestSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const p1 = getRequestSession(event)
    const p2 = getUserSession(event)

    resolveSession?.({ user: { id: 'u1' }, session: { id: 's1' } })

    const [first, second] = await Promise.all([p1, p2])
    expect(first).toEqual(second)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it('does not memoize when event.context is unavailable', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEventWithoutContext()

    const first = await getUserSession(event)
    const second = await getUserSession(event)

    expect(first).toEqual(second)
    expect(getSessionMock).toHaveBeenCalledTimes(2)
    expect('context' in event).toBe(false)
  })

  it('reuses cached requestSession when event.context is unavailable', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getRequestSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEventWithoutContext()

    const cached = await getRequestSession(event)
    const session = await getUserSession(event)

    expect(session).toEqual(cached)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
    expect('context' in event).toBe(false)
  })
})

describe('refreshSessionCookieCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('refreshes Better Auth cookie cache headers and request session memo', async () => {
    const staleSession = {
      user: { id: 'u1', name: 'Before' },
      session: { id: 's1' },
    }
    const freshSession = {
      user: { id: 'u1', name: 'After' },
      session: { id: 's1' },
    }
    const sessionDataCookie = `${authContextMock.authCookies.sessionData.name}=fresh; Path=/; Expires=Wed, 21 Oct 2030 07:28:00 GMT; HttpOnly`
    const sessionTokenCookie = `${authContextMock.authCookies.sessionToken.name}=token; Path=/; HttpOnly`
    const headers = new Headers()
    headers.set('set-cookie', `${sessionDataCookie}, ${sessionTokenCookie}`)

    getSessionMock
      .mockResolvedValueOnce(staleSession)
      .mockResolvedValueOnce({ headers, response: freshSession })

    const { getRequestSession, refreshSessionCookieCache } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    await expect(getRequestSession(event)).resolves.toEqual(staleSession)
    await expect(refreshSessionCookieCache(event)).resolves.toEqual(freshSession)
    await expect(getRequestSession(event)).resolves.toEqual(freshSession)

    expect(getSessionMock).toHaveBeenCalledTimes(2)
    expect(getSessionMock.mock.calls[1]?.[0]).toMatchObject({
      query: { disableCookieCache: true },
      returnHeaders: true,
    })
    expect(getSessionMock.mock.calls[1]?.[0].headers).toBe(event.headers)
    expect(event.context.requestSession).toEqual(freshSession)
    expect(event.node.res.getHeader('set-cookie')).toEqual([
      sessionDataCookie,
      sessionTokenCookie,
    ])
  })
})

describe('requireUserSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('keeps existing 401 behavior when no session exists', async () => {
    getSessionMock.mockResolvedValue(null)
    const { requireUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    await expect(requireUserSession(event)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  })

  it('keeps existing 403 behavior for user matching', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1', role: 'member' },
      session: { id: 's1' },
    })

    const { requireUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    await expect(requireUserSession(event, { user: { role: 'admin' } })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied',
    })
  })
})

describe('setSessionCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('writes the signed session cookie and expires stale cache cookies', async () => {
    const { setSessionCookie } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    await setSessionCookie(event, 'session-token')

    const header = event.node.res.getHeader('set-cookie')
    expect(Array.isArray(header)).toBe(true)
    expect(header).toHaveLength(3)
    expect(header[0]).toBe(await serializeSignedCookie(
      authContextMock.authCookies.sessionToken.name,
      'session-token',
      authContextMock.secret,
      {
        ...authContextMock.authCookies.sessionToken.attributes,
        maxAge: authContextMock.sessionConfig.expiresIn,
      },
    ))
    expect(header[1]).toContain(`${authContextMock.authCookies.sessionData.name}=`)
    expect(header[1]).toContain('Max-Age=0')
    expect(header[2]).toContain(`${authContextMock.authCookies.dontRememberToken.name}=`)
    expect(header[2]).toContain('Max-Age=0')
  })

  it('expires chunked session cache cookies left on the request', async () => {
    const { setSessionCookie } = await import('../src/runtime/server/utils/session')
    const event = createEvent()
    event.headers.set('cookie', [
      `${authContextMock.authCookies.sessionData.name}.0=chunk-0`,
      `${authContextMock.authCookies.sessionData.name}.1=chunk-1`,
      `${authContextMock.authCookies.dontRememberToken.name}=remember-me`,
    ].join('; '))

    await setSessionCookie(event, 'session-token')

    const header = event.node.res.getHeader('set-cookie')
    expect(Array.isArray(header)).toBe(true)
    expect(header).toEqual(expect.arrayContaining([
      expect.stringContaining(`${authContextMock.authCookies.sessionData.name}=`),
      expect.stringContaining(`${authContextMock.authCookies.sessionData.name}.0=`),
      expect.stringContaining(`${authContextMock.authCookies.sessionData.name}.1=`),
      expect.stringContaining(`${authContextMock.authCookies.dontRememberToken.name}=`),
    ]))
  })

  it('makes the new session visible later in the same request', async () => {
    const { getRequestSession, setSessionCookie } = await import('../src/runtime/server/utils/session')
    const event = createEvent()
    const expectedCookie = await serializeSignedCookie(
      authContextMock.authCookies.sessionToken.name,
      'session-token',
      authContextMock.secret,
      {
        ...authContextMock.authCookies.sessionToken.attributes,
        maxAge: authContextMock.sessionConfig.expiresIn,
      },
    )
    const expectedCookieValue = getCookieValueFromSetCookieHeader(expectedCookie)
    const session = {
      user: { id: 'u1' },
      session: { id: 's1' },
    }

    getSessionMock.mockImplementation(({ headers }: { headers: Headers }) => {
      const cookies = headers.get('cookie')
      return cookies?.includes(`${authContextMock.authCookies.sessionToken.name}=${expectedCookieValue}`)
        ? Promise.resolve(session)
        : Promise.resolve(null)
    })

    await setSessionCookie(event, 'session-token')

    await expect(getRequestSession(event)).resolves.toEqual(session)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })
})

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    createSessionMock.mockReset()
  })

  it('delegates to Better Auth internalAdapter.createSession with dontRememberMe disabled', async () => {
    createSessionMock.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      token: 'token-1',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const { createSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()
    const session = await createSession(event, 'u1')

    expect(createSessionMock).toHaveBeenCalledWith('u1', false)
    expect(session).toMatchObject({
      id: 's1',
      userId: 'u1',
      token: 'token-1',
    })
  })
})
