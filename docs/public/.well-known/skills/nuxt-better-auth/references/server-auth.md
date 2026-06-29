# Server-side authentication

## Helpers

These helpers are auto-imported inside `server/` in full mode:

- `serverAuth(event?)`
- `getUserSession(event)`
- `getRequestSession(event)`
- `refreshSessionCookieCache(event)`
- `requireUserSession(event, options?)`
- `createSession(event, userId)`
- `setSessionCookie(event, token)`

## Which helper to use

| Need | Helper |
| --- | --- |
| Access raw Better Auth APIs | `serverAuth(event)` |
| Read session if it exists | `getUserSession(event)` |
| Reuse the same session lookup in one request | `getRequestSession(event)` |
| Refresh Better Auth's cached session cookie after server-side updates | `refreshSessionCookieCache(event)` |
| Enforce auth | `requireUserSession(event, options?)` |
| Create a session in a custom flow | `createSession(event, userId)` |
| Attach a session token cookie manually | `setSessionCookie(event, token)` |

## Common API protection

```ts
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event, {
    user: { role: 'admin' },
  })

  return { userId: user.id }
})
```

`requireUserSession(event)` throws `401` when unauthenticated and `403` when the user match or custom rule fails.

## Refresh cached session data

Use `refreshSessionCookieCache(event)` after server-side code updates data returned by `auth.api.getSession()`, `getUserSession(event)`, or `getRequestSession(event)`.

```ts
export default defineEventHandler(async (event) => {
  await updateCurrentUserProfile(event)
  await refreshSessionCookieCache(event)

  return { ok: true }
})
```

The helper refreshes the cached session cookie and the request-scoped `getRequestSession(event)` memo. It does not update the user or session record; do that first.

## Matching rules

- scalar value: exact match
- array value: OR match
- multiple fields: AND match
- `rule`: custom callback for logic field matching cannot express

```ts
await requireUserSession(event, {
  user: { role: ['admin', 'owner'] },
  rule: ({ user }) => user.verified === true,
})
```

## Custom server auth flow

```ts
export default defineEventHandler(async (event) => {
  const userId = await verifyCustomLogin(event)
  const session = await createSession(event, userId)
  await setSessionCookie(event, session.token)

  return { ok: true }
})
```

`setSessionCookie(event, token)` sets the Better Auth session token cookie only. It does not recreate every Better Auth sign-in side effect.
