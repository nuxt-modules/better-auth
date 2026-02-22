import { describe, expect, it } from 'vitest'
import { resolveAuthErrorMessage } from '../src/runtime/utils/resolve-auth-error-message'

describe('resolveAuthErrorMessage', () => {
  it('returns normalized message for explicit error messages', () => {
    const message = resolveAuthErrorMessage(new Error('boom'))
    expect(message).toBe('boom')
  })

  it('uses fallback for unknown errors', () => {
    const message = resolveAuthErrorMessage({})
    expect(message).toBe('Please try again.')
  })

  it('uses custom fallback for unknown errors', () => {
    const message = resolveAuthErrorMessage({}, { fallback: 'Retry later.' })
    expect(message).toBe('Retry later.')
  })

  it('prefers translate callback result when provided', () => {
    const message = resolveAuthErrorMessage(
      { message: 'Invalid password', code: 'INVALID_PASSWORD', status: 401, raw: null },
      {
        translate: ({ code }) => (code === 'INVALID_PASSWORD' ? 'Wrong password.' : undefined),
      },
    )

    expect(message).toBe('Wrong password.')
  })

  it('falls back to normalized message when translate callback has no result', () => {
    const message = resolveAuthErrorMessage(
      { message: 'Invalid password', code: 'INVALID_PASSWORD', status: 401, raw: null },
      {
        translate: () => undefined,
      },
    )

    expect(message).toBe('Invalid password')
  })
})
