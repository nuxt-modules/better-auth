const promiseProbeKeys = new Set<PropertyKey>(['then', 'catch', 'finally'])

export function isAuthProxyProbeKey(prop: PropertyKey): boolean {
  return typeof prop !== 'string' || promiseProbeKeys.has(prop) || prop.startsWith('__v')
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

export function createVueSafeAuthProxy<T>(target: T): T {
  if (!isObjectLike(target))
    return target

  const cache = new WeakMap<object, unknown>()

  const wrap = <V>(value: V): V => {
    if (!isObjectLike(value))
      return value

    const cached = cache.get(value)
    if (cached)
      return cached as V

    const propertyCache = new Map<PropertyKey, unknown>()
    const handler: ProxyHandler<object> = {
      get(target, prop, receiver) {
        if (isAuthProxyProbeKey(prop))
          return undefined
        if (propertyCache.has(prop))
          return propertyCache.get(prop)
        const wrapped = wrap(Reflect.get(target, prop, receiver))
        propertyCache.set(prop, wrapped)
        return wrapped
      },
    }

    if (typeof value === 'function') {
      handler.apply = (target, thisArg, args) => Reflect.apply(target as (...args: unknown[]) => unknown, thisArg, args)
    }

    const proxy = new Proxy(value, handler)
    cache.set(value, proxy)
    return proxy as V
  }

  const createRootFacade = <V>(value: V): V => {
    if (!isObjectLike(value))
      return value

    const propertyCache = new Map<PropertyKey, unknown>()
    const facadeTarget = {}
    Object.defineProperty(facadeTarget, '__v_skip', {
      value: true,
      configurable: true,
    })

    const proxy = new Proxy(facadeTarget, {
      get(_target, prop, receiver) {
        if (prop === '__v_skip')
          return true
        if (isAuthProxyProbeKey(prop))
          return undefined
        if (propertyCache.has(prop))
          return propertyCache.get(prop)
        const wrapped = wrap(Reflect.get(value, prop, receiver))
        propertyCache.set(prop, wrapped)
        return wrapped
      },
    })
    cache.set(value, proxy)
    return proxy as V
  }

  return createRootFacade(target)
}
