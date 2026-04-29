# Route protection

## Layers

1. `routeRules` or `nitro.routeRules` for broad app sections
2. `definePageMeta({ auth })` for page-level overrides
3. `requireUserSession(event)` for server-side enforcement

## Recommended split

- use route rules and page meta for navigation UX
- use `requireUserSession(event)` for protected API routes and mutations

## Common route rules

```ts
export default defineNuxtConfig({
  routeRules: {
    '/app/**': { auth: 'user' },
    '/login': { auth: 'guest' },
    '/admin/**': { auth: { user: { role: 'admin' } } },
  },
})
```

## Matching

- `'user'`: authenticated users only
- `'guest'`: unauthenticated users only
- `{ user: { ... } }`: user must match fields
- arrays inside a field mean OR matching
- multiple fields mean AND matching
