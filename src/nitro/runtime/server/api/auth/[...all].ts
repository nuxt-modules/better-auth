import type { H3Event } from 'nitro/h3'
import { defineEventHandler } from 'nitro/h3'
import { serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const auth = serverAuth(event)
  return auth.handler(event.req)
})
