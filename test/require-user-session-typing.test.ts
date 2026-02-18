import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

describe('requireUserSession typing regression #130', () => {
  it('uses augmented AuthUser/AuthSession types for return value and options', async () => {
    const testDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-session-types-'))
    try {
      const runtimeDir = join(testDir, 'runtime')
      const serverUtilsDir = join(runtimeDir, 'server', 'utils')
      const runtimeUtilsDir = join(runtimeDir, 'utils')

      mkdirSync(serverUtilsDir, { recursive: true })
      mkdirSync(runtimeUtilsDir, { recursive: true })

      copyFileSync(join(import.meta.dirname, '../src/runtime/server/utils/session.ts'), join(serverUtilsDir, 'session.ts'))

      writeFileSync(join(serverUtilsDir, 'auth.ts'), `export function serverAuth(_event?: unknown) {
  return {
    api: {
      getSession: async (_ctx: unknown) => null,
    },
  }
}
`)

      writeFileSync(join(runtimeUtilsDir, 'match-user.ts'), `export function matchesUser(_user: unknown, _match: unknown): boolean {
  return true
}
`)

      writeFileSync(join(runtimeDir, 'types.ts'), `export interface AuthUser {
  id: string
  email?: string
}

export interface AuthSession {
  id: string
}

export type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] }
`)

      writeFileSync(join(testDir, 'augment.d.ts'), `declare module '#nuxt-better-auth' {
  interface AuthUser {
    id: string
    email?: string
    address?: string
  }

  interface AuthSession {
    id: string
  }

  type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] }

  interface AppSession {
    user: AuthUser
    session: AuthSession
  }

  interface RequireSessionOptions {
    user?: UserMatch<AuthUser>
    rule?: (ctx: { user: AuthUser, session: AuthSession }) => boolean | Promise<boolean>
  }
}
`)

      writeFileSync(join(testDir, 'h3.d.ts'), `declare module 'h3' {
  export interface H3Event {
    headers: Headers
  }

  export function createError(input: { statusCode: number, statusMessage: string }): Error
}
`)

      writeFileSync(join(testDir, 'check.ts'), `import type { H3Event } from 'h3'
import { requireUserSession } from './runtime/server/utils/session'

export async function check(event: H3Event) {
  const session = await requireUserSession(event, {
    user: { address: 'NQ12...' },
    rule: ({ user }) => Boolean(user.address),
  })

  return session.user.address
}
`)

      const tsconfigPath = join(testDir, 'tsconfig.json')
      writeFileSync(tsconfigPath, `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": [],
    "paths": {
      "h3": ["./h3.d.ts"],
      "#nuxt-better-auth": ["./augment.d.ts"]
    }
  },
  "files": [
    "./runtime/server/utils/session.ts",
    "./runtime/server/utils/auth.ts",
    "./runtime/utils/match-user.ts",
    "./runtime/types.ts",
    "./augment.d.ts",
    "./check.ts"
  ]
}
`)

      const typecheck = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', tsconfigPath], {
        cwd: import.meta.dirname,
        encoding: 'utf8',
      })

      expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  }, 30_000)
})
