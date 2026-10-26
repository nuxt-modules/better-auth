import type { H3Event } from 'h3'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { readBody, toWebRequest } from '../src/runtime/server/internal/nitro2'

vi.mock('nitropack/runtime', () => ({
  getRouteRules: vi.fn(),
  useRuntimeConfig: vi.fn(),
}))

const headers = { 'host': 'localhost:3000', 'content-type': 'application/json' }
const eventFor = (req: object) => ({ node: { req } }) as unknown as H3Event

// The shape of unenv's mock IncomingMessage, which Nitro uses for in-process
// requests such as `useFetch` during SSR: the body is buffered on `req.body`,
// and reading the request as a stream throws.
function unenvRequest(body: unknown) {
  return {
    method: 'POST',
    url: '/api/auth/admin/list-user-sessions',
    headers,
    body,
    __unenv__: {},
    async* [Symbol.asyncIterator]() {
      throw new Error('[unenv] Readable.asyncIterator is not implemented yet!')
    },
  }
}

describe('nitro2 toWebRequest', () => {
  it('uses the buffered body of in-process requests', async () => {
    const request = toWebRequest(eventFor(unenvRequest('{"userId":"user-1"}')))
    expect(await request.json()).toEqual({ userId: 'user-1' })
  })

  it('serializes an object body', async () => {
    const request = toWebRequest(eventFor(unenvRequest({ userId: 'user-1' })))
    expect(await request.json()).toEqual({ userId: 'user-1' })
  })

  it('sends no body for in-process requests without one', async () => {
    const request = toWebRequest(eventFor(unenvRequest(null)))
    expect(await request.text()).toBe('')
  })

  it('streams the body of real requests', async () => {
    const req = Object.assign(Readable.from([Buffer.from('{"userId":"user-1"}')]), { method: 'POST', url: '/api/auth/sign-in/email', headers })
    const request = toWebRequest(eventFor(req))
    expect(await request.json()).toEqual({ userId: 'user-1' })
  })

  it('uses the body a Nitro middleware already read', async () => {
    const req = Object.assign(Readable.from([Buffer.from('{"userId":"user-1"}')]), { method: 'POST', url: '/api/auth/sign-in/email', headers })
    // What h3 v1's `readBody` leaves behind: the stream is drained and its
    // bytes are kept on this symbol.
    const rawBody = new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks)))
    })
    Object.assign(req, { [Symbol.for('h3RawBody')]: rawBody })
    await rawBody
    const request = toWebRequest(eventFor(req))
    expect(await request.json()).toEqual({ userId: 'user-1' })
  })

  it('reads the body of in-process requests with readBody', async () => {
    expect(await readBody(eventFor(unenvRequest('{"token":"abc"}')))).toEqual({ token: 'abc' })
  })
})
