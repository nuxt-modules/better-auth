declare module '#auth/database' {
  export const db: any
  export function createDatabase(...args: any[]): any
}

declare module '#auth/secondary-storage' {
  export function createSecondaryStorage(...args: any[]): any
}
