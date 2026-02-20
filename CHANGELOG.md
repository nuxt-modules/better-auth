# Changelog

This changelog is incomplete for alpha releases. Use the GitHub Releases page for full history.

## Next alpha

### Breaking Changes

- Renamed `useUserSignIn()` to `useSignIn()`.
- Renamed `useUserSignUp()` to `useSignUp()`.
- Renamed `getAppSession()` to `getRequestSession()`.
- Renamed memoized request context key from `event.context.appSession` to `event.context.requestSession`.
- Removed `errorMessage` from `useSignIn()` and `useSignUp()` action handles. Use `error.value?.message`.
- `useSignIn('social')` is no longer a valid keyed call. Use provider aliases such as `useSignIn('github')`.

  Migration:

  ```ts
  // before
  const signInEmail = useUserSignIn('email')
  const signUpEmail = useUserSignUp('email')
  const appSession = await getAppSession(event)
  const memoized = event.context.appSession

  // after
  const signInEmail = useSignIn('email')
  const signUpEmail = useSignUp('email')
  const requestSession = await getRequestSession(event)
  const memoized = event.context.requestSession

  // before
  const message = errorMessage.value ?? 'Please try again.'

  // after
  const message = error.value?.message ?? 'Please try again.'
  ```

### Added

- Added typed provider aliases for `useSignIn()` based on configured `socialProviders` keys (for example, `useSignIn('github')`).

### Fixed

- Restored `auth.redirects` as global redirect fallbacks (route-level `redirectTo` still takes precedence).

## 0.0.2-alpha.0

### Fixed

- Fixed hardcoded paths in published package (0.0.1 was published with stub build)
