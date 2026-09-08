import { navigateTo, useRuntimeConfig } from '#imports'
import { isRecord } from './utils'

const ENCODED_PATH_SEPARATOR_RE = /%(?:2f|5c)/gi
const REDIRECT_VALIDATION_ORIGIN = 'https://nuxt-better-auth.invalid'

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1F || code === 0x7F
  })
}

export function isSafeLocalRedirect(redirect: unknown): string | undefined {
  if (typeof redirect !== 'string')
    return
  if (!redirect.startsWith('/') || redirect.startsWith('//'))
    return
  if (redirect.includes('\\') || containsControlCharacter(redirect))
    return

  try {
    const parsed = new URL(redirect, REDIRECT_VALIDATION_ORIGIN)
    if (parsed.origin !== REDIRECT_VALIDATION_ORIGIN || parsed.pathname.startsWith('//'))
      return
    const normalizedPath = parsed.pathname.replace(ENCODED_PATH_SEPARATOR_RE, '/')
    const normalized = new URL(normalizedPath, REDIRECT_VALIDATION_ORIGIN)
    if (normalized.origin !== REDIRECT_VALIDATION_ORIGIN || normalized.pathname.startsWith('//'))
      return
    return redirect
  }
  catch {
    return undefined
  }
}

export function resolvePostAuthRedirect(requestURL: URL): string | undefined {
  const runtimeConfig = useRuntimeConfig()
  const authConfig = runtimeConfig.public.auth as { redirects?: { authenticated?: string }, redirectQueryKey?: string } | undefined
  const redirectQueryKey = authConfig?.redirectQueryKey ?? 'redirect'
  const queryRedirect = requestURL.searchParams?.get(redirectQueryKey)
  const safeQueryRedirect = isSafeLocalRedirect(queryRedirect)
  if (safeQueryRedirect)
    return safeQueryRedirect
  return isSafeLocalRedirect(authConfig?.redirects?.authenticated)
}

export function resolvePostAuthSuccessRedirect(requestURL: URL): (() => Promise<void>) | undefined {
  const target = resolvePostAuthRedirect(requestURL)
  if (!target)
    return
  return async () => {
    await navigateTo(target)
  }
}

export function withFallbackSocialCallbackURL(data: unknown, requestURL: URL): unknown {
  const callbackURL = resolvePostAuthRedirect(requestURL)
  if (!callbackURL)
    return data

  if (!isRecord(data))
    return { callbackURL }
  if (typeof data.callbackURL === 'string')
    return data

  return { ...data, callbackURL }
}
