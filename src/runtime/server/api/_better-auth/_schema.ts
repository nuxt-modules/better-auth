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
