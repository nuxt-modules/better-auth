declare module '#imports' {
  export function useRequestFetch(): import('nitropack/types').H3Event$Fetch | typeof global.$fetch
}
