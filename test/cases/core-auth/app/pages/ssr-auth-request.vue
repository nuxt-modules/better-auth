<script setup lang="ts">
const result = ref('pending')

try {
  const requestFetch = useAuthRequestFetch()
  const response = await requestFetch('/api/auth/test/ssr-origin', {
    method: 'POST',
    headers: new Headers({ 'x-request-shape': 'headers' }),
    body: {},
  })
  result.value = `origin=${response.origin};header=${response.header}`
}
catch (error) {
  const fetchError = error as { data?: { message?: string }, message?: string }
  result.value = `rejected:${fetchError.data?.message ?? fetchError.message ?? 'unknown'}`
}
</script>

<template>
  <p id="ssr-auth-request-result">
    {{ result }}
  </p>
</template>
