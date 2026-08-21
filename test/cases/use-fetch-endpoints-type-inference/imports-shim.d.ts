declare module '#imports' {
  export function useRequestEvent(): object | undefined
  export function useRequestFetch(): import('nitropack/types').H3Event$Fetch | typeof global.$fetch
  export function useRequestHeaders(include?: string[]): Record<string, string>
  export function useRequestURL(): URL
  export function useRuntimeConfig(): { public: { auth?: { clientOnly?: boolean } } }
}
