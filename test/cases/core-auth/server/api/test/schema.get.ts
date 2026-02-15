import { db } from '#auth/database'
import * as schema from '#auth/schema'

export default defineEventHandler(async () => {
  const hasSchema = Boolean(schema?.user && schema?.session && schema?.account && schema?.verification)
  const hasUserQuery = typeof db?.query?.user?.findMany === 'function'
  let queryWorks = false

  if (hasUserQuery) {
    await db.query.user.findMany({ limit: 1 })
    queryWorks = true
  }

  return {
    hasSchema,
    hasUserQuery,
    queryWorks,
  }
})
