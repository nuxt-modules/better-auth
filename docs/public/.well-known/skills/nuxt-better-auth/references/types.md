# TypeScript types

## Primary imports

```ts
import type {
  AuthUser,
  AuthSession,
  AuthMeta,
  AuthRouteRules,
  RequireSessionOptions,
  AuthSocialProviderId,
} from '#nuxt-better-auth'
```

## Key guarantees

- `AuthUser` and `AuthSession` are inferred from your Better Auth config
- plugin fields flow into `useUserSession()`, `requireUserSession()`, and auth route matching
- `AuthSocialProviderId` is inferred from configured social providers

## When to augment manually

Only add manual module augmentation if inference is not enough or you need to declare project-specific fields in advance.

```ts
import '#nuxt-better-auth'

declare module '#nuxt-better-auth' {
  interface AuthUser {
    customField?: string
  }
}
```
    }
  }
})
```

Types automatically include these fields:

```ts
// AuthUser now includes:
interface AuthUser {
  // ... base fields
  plan: string
  credits: number
}
```

## Type-Safe User Matching

```ts
// Fully typed
await requireUserSession(event, {
  user: { role: 'admin' }  // TypeScript knows valid fields
})
```
