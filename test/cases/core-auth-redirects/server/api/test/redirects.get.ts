export default defineEventHandler(() => {
  return useRuntimeConfig().public.auth.redirects
})
