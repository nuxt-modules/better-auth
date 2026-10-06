import { defineClientAuth } from '@nuxtjs/better-auth/config'

export default defineClientAuth({
  baseURL: 'http://127.0.0.1:4000',
  basePath: '/auth',
})
