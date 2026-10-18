import type { ServerEvent } from '../../internal/nitro-compat'
import { prepareAuthSecret } from '../../internal/auth-secret'
import { defineEventHandler, toWebRequest } from '../../internal/nitro-compat'
import { serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event: ServerEvent) => {
  await prepareAuthSecret()
  const auth = serverAuth(event)
  return auth.handler(toWebRequest(event))
})
