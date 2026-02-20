# Changelog

This changelog is incomplete for alpha releases. Use the GitHub Releases page for full history.

## Next alpha

### Breaking Changes

- Renamed `useUserSignIn()` to `useSignIn()`.
- Renamed `useUserSignUp()` to `useSignUp()`.
- Renamed `getAppSession()` to `getRequestSession()`.
- Renamed memoized request context key from `event.context.appSession` to `event.context.requestSession`.
- Removed `errorMessage` from `useSignIn()` and `useSignUp()` action handles. Use `error.value?.message`.
- Removed OAuth provider aliases such as `useSignIn('github')`. Use `useSignIn('social')` and pass the provider in `execute()`.

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
  await useSignIn('github').execute({ callbackURL: '/app' })

  // after
  await useSignIn('social').execute({ provider: 'github', callbackURL: '/app' })

  // before
  const message = errorMessage.value ?? 'Please try again.'

  // after
  const message = error.value?.message ?? 'Please try again.'
  ```

### Added

- Added strict provider typing for `useSignIn('social').execute()` from configured `socialProviders` keys.
- Added social `callbackURL` auto-fill when omitted: safe `?redirect=` first, then `auth.redirects.authenticated`.

### Fixed

- Restored `auth.redirects` as global redirect fallbacks (route-level `redirectTo` still takes precedence).

## 0.0.2-alpha.0

### Fixed

- Fixed hardcoded paths in published package (0.0.1 was published with stub build)
