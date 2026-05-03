import { defineStore } from 'pinia'

export const useFullAuthStore = defineStore('full-auth', () => {
  const auth = useUserSession()

  return { ...auth }
})
