import { defineStore } from 'pinia'

export const useSessionStateStore = defineStore('session-state', () => {
  return useUserSessionState()
})
