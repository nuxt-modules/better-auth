<script setup lang="ts">
const { user, session, signOut } = useUserSession()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div>
    <p id="user">
      {{ user?.name }}
    </p>
    <p id="label">
      {{ session?.label }}
    </p>
    <p id="hydrated">
      {{ mounted }}
    </p>
    <button @click="signOut()">
      Sign out
    </button>
  </div>
</template>
