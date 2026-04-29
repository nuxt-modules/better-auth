<script lang="ts" setup>
import { useUserSession } from '../composables/useUserSession'

const { loggedIn, user, session, signOut, ready } = useUserSession()
</script>

<template>
  <slot v-if="ready" v-bind="{ loggedIn, user, session, signOut }" />
  <slot v-else name="placeholder" />
</template>
