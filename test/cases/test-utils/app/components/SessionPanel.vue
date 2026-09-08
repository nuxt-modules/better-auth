<script setup lang="ts">
const { user, loggedIn, signOut } = useUserSession()
</script>

<template>
  <div>
    <p>{{ loggedIn ? user?.name : 'Guest' }}</p>
    <button @click="signOut()">
      Sign out
    </button>
  </div>
</template>
