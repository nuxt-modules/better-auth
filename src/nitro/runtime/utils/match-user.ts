import type { UserMatch } from '../types'

export function matchesUser<T extends object>(user: T, match: UserMatch<T>): boolean {
  for (const [key, expected] of Object.entries(match)) {
    const actual = (user as Record<string, unknown>)[key]
    if (Array.isArray(expected)) {
      if (!expected.includes(actual as never))
        return false
    }
    else {
      if (actual !== expected)
        return false
    }
  }
  return true
}
