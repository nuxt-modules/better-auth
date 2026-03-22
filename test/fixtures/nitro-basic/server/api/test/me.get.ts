import { defineEventHandler } from 'nitro/h3'
import { requireUserSession } from '../../../../../../dist/nitro.mjs'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  return {
    userId: session.user.id,
  }
})
