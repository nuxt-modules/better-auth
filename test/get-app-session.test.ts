import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionMock = vi.fn()
const matchesUserMock = vi.fn(() => true)

vi.mock('../src/runtime/server/utils/auth', () => ({
  serverAuth: () => ({
    api: {
      getSession: getSessionMock,
    },
  }),
}))

vi.mock('../src/runtime/utils/match-user', () => ({
  matchesUser: (...args: unknown[]) => matchesUserMock(...args),
}))

vi.mock('h3', () => ({
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode, statusMessage }),
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

describe('getAppSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    matchesUserMock.mockReset()
    matchesUserMock.mockReturnValue(true)
  })

  it('memoizes session on event.context.appSession', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getAppSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const first = await getAppSession(event)
    const second = await getAppSession(event)

    expect(first).toEqual(second)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
    expect(event.context.appSession).toEqual(first)
  })

  it('deduplicates concurrent resolution within a single request', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getAppSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const p1 = getAppSession(event)
    const p2 = getAppSession(event)

    resolveSession?.({ user: { id: 'u1' }, session: { id: 's1' } })

    const [first, second] = await Promise.all([p1, p2])
    expect(first).toEqual(second)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it('memoizes and deduplicates when event.context is unavailable', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getAppSession } = await import('../src/runtime/server/utils/session')
    const event = createEventWithoutContext()

    const p1 = getAppSession(event)
    const p2 = getAppSession(event)

    resolveSession?.({ user: { id: 'u1' }, session: { id: 's1' } })

    const [first, second] = await Promise.all([p1, p2])
    const third = await getAppSession(event)

    expect(first).toEqual(second)
    expect(third).toEqual(first)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
    expect('context' in event).toBe(false)
  })
})

describe('getUserSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockReset()
    matchesUserMock.mockReset()
    matchesUserMock.mockReturnValue(true)
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
    expect(event.context.appSession).toBeUndefined()
  })

  it('reuses cached appSession when available', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getAppSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const cached = await getAppSession(event)
    const session = await getUserSession(event)

    expect(session).toEqual(cached)
    expect(getSessionMock).toHaveBeenCalledTimes(1)
  })

  it('awaits in-flight appSession load without starting a second fetch', async () => {
    let resolveSession: ((value: unknown) => void) | undefined
    getSessionMock.mockImplementation(() => new Promise((resolve) => {
      resolveSession = resolve
    }))

    const { getAppSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    const p1 = getAppSession(event)
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

  it('reuses cached appSession when event.context is unavailable', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'u1' },
      session: { id: 's1' },
    })
    const { getAppSession, getUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEventWithoutContext()

    const cached = await getAppSession(event)
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
    matchesUserMock.mockReset()
    matchesUserMock.mockReturnValue(true)
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
    matchesUserMock.mockReturnValue(false)

    const { requireUserSession } = await import('../src/runtime/server/utils/session')
    const event = createEvent()

    await expect(requireUserSession(event, { user: { role: 'admin' } })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied',
    })
  })
})
