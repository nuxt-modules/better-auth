# Database integration

## Fastest database-backed path

Use NuxtHub.

```ts
export default defineNuxtConfig({
  modules: ['@nuxthub/core', '@onmax/nuxt-better-auth'],
  hub: {
    db: 'sqlite',
  },
})
```

## What the module does with NuxtHub

- reads `server/auth.config.ts`
- generates auth tables from enabled Better Auth features
- exposes generated schema through `#auth/schema`
- can optionally use NuxtHub KV for session lookup caching

## Secondary storage

```ts
export default defineNuxtConfig({
  hub: {
    db: 'sqlite',
    kv: true,
  },
  auth: {
    hubSecondaryStorage: true,
  },
})
```

Important:

- `hubSecondaryStorage: true` requires `hub.kv: true`
- `hubSecondaryStorage: 'custom'` means you provide your own `secondaryStorage`
- use DB-only reads if you prefer stricter read-after-write consistency

## Non-NuxtHub setups

If you are not using NuxtHub, configure the Better Auth adapter yourself in `server/auth.config.ts` and manage schema generation separately.
