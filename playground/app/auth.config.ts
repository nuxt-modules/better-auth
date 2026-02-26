import { navigateTo } from '#imports'
import { sentinelClient } from '@better-auth/infra/client'
import { passkeyClient } from '@better-auth/passkey/client'
import { adminClient, lastLoginMethodClient, multiSessionClient, twoFactorClient } from 'better-auth/client/plugins'
import { defineClientAuth } from '../../src/runtime/config'

export default defineClientAuth({
  plugins: [
    adminClient(),
    sentinelClient(),
    passkeyClient(),
    multiSessionClient(),
    lastLoginMethodClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        navigateTo('/two-factor')
      },
    }),
  ],
})
