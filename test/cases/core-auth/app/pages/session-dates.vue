<script setup lang="ts">
const { user, session, fetchSession } = useUserSession()
const initialDates = user.value?.createdAt instanceof Date && session.value?.expiresAt instanceof Date
await fetchSession()
const refreshedDates = user.value?.createdAt instanceof Date && session.value?.expiresAt instanceof Date
</script>

<template>
  <p>Initial dates: {{ initialDates }}; refreshed dates: {{ refreshedDates }}</p>
</template>
