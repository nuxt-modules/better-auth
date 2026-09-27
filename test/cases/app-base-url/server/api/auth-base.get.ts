export default defineEventHandler(async (event) => {
  const auth = serverAuth(event)
  return (await auth.$context).baseURL
})
