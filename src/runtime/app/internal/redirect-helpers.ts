import { navigateTo, useRuntimeConfig } from '#imports'
import { isRecord } from './utils'

export function isSafeLocalRedirect(redirect: unknown): string | undefined {
  if (typeof redirect !== 'string')
    return
  if (!redirect.startsWith('/') || redirect.startsWith('//'))
    return
  return redirect
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
