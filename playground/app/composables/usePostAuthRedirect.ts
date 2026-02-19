export function usePostAuthRedirect() {
  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()

  const redirectQueryKey = computed(() => {
    const authConfig = runtimeConfig.public.auth as { redirectQueryKey?: string } | undefined
    return authConfig?.redirectQueryKey ?? 'redirect'
  })

  function resolvePostAuthRedirect(fallback = '/app') {
    const rawValue = route.query[redirectQueryKey.value]
    const redirect = Array.isArray(rawValue) ? rawValue[0] : rawValue

    if (typeof redirect !== 'string')
      return fallback
    if (!redirect.startsWith('/') || redirect.startsWith('//'))
      return fallback

    return redirect
  }

  return {
    resolvePostAuthRedirect,
  }
}
