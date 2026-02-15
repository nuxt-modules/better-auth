<template>
  <div>
    <h1>Home</h1>
    <BetterAuthState>
      <template #default="{ loggedIn, user }">
        <p v-if="loggedIn">
          Welcome, {{ user?.name }}
        </p>
        <p v-else>
          Not logged in
        </p>
      </template>
      <template #placeholder>
        <p>Loading auth...</p>
      </template>
    </BetterAuthState>
  </div>
</template>
