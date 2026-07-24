import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const fixtureDir = resolve(process.argv[2] || '')
const port = '43175'

async function main() {
  let output = ''
  const server = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd: fixtureDir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
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
        response = await fetch(`http://127.0.0.1:${port}/api/auth/ok`)
        if (response.ok)
          break
      }
      catch {}

      await new Promise(resolve => setTimeout(resolve, 250))
    }

    if (!response?.ok)
      throw new Error(`Compatibility server did not respond successfully.\n${output}`)

    const body = await response.json()
    if (body?.ok !== true)
      throw new Error(`Unexpected auth response: ${JSON.stringify(body)}`)
  }
  finally {
    server.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
