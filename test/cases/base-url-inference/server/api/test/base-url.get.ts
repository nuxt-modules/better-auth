export default defineEventHandler((event) => {
  const auth = serverAuth(event) as { options?: { appName?: string, baseURL?: string } }
  return { appName: auth.options?.appName, baseURL: auth.options?.baseURL }
})
