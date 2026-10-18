import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const account = {
    id: 'account-id',
    userId: 'user-id',
    providerId: 'credential',
    accountId: 'user@example.com',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  }

  return {
    accountSchema: {
      id: 'id',
      userId: 'userId',
      providerId: 'providerId',
      accountId: 'accountId',
      createdAt: 'createdAt',
    },
    rows: [{
      ...account,
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token',
      idToken: 'oauth-id-token',
      password: 'hashed-password',
      scope: 'openid email',
    }],
    countResult: [{ count: 1 }],
    db: { select: vi.fn() },
    getQuery: vi.fn(() => ({ page: 1, limit: 20, search: '' })),
  }
})

vi.mock('../src/runtime/server/internal/nitro-compat', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getQuery: mocks.getQuery,
}))

vi.mock('@nuxthub/db', () => ({ db: mocks.db }))
vi.mock('#auth/schema', () => ({ schema: { account: mocks.accountSchema } }))
vi.mock('drizzle-orm', () => ({
  count: vi.fn(() => 'count'),
  desc: vi.fn((column: unknown) => column),
  like: vi.fn(),
}))

const handler = (await import('../src/runtime/server/api/_better-auth/accounts.get')).default as (event: unknown) => Promise<unknown>

function createQuery<T>(result: T) {
  const query = Promise.resolve(result) as Promise<T> & Record<string, ReturnType<typeof vi.fn>>
  query.where = vi.fn(() => query)
  query.orderBy = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.offset = vi.fn(() => query)
  return query
}

describe('devtools account response', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const accountRows = createQuery(mocks.rows)
    const countRows = createQuery(mocks.countResult)
    mocks.db.select
      .mockImplementationOnce(() => ({ from: vi.fn(() => accountRows) }))
      .mockImplementationOnce(() => ({ from: vi.fn(() => countRows) }))
  })

  it('returns account metadata without credential material', async () => {
    const response = await handler({}) as {
      accounts: Record<string, unknown>[]
      total: number
      page: number
      limit: number
    }

    expect(response).toMatchObject({ total: 1, page: 1, limit: 20 })
    expect(response.accounts).toEqual([{
      id: 'account-id',
      userId: 'user-id',
      providerId: 'credential',
      accountId: 'user@example.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    }])
    expect(response.accounts[0]).not.toHaveProperty('accessToken')
    expect(response.accounts[0]).not.toHaveProperty('refreshToken')
    expect(response.accounts[0]).not.toHaveProperty('idToken')
    expect(response.accounts[0]).not.toHaveProperty('password')
    expect(response.accounts[0]).not.toHaveProperty('scope')
  })
})
