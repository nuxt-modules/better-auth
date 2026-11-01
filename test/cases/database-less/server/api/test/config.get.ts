export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig()
  const auth = runtimeConfig.public.auth as { useDatabase?: boolean, databaseProvider?: string } | undefined

  return {
    useDatabase: auth?.useDatabase,
    databaseProvider: auth?.databaseProvider,
  }
})
