const promiseProbeKeys = new Set<PropertyKey>(['then', 'catch', 'finally'])

export function isAuthProxyProbeKey(prop: PropertyKey): boolean {
  return typeof prop !== 'string' || promiseProbeKeys.has(prop) || prop.startsWith('__v')
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isThenable(value: object): boolean {
  try {
    return typeof Reflect.get(value, 'then') === 'function'
  }
  catch {
    return false
  }
}

export function createVueSafeAuthProxy<T>(target: T): T {
  if (!isObjectLike(target))
    return target

  const cache = new WeakMap<object, unknown>()

  const wrap = <V>(value: V): V => {
    if (!isObjectLike(value) || isThenable(value))
      return value

    const cached = cache.get(value)
    if (cached)
      return cached as V

    const handler: ProxyHandler<object> = {
      get(target, prop, receiver) {
        if (isAuthProxyProbeKey(prop))
          return undefined
        return wrap(Reflect.get(target, prop, receiver))
      },
    }

    if (typeof value === 'function') {
      handler.apply = (target, thisArg, args) => Reflect.apply(target as (...args: unknown[]) => unknown, thisArg, args)
    }

    const proxy = new Proxy(value, handler)
    cache.set(value, proxy)
    return proxy as V
  }

  return wrap(target)
}
