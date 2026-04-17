import type { H3Event } from 'h3'
import { defineEventHandler, toWebRequest } from 'h3'
import { cleanupRequestDatabase, serverAuth } from '../../utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const auth = serverAuth(event)
  try {
    return await auth.handler(toWebRequest(event))
  }
  finally {
    await cleanupRequestDatabase(event)
  }
})
