# Installation & Configuration

## Install

```bash
pnpm add @onmax/nuxt-better-auth better-auth
```

**Version Requirements:**

- `@onmax/nuxt-better-auth`: `^0.0.2-alpha.12` (alpha)
- `better-auth`: `^1.0.0` (module tested with `1.4.7`)
- `@nuxthub/core`: `^0.10.0` (optional, for database)

## Module Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@onmax/nuxt-better-auth'],
  auth: {
    serverConfig: 'server/auth.config',  // default
    clientConfig: 'app/auth.config',     // default
    clientOnly: false,                   // true for external auth backend
    redirects: {
      login: '/login',  // redirect when auth required
      guest: '/'        // redirect when already logged in
    }
  }
})
```

## Environment Variables

```bash
# Required (min 32 chars)
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters

# Required in production for OAuth
NUXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Server Config

```ts
// server/auth.config.ts
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

// Object syntax (simplest)
export default defineServerAuth({
  emailAndPassword: { enabled: true },
  // OAuth providers
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string
    }
  },
})

// Or function syntax (access context like runtimeConfig, db)
export default defineServerAuth(({ runtimeConfig, db }) => ({
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: runtimeConfig.github.clientId,
      clientSecret: runtimeConfig.github.clientSecret
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,      // 7 days (default)
    updateAge: 60 * 60 * 24,           // Update every 24h (default)
    freshAge: 60 * 60 * 24,            // Consider fresh for 24h (default, 0 to disable)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5                   // 5 minutes cookie cache
    }
  }
}))
```

Context available in `defineServerAuth`:

- `runtimeConfig` - Nuxt runtime config
- `db` - Database adapter (when NuxtHub enabled)

### Session Options

| Option                  | Default            | Description                                   |
| ----------------------- | ------------------ | --------------------------------------------- |
| `expiresIn`             | `604800` (7 days)  | Session lifetime in seconds                   |
| `updateAge`             | `86400` (24 hours) | How often to refresh session expiry           |
| `freshAge`              | `86400` (24 hours) | Session considered "fresh" period (0 = never) |
| `cookieCache.enabled`   | `false`            | Enable cookie caching to reduce DB queries    |
| `cookieCache.maxAge`    | `300` (5 minutes)  | Cookie cache lifetime                         |
| `disableSessionRefresh` | `false`            | Disable automatic session refresh             |

## Client Config

```ts
// app/auth.config.ts
import { defineClientAuth } from '@onmax/nuxt-better-auth/config'

// Object syntax (simplest)
export default defineClientAuth({
  // Client-side plugin options (e.g., passkey, twoFactor)
})

// Or function syntax (access context like siteUrl)
export default defineClientAuth(({ siteUrl }) => ({
  // siteUrl contains the resolved base URL
}))
```

## NuxtHub Integration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
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
