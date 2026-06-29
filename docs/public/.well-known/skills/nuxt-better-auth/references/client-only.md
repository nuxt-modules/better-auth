# Client-only mode

Use `clientOnly` when Better Auth runs on a separate backend.

## Minimal setup

```ts
export default defineNuxtConfig({
  modules: ['@onmax/nuxt-better-auth'],
  auth: {
    clientOnly: true,
  },
})
```

```ini
NUXT_PUBLIC_SITE_URL=https://auth.example.com
```

## What changes

- no local `/api/auth/**` handlers
- no local `server/auth.config.ts`
- no server utilities such as `serverAuth()` or `requireUserSession()`
- no SSR session hydration from a local auth server
- `useUserSession()` still works on the client

## External server requirements

- allow cross-origin requests with credentials
- use secure cross-site cookies when needed
- include the frontend origin in `trustedOrigins`
