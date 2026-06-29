# Client-side authentication

## Primary entry point

```ts
const {
  user,
  session,
  loggedIn,
  ready,
  client,
  signIn,
  signUp,
  signOut,
  fetchSession,
  updateUser,
} = useUserSession()
```

## What to rely on

- `ready` means the initial auth state has resolved.
- `client` is browser-only and `null` during SSR.
- `signIn` and `signUp` proxy Better Auth client methods.
- `signOut` clears local state after the server sign-out flow completes.

## Common patterns

### Email sign-in

```ts
await signIn.email(
  { email: 'user@example.com', password: 'password123' },
  { onSuccess: () => navigateTo('/dashboard') },
)
```

### Social sign-in

```ts
await signIn.social({ provider: 'github' })
```

### Loading state

```vue
<template>
  <div v-if="!ready">Loading...</div>
  <div v-else-if="loggedIn">Welcome, {{ user?.name }}</div>
  <div v-else>Please log in</div>
</template>
```

### Force refresh

```ts
await fetchSession({ force: true })
```

## Redirect rule

If you read `route.query.redirect`, validate it before navigating. Only allow local paths.
await client.revokeSession({ sessionId: 'xxx' })

// Revoke all sessions except current
await client.revokeOtherSessions()

// Revoke all sessions (logs out everywhere)
await client.revokeSessions()
```

These methods require the user to be authenticated.

## BetterAuthState Component

Renders once session hydration completes (`ready === true`), with loading placeholder support.

```vue
<BetterAuthState>
  <template #default="{ loggedIn, user, session, signOut }">
    <p v-if="loggedIn">Hi {{ user?.name }}</p>
    <button v-else @click="navigateTo('/login')">Sign in</button>
  </template>
  <template #placeholder>
    <p>Loading…</p>
  </template>
</BetterAuthState>
```

**Slots:**

- `default` - Renders when `ready === true`, provides `{ loggedIn, user, session, signOut }`
- `placeholder` - Renders while session hydrates

Useful in clientOnly mode or for graceful SSR loading states.
