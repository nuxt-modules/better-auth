# Installation and configuration

## Happy path

```bash
npx nuxi module add @onmax/nuxt-better-auth@alpha
```

Required files:

- `server/auth.config.ts`
- `app/auth.config.ts` or the equivalent file inside your `srcDir`
- `.env` with `NUXT_BETTER_AUTH_SECRET`

## Required environment variables

```ini
NUXT_BETTER_AUTH_SECRET=replace-with-a-random-32-character-secret
```

Optional but commonly required in production:

```ini
NUXT_PUBLIC_SITE_URL=https://your-domain.com
```

`BETTER_AUTH_SECRET` is still accepted as a fallback. Prefer `NUXT_BETTER_AUTH_SECRET`.

## Minimal module setup

```ts
export default defineNuxtConfig({
  modules: ['@onmax/nuxt-better-auth'],
})
```

## Minimal server config

```ts
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
  },
})
```

## Minimal client config

```ts
import { defineClientAuth } from '@onmax/nuxt-better-auth/config'

export default defineClientAuth({})
```

## Important rules

- Do not set `secret` manually in `defineServerAuth()`. The module injects it.
- Do not set `baseURL` manually in full mode. The module resolves it.
- Use `auth.clientOnly = true` only when Better Auth runs on an external backend.
- For database-backed auth with the shortest setup, prefer NuxtHub.
  modules: ['@nuxthub/core', '@onmax/nuxt-better-auth'],
  hub: { database: true },
  auth: {
    hubSecondaryStorage: true  // Enable KV for session caching
  }
})
```

See [references/database.md](database.md) for schema setup.

## Client-Only Mode

For external auth backends (microservices, separate servers):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  auth: {
    clientOnly: true,  // No local auth server
  }
})
```

See [references/client-only.md](client-only.md) for full setup.
