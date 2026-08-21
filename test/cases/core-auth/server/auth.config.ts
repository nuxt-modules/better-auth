import { createAuthEndpoint } from 'better-auth/api'
import { defineServerAuth } from '../../../../src/runtime/config'

function ssrOriginProbe() {
  return {
    id: 'ssr-origin-probe',
    endpoints: {
      ssrOrigin: createAuthEndpoint('/test/ssr-origin', { method: 'POST' }, async (ctx) => {
        return {
          origin: ctx.request?.headers.get('origin') ?? null,
          header: ctx.request?.headers.get('x-request-shape') ?? null,
        }
      }),
    },
  } as const
}

export default defineServerAuth({
  appName: 'Test App',
  emailAndPassword: { enabled: true },
  plugins: [ssrOriginProbe()] as const,
  trustedOrigins: (request) => {
    const host = request?.headers.get('host')
    return request && host ? [`${new URL(request.url).protocol}//${host}`] : []
  },
})
