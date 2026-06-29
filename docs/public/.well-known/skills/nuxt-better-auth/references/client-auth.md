# Client-side authentication

## Primary entry points

```ts
const { user, session, loggedIn, ready, fetchSession, signOut, updateUser } = useUserSession()
const client = useAuthClient()
```

`useUserSession()` is the store-safe session API. It returns auth state plus session lifecycle actions. It does not expose raw Better Auth client namespaces.

Use `useAuthClient()` when you need direct Better Auth client/plugin methods. It returns the client in the browser and `null` during SSR.

## Sign-in and sign-up forms

Use action composables for form flows that need loading, error, and success state.

```ts
const signInEmail = useSignIn('email')

await signInEmail.execute({
  email: 'user@example.com',
  password: 'password123',
})
```

```ts
const signUpEmail = useSignUp('email')
await signUpEmail.execute({ email, password, name })
```

If no `onSuccess` callback is passed, sign-in and sign-up can redirect to a safe local `?redirect=...` target or the configured authenticated redirect.

## Plugin client actions

Use `useAuthClientAction()` for Better Auth client/plugin methods that should expose action state.

```ts
const openPortal = useAuthClientAction(client => client.customer.portal)
await openPortal.execute()
```

## Custom auth endpoints

Use `runWithSessionRefresh()` around custom endpoints that create or change the current session.

```ts
await runWithSessionRefresh(() =>
  $fetch('/api/custom-login', {
    method: 'POST',
    body: { email, password },
  }),
)
```

The helper awaits your request, then refreshes local session state unless the result is a Better Auth action error result.

## Force refresh

```ts
await fetchSession({ force: true })
```

Use `force: true` when the server-side session payload changed and Better Auth's cookie cache should be bypassed for this fetch.

## Redirect rule

If you read `route.query.redirect`, validate it before navigating. Only allow local paths.

## BetterAuthState

`<BetterAuthState>` renders once session hydration completes (`ready === true`) and supports a loading placeholder.

```vue
<BetterAuthState>
  <template #default="{ loggedIn, user, signOut }">
    <p v-if="loggedIn">Hi {{ user?.name }}</p>
    <button v-else @click="navigateTo('/login')">Sign in</button>
  </template>
  <template #placeholder>
    <p>Loading...</p>
  </template>
</BetterAuthState>
```
