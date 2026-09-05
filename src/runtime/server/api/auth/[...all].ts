import type { ServerEvent } from '../../internal/nitro-compat'
import { defineEventHandler, toWebRequest } from '../../internal/nitro-compat'
import { serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event: ServerEvent) => {
  const auth = serverAuth(event)
  return auth.handler(toWebRequest(event))
})
