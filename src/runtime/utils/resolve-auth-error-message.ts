import type { AuthActionError } from '../types'
import { DEFAULT_AUTH_ACTION_ERROR_MESSAGE, normalizeAuthActionError } from '../app/internal/auth-action-error'

interface ResolveAuthErrorMessageOptions {
  fallback?: string
  translate?: (ctx: { code?: string, message: string, status?: number }) => string | undefined
}

const DEFAULT_RESOLVE_AUTH_ERROR_MESSAGE = 'Please try again.'

export function resolveAuthErrorMessage(
  error: AuthActionError | unknown,
  options: ResolveAuthErrorMessageOptions = {},
): string {
  const normalized = normalizeAuthActionError(error)
  const translated = options.translate?.({
    code: normalized.code,
    message: normalized.message,
    status: normalized.status,
  })

  if (typeof translated === 'string' && translated.length > 0)
    return translated

  if (normalized.message && normalized.message !== DEFAULT_AUTH_ACTION_ERROR_MESSAGE)
    return normalized.message

  return options.fallback || DEFAULT_RESOLVE_AUTH_ERROR_MESSAGE
}
