<script setup lang="ts">
import { useFullAuthStore } from '../stores/full-auth'
import { useSessionStateStore } from '../stores/session-state'

const fullAuth = useFullAuthStore()
const sessionState = useSessionStateStore()
</script>

<template>
  <main>
    <h1>Pinia Auth Store</h1>
    <p data-testid="full-ready">
      Full ready: {{ fullAuth.ready }}
    </p>
    <p data-testid="state-ready">
      State ready: {{ sessionState.ready }}
    </p>
    <p data-testid="full-actions">
      Full actions: {{ typeof fullAuth.signOut }}
    </p>
    <p data-testid="client-type">
      Client type: {{ typeof fullAuth.authClient }}
    </p>
    <p data-testid="verification-type">
      Verification type: {{ typeof fullAuth.authClient?.sendVerificationEmail }}
    </p>
  </main>
</template>
