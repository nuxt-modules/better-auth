# Route protection

## Layers

1. `routeRules` or `nitro.routeRules` for broad app sections
2. `definePageMeta({ auth })` for page-level overrides
3. `requireUserSession(event)` for server-side enforcement

Use route rules and page meta for navigation UX. Use `requireUserSession(event)` for protected API routes and mutations.

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

The same auth keys work under `nitro.routeRules`. If both `routeRules` and `nitro.routeRules` are set, the module reads `nitro.routeRules`.

## Matching

- `'user'`: authenticated users only
- `'guest'`: unauthenticated users only
- `{ user: { ... } }`: user must match fields
- arrays inside a field mean OR matching
- multiple fields mean AND matching
- `false`: disable auth for that route/page

## Broad rules and internals

Broad rules such as `'/**': { auth: 'user' }` intentionally skip framework and module internals that must stay reachable:

- `/_nuxt/**`
- `/_ipx/**`
- `/__nuxt_devtools__/**`
- `/__better-auth-devtools`
- `/api/auth/**`
- `/api/_better-auth/**`
- `/api/_nuxt_icon/**`

The same broad rules still apply to app-owned pages and app-owned `/api/**` handlers.

## Page meta

```vue
<script setup lang="ts">
definePageMeta({
  auth: {
    only: 'user',
    redirectTo: '/login',
    user: { role: ['admin', 'owner'] },
  },
})
</script>
```

Page meta overrides global route rules for that page.
