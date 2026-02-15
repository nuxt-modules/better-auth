import type { Session } from 'better-auth/types'
import { defineEventHandler, getQuery } from 'h3'
import { paginationQuerySchema, sanitizeSearchPattern } from './_schema'

type SafeSession = Pick<Session, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'ipAddress' | 'userAgent'>

export default defineEventHandler(async (event) => {
  try {
    const { db, schema } = await import('@nuxthub/db')
    if (!schema.session)
      return { sessions: [], total: 0, error: 'Session table not found' }

    const query = paginationQuerySchema.parse(getQuery(event))
    const { page, limit, search } = query
    const offset = (page - 1) * limit

    const { count, like, or, desc } = await import('drizzle-orm')

    let dbQuery = db.select().from(schema.session)
    let countQuery = db.select({ count: count() }).from(schema.session)

    if (search) {
      const pattern = sanitizeSearchPattern(search)
      const searchCondition = or(
        like(schema.session.userId, pattern),
        schema.session.ipAddress ? like(schema.session.ipAddress, pattern) : undefined,
      )
      if (searchCondition) {
        dbQuery = dbQuery.where(searchCondition) as typeof dbQuery
        countQuery = countQuery.where(searchCondition) as typeof countQuery
      }
    }

    const [sessions, totalResult] = await Promise.all([
      dbQuery.orderBy(desc(schema.session.createdAt)).limit(limit).offset(offset),
      countQuery,
    ])

    // Return only safe fields (allowlist approach for security)
    const safeSessions: SafeSession[] = sessions.map((s: Session) => ({
      id: s.id,
      userId: s.userId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      expiresAt: s.expiresAt,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    }))

    return { sessions: safeSessions, total: totalResult[0]?.count ?? 0, page, limit }
  }
  catch (error: unknown) {
    console.error('[DevTools] Fetch sessions failed:', error)
    return { sessions: [], total: 0, error: 'Failed to fetch sessions' }
  }
})
