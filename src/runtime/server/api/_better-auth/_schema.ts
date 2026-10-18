import type { Account, Session, User } from 'better-auth/types'
import type { AnyColumn, Table } from 'drizzle-orm'
import { z } from 'zod'

const SQL_LIKE_ESCAPE_RE = /[%_\\]/g

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).default(''),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function sanitizeSearchPattern(search: string): string {
  if (!search)
    return ''
  return `%${search.replace(SQL_LIKE_ESCAPE_RE, '\\$&')}%`
}

// Devtools handlers are also typechecked in apps without a generated auth schema.
export type DevtoolsSchema = {
  user?: Table & Record<keyof User, AnyColumn>
  session?: Table & Record<keyof Session, AnyColumn>
  account?: Table & Record<keyof Account, AnyColumn>
} | undefined
