import type { H3Event } from 'h3'
import { defineEventHandler, toWebRequest } from 'h3'
import { serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const auth = serverAuth(event)
  return auth.handler(toWebRequest(event))
})
