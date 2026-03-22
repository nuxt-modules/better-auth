import type { BetterAuthNitroOptions } from './module-types'
import type { AuthMeta } from './runtime/types'

declare module 'nitro/types' {
  interface NitroConfig {
    betterAuth?: BetterAuthNitroOptions
  }

  interface NitroRouteRules {
    auth?: AuthMeta
  }

  interface NitroRouteConfig {
    auth?: AuthMeta
  }
}

export {}
