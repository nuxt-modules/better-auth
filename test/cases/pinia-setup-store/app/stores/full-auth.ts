import { defineStore } from 'pinia'

export const useFullAuthStore = defineStore('full-auth', () => {
  const { client: authClient, ...auth } = useUserSession()

  return { authClient, ...auth }
})
