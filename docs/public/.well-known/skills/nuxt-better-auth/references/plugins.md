# Better Auth plugins

## Rule of thumb

If a Better Auth plugin has a client companion, register both:

- server plugin in `server/auth.config.ts`
- client plugin in `app/auth.config.ts`

## Example

```ts
import { admin, twoFactor } from 'better-auth/plugins'

export default defineServerAuth({
  plugins: [admin(), twoFactor()],
})
```

```ts
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'

export default defineClientAuth({
  plugins: [adminClient(), twoFactorClient()],
})
```

## Common plugin pairs

| Server | Client |
| --- | --- |
| `admin()` | `adminClient()` |
| `twoFactor()` | `twoFactorClient()` |
| `passkey()` | `passkeyClient()` |
| `multiSession()` | `multiSessionClient()` |

## Why it matters

Without the matching client plugin, client-side methods and inferred types for that feature are incomplete.

// Client
import { multiSessionClient } from 'better-auth/client/plugins'
plugins: [multiSessionClient()]
```

Usage:

```ts
// List all sessions
const sessions = await client.multiSession.listDeviceSessions()

// Revoke specific session
await client.multiSession.revokeSession({ sessionId: 'xxx' })
```

## Plugin Type Inference

Types from plugins are automatically inferred. See [references/types.md](types.md) for type augmentation.
