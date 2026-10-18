<script setup lang="ts">
import type { AuthUser } from '#nuxt-better-auth'

declare const user: AuthUser

const role: string | null | undefined = user.role
const banned: boolean | null | undefined = user.banned

void role
void banned
</script>

<template>
  <div>layered admin types</div>
</template>
