import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionMock = vi.fn()
const createSessionMock = vi.fn()

const authContextMock = {
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
  return {
    headers: new Headers(),
    context: {},
  } as any
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
