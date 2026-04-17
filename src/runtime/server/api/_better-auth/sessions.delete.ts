import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'

const deleteSessionSchema = z.object({
  id: z.string().min(1, 'Session ID required'),
})

export default defineEventHandler(async (event) => {
  try {
    const body = deleteSessionSchema.parse(await readBody(event))

    const { db } = await import('@nuxthub/db')
    const { schema } = await import('#auth/schema')
    if (!schema?.session)
      throw createError({ statusCode: 500, message: 'Session table not found' })

    const { eq } = await import('drizzle-orm')
    await db.delete(schema.session).where(eq(schema.session.id, body.id))

    return { success: true }
  }
  catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: error.errors[0]?.message || 'Invalid request' })
    }
    console.error('[DevTools] Delete session failed:', error)
    throw createError({ statusCode: 500, message: 'Failed to delete session' })
  }
})
