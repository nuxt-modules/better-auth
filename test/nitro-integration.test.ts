import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const fixtureDir = fileURLToPath(new URL('./fixtures/nitro-basic', import.meta.url))
const env = {
  ...process.env,
  NUXT_BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

let previewProcess: ReturnType<typeof spawn> | undefined
let baseUrl = ''

function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string')
        return reject(new Error('Failed to resolve test port'))

      server.close((error) => {
        if (error)
          reject(error)
        else
          resolve(address.port)
      })
    })
  })
}

async function waitForServer(url: string, output: () => string): Promise<void> {
  const timeoutAt = Date.now() + 20_000
  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(`${url}/api/auth/ok`)
      if (response.ok)
        return
    }
    catch {
      // Server is still starting.
    }

    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Nitro preview server did not start in time.\n${output()}`)
}

beforeAll(async () => {
  const buildPackage = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
    cwd: rootDir,
    env,
    encoding: 'utf8',
  })
  expect(buildPackage.status, `package build failed:\n${buildPackage.stdout}\n${buildPackage.stderr}`).toBe(0)
  expect(existsSync(fileURLToPath(new URL('../dist/nitro.mjs', import.meta.url)))).toBe(true)

  const buildFixture = spawnSync('pnpm', ['exec', 'nitro', 'build', '--dir', fixtureDir], {
    cwd: rootDir,
    env,
    encoding: 'utf8',
  })
  expect(buildFixture.status, `fixture build failed:\n${buildFixture.stdout}\n${buildFixture.stderr}`).toBe(0)

  const port = await findOpenPort()
  baseUrl = `http://127.0.0.1:${port}`

  let output = ''
  previewProcess = spawn('pnpm', ['exec', 'nitro', 'preview', '--dir', fixtureDir, '--port', String(port), '--host', '127.0.0.1'], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  previewProcess.stdout?.on('data', chunk => { output += String(chunk) })
  previewProcess.stderr?.on('data', chunk => { output += String(chunk) })

  await waitForServer(baseUrl, () => output)
}, 120_000)

afterAll(() => {
  previewProcess?.kill('SIGTERM')
})

describe('nitro entry integration', () => {
  it('registers the Better Auth handler', async () => {
    const response = await fetch(`${baseUrl}/api/auth/ok`)
    expect(response.status).toBe(200)
  })

  it('enforces route-rule auth on protected API routes', async () => {
    const response = await fetch(`${baseUrl}/api/test/me`)
    expect(response.status).toBe(401)
  })

  it('allows unauthenticated access to guest routes', async () => {
    const response = await fetch(`${baseUrl}/api/test/guest`)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ guest: true })
  })
})
