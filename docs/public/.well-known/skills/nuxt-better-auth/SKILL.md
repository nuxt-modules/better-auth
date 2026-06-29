---
name: nuxt-better-auth
description: Use when implementing auth in Nuxt apps with @onmax/nuxt-better-auth - provides client composables, server helpers, route protection, session refresh helpers, and Better Auth plugin integration.
license: MIT
---

# Nuxt Better Auth

Authentication module for Nuxt 4+ built on [Better Auth](https://www.better-auth.com/). It adds Nuxt-specific setup, route protection, server helpers, and typed auth state.

> Alpha status: the package is still pre-stable. Verify behavior against the current docs and source before relying on edge cases.

## When to Use

- Installing/configuring `@onmax/nuxt-better-auth`
- Implementing sign-in, sign-up, sign-out, or custom auth flows
- Protecting routes (client and server)
- Accessing user session in API routes
- Refreshing session state after custom auth endpoints or server-side session changes
- Integrating Better Auth plugins (admin, passkey, 2FA)
- Setting up database with NuxtHub
- Using clientOnly mode for external auth backends

## Available Guidance

| File                                                                 | Topics                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **[references/installation.md](references/installation.md)**         | install flow, env vars, config files                                   |
| **[references/client-auth.md](references/client-auth.md)**           | `useUserSession`, client methods, redirects, loading states, custom actions |
| **[references/server-auth.md](references/server-auth.md)**           | `serverAuth`, session helpers, `refreshSessionCookieCache`, API enforcement |
| **[references/route-protection.md](references/route-protection.md)** | route rules, page meta, API protection                                 |
| **[references/plugins.md](references/plugins.md)**                   | plugin pairing between server and client                               |
| **[references/database.md](references/database.md)**                 | NuxtHub schema generation, secondary storage                           |
| **[references/client-only.md](references/client-only.md)**           | external Better Auth backends and `clientOnly` mode                    |
| **[references/types.md](references/types.md)**                       | public auth types and augmentation                                     |

## Usage Pattern

- Installing module? → [references/installation.md](references/installation.md)
- Login/signup forms? → [references/client-auth.md](references/client-auth.md)
- API route protection? → [references/server-auth.md](references/server-auth.md)
- Route rules/page meta? → [references/route-protection.md](references/route-protection.md)
- Using plugins? → [references/plugins.md](references/plugins.md)
- Database setup? → [references/database.md](references/database.md)
- External auth backend? → [references/client-only.md](references/client-only.md)
- TypeScript types? → [references/types.md](references/types.md)

Do not load every reference file by default. Pick the smallest file that matches the task.

## Key Concepts

| Concept                | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `useUserSession()`     | Client composable - user, session, loggedIn, refresh, sign-out |
| `runWithSessionRefresh()` | Refresh local session after custom auth endpoints |
| `requireUserSession()` | Server helper - throws 401/403 if not authenticated             |
| `refreshSessionCookieCache()` | Refresh Better Auth's cached session cookie after server updates |
| `auth` route mode      | `'user'`, `'guest'`, `{ user: {...} }`, or `false`              |
| `serverAuth()`         | Get Better Auth instance in server routes                       |

## Quick Reference

```ts
// Client: useUserSession()
const { user, loggedIn, signIn, signOut } = useUserSession()
await signIn.email({ email, password }, { onSuccess: () => navigateTo('/') })
```

```ts
// Client: custom auth endpoint
await runWithSessionRefresh(() => $fetch('/api/custom-login', { method: 'POST', body }))
```

```ts
// Server: requireUserSession()
const { user } = await requireUserSession(event, { user: { role: 'admin' } })
```

```ts
// Server: after updating fields returned by session helpers
await updateCurrentUser(event)
await refreshSessionCookieCache(event)
```

```ts
// nuxt.config.ts: Route protection
routeRules: {
  '/admin/**': { auth: { user: { role: 'admin' } } },
  '/login': { auth: 'guest' },
  '/app/**': { auth: 'user' }
}
```

Broad rules such as `'/**': { auth: 'user' }` skip framework/module internals like `/_nuxt/**`, `/_ipx/**`, `/api/auth/**`, `/api/_better-auth/**`, and `/api/_nuxt_icon/**`.

## Resources

- [Documentation site](https://better-auth.nuxt.dev)
- [Better Auth Docs](https://www.better-auth.com/)
