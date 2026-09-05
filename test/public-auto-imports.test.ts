import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/public-auto-imports', import.meta.url))

describe('public auto-imports', () => {
  it.each([false, true])('generates only public helpers with clientOnly=%s', (clientOnly) => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      encoding: 'utf8',
      env: { ...process.env, TEST_CLIENT_ONLY: String(clientOnly) },
      timeout: 120_000,
    })
    expect(prepare.status, `${prepare.error || ''}\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const appImports = readFileSync(`${fixtureDir}/.nuxt/imports.d.ts`, 'utf8')
    const serverImports = readFileSync(`${fixtureDir}/.nuxt/types/nitro-imports.d.ts`, 'utf8')
    for (const name of ['runWithSessionRefresh', 'useAction', 'useAuthAsyncData', 'useAuthClient', 'useAuthClientAction', 'useAuthRequestFetch', 'useSignIn', 'useSignOut', 'useSignUp', 'useUserSession', 'useUserSessionState', 'SignOutOptions', 'UseUserSessionReturn', 'UseUserSessionStateReturn', 'UseAuthAsyncDataOptions'])
      expect(appImports).toMatch(new RegExp(`export (?:type )?\\{[^}]*\\b${name}\\b[^}]*\\}`))
    for (const name of ['serverAuth', 'defineServerAuth', 'getRequestSession', 'getUserSession', 'setRequestSession', 'refreshSessionCookieCache', 'setSessionCookie', 'createSession', 'requireUserSession'])
      expect(new RegExp(`export (?:type )?\\{[^}]*\\b${name}\\b[^}]*\\}`).test(serverImports)).toBe(!clientOnly)
    for (const name of ['getAuthRuntimeFlags', 'useRawAuthClient', 'useAuthActionNamespaces', 'matchesUser', 'resolveCustomSecondaryStorageRequirement', 'HubSecondaryStorageMode']) {
      expect(appImports).not.toMatch(new RegExp(`\\b${name}\\b`))
      expect(serverImports).not.toMatch(new RegExp(`\\b${name}\\b`))
    }
  }, 150_000)
})
