export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b))
    return true
  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  if (Array.isArray(a) || Array.isArray(b))
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => isSameValue(item, b[index]))
  if (!isRecord(a) || !isRecord(b))
    return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && isSameValue(a[key], b[key]))
}

/**
 * Better Auth refetches the session on window focus and returns fresh objects even
 * when nothing changed. Keeping the current object avoids retriggering every
 * computed and watcher that depends on the session or user.
 */
export function setIfChanged<T>(target: { value: T }, value: T) {
  if (!isSameValue(target.value, value))
    target.value = value
}
