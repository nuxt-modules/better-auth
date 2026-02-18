# Changelog

This changelog is incomplete for alpha releases. Use the GitHub Releases page for full history.

## Next alpha

### Breaking Changes

- Removed `errorMessage` from `useUserSignIn()` and `useUserSignUp()` action handles. Use `error.value?.message`.

  Migration:

  ```ts
  // before
  const message = errorMessage.value ?? 'Please try again.'

  // after
  const message = error.value?.message ?? 'Please try again.'
  ```

### Fixed

- Restored `auth.redirects` as global redirect fallbacks (route-level `redirectTo` still takes precedence).

## 0.0.2-alpha.0

### Fixed

- Fixed hardcoded paths in published package (0.0.1 was published with stub build)
