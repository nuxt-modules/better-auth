import { defineStore } from 'pinia'

export const useFullAuthStore = defineStore('full-auth', () => {
  return useUserSession()
})
