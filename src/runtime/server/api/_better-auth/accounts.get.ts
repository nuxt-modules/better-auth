import type { DevtoolsSchema } from './_schema'
import type { Account } from 'better-auth/types'
import { paginationQuerySchema, sanitizeSearchPattern } from './_schema'
import { defineEventHandler, getQuery } from '../../internal/nitro-compat'

type SafeAccount = Pick<Account, 'id' | 'userId' | 'providerId' | 'accountId' | 'createdAt'>

export default defineEventHandler(async (event) => {
  try {
    const { db } = await import('@nuxthub/db')
    const { schema } = await import('#auth/schema') as { schema: DevtoolsSchema }
    if (!schema?.account)
      return { accounts: [], total: 0, error: 'Account table not found' }

    const query = paginationQuerySchema.parse(getQuery(event))
    const { page, limit, search } = query
    const offset = (page - 1) * limit

    const { count, like, desc } = await import('drizzle-orm')

    let dbQuery = db.select().from(schema.account)
    let countQuery = db.select({ count: count() }).from(schema.account)

    if (search) {
      const pattern = sanitizeSearchPattern(search)
      dbQuery = dbQuery.where(like(schema.account.providerId, pattern)) as typeof dbQuery
      countQuery = countQuery.where(like(schema.account.providerId, pattern)) as typeof countQuery
    }

    const [accounts, totalResult] = await Promise.all([
      dbQuery.orderBy(desc(schema.account.createdAt)).limit(limit).offset(offset),
      countQuery,
    ])

    // Account rows contain OAuth credentials and credential-provider passwords.
    // Keep the devtools response to the metadata rendered by the UI.
    const safeAccounts: SafeAccount[] = accounts.map((account: Account) => ({
      id: account.id,
      userId: account.userId,
      providerId: account.providerId,
      accountId: account.accountId,
      createdAt: account.createdAt,
    }))

    return { accounts: safeAccounts, total: totalResult[0]?.count ?? 0, page, limit }
  }
  catch (error: unknown) {
    console.error('[DevTools] Fetch accounts failed:', error)
    return { accounts: [], total: 0, error: 'Failed to fetch accounts' }
  }
})
