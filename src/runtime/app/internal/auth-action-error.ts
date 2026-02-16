import type { AuthActionError } from '../../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function getMessage(value: unknown): string {
  if (value instanceof Error)
    return value.message
  if (typeof value === 'string')
    return value
  if (isRecord(value) && typeof value.message === 'string')
    return value.message
  return 'Request failed. Please try again.'
}

function getCode(value: unknown): string | undefined {
  if (!isRecord(value))
    return undefined
  return typeof value.code === 'string' ? value.code : undefined
}

function getStatus(value: unknown): number | undefined {
  if (!isRecord(value))
    return undefined
  if (typeof value.status === 'number')
    return value.status
  if (typeof value.statusCode === 'number')
    return value.statusCode
  return undefined
}

export function normalizeAuthActionError(error: unknown): AuthActionError {
  return {
    message: getMessage(error),
    code: getCode(error),
    status: getStatus(error),
    raw: error,
  }
}
