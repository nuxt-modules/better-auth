import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const fixtureDir = resolve(process.argv[2] || '')
const port = '43175'
const baseURL = `http://127.0.0.1:${port}`

const cookies = new Map()

async function request(path, { body, ip = '192.0.2.123' } = {}, status = 200) {
  const response = await fetch(`${baseURL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'origin': baseURL,
      'x-forwarded-for': ip,
      'cookie': [...cookies.values()].join('; '),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  for (const value of response.headers.getSetCookie()) {
    const cookie = value.split(';')[0]
    const name = cookie.slice(0, cookie.indexOf('='))
    if (/max-age=0(?:;|$)/i.test(value))
      cookies.delete(name)
    else
      cookies.set(name, cookie)
  }
  assert.equal(response.status, status, `${path}: ${response.status}`)
  return response.json()
}

async function checkAuthLifecycle() {
  const email = `compatibility-${Date.now()}@example.com`
  const password = 'Compatibility-test-password-123!'

  await request('/api/private', {}, 401)
  await request('/api/auth/sign-up/email', {
    body: { name: 'Compatibility user', email, password, preferredLocale: 'en' },
  })
  let session = await request('/api/auth/get-session')
  assert.equal(session.user.email, email)
  assert.equal(session.user.preferredLocale, 'en')
  assert.equal((await request('/api/private')).email, email)

  await request('/api/auth/sign-out', { body: {} })
  assert.equal(await request('/api/auth/get-session'), null)
  await request('/api/auth/sign-in/email', { body: { email, password } })
  session = await request('/api/auth/get-session?disableCookieCache=true', { ip: '2001:db8::1' })
  assert.equal(session.user.email, email)
  assert.equal(session.user.preferredLocale, 'en')
  assert.equal((await request('/api/private')).email, email)
  await request('/api/auth/sign-out', { body: {} })
  assert.equal(await request('/api/auth/get-session'), null)
  await request('/api/private', {}, 401)
  assert.equal((await request('/api/guest')).guest, true)
}

async function main() {
  let output = ''
  const server = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: fixtureDir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
      NUXT_PUBLIC_SITE_URL: baseURL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  server.stdout.on('data', chunk => output += String(chunk))
  server.stderr.on('data', chunk => output += String(chunk))

  try {
    const timeoutAt = Date.now() + 20_000
    let response

    while (Date.now() < timeoutAt) {
      if (server.exitCode !== null)
        break

      try {
        response = await fetch(`${baseURL}/api/auth/ok`, {
          headers: { 'x-forwarded-for': '192.0.2.123' },
          signal: AbortSignal.timeout(2_000),
        })
        if (response.ok)
          break
      }
      catch {}

      await new Promise(resolve => setTimeout(resolve, 250))
    }

    assert.ok(response?.ok, 'Compatibility server did not respond successfully')
    assert.equal((await response.json()).ok, true)
    assert.equal((await request('/api/guest')).guest, true)

    if (process.env.COMPATIBILITY_DATABASE === 'true') {
      await checkAuthLifecycle()
      process.stdout.write('Packed consumer signup, sign-in, session, protected route, and logout passed.\n')
    }
    else {
      process.stdout.write('Packed consumer auth and guest route smoke checks passed.\n')
    }
  }
  catch (error) {
    throw new Error(`Compatibility auth flow failed.\n${output}`, { cause: error })
  }
  finally {
    server.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
