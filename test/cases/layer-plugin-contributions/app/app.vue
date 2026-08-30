<script setup lang="ts">
import type { AuthUser } from '#nuxt-better-auth'
import { useFetch } from 'nuxt/app'

declare const user: AuthUser

const layerField: string | null | undefined = user.layerField
const client = useAuthClient()
const signInUsername = client?.signIn.username
const { data } = useFetch('/api/auth/layer-proof', { method: 'GET' })
const source: 'layer' | undefined = data.value?.source

void layerField
void signInUsername
void source
</script>

<template>
  <div>layer plugin contributions</div>
</template>
