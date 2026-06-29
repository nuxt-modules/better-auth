# Server-side authentication

## Helpers

- `serverAuth(event?)`
- `getUserSession(event)`
- `getRequestSession(event)`
- `requireUserSession(event, options?)`
- `createSession(event, userId)`
- `setSessionCookie(event, token)`

All of them are auto-imported inside `server/`.

## Which helper to use

| Need | Helper |
| --- | --- |
| Access raw Better Auth APIs | `serverAuth(event)` |
| Read session if it exists | `getUserSession(event)` |
| Reuse the same session lookup in one request | `getRequestSession(event)` |
| Enforce auth | `requireUserSession(event, options?)` |
| Create session in a custom flow | `createSession(event, userId)` |
| Attach session cookie manually | `setSessionCookie(event, token)` |

## Common pattern

```ts
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event, {
    user: { role: 'admin' },
  })

  return { userId: user.id }
})
```

## Matching rules

- scalar value: exact match
- array value: OR match
- multiple fields: AND match
- `rule`: custom callback for logic that field matching cannot express
  })
  return getPremiumContent()
})

// Owner-only resource
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const { user } = await requireUserSession(event)
  const resource = await getResource(id)
  if (resource.ownerId !== user.id) {
    throw createError({ statusCode: 403 })
  }
  return resource
})
```
