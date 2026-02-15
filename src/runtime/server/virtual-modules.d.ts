declare module '#auth/database' {
  export const db: any
  export function createDatabase(...args: any[]): any
}

declare module '#auth/secondary-storage' {
  export function createSecondaryStorage(...args: any[]): any
}

declare module '#auth/schema' {
  export const schema: any
}

declare module '#auth/server' {
  const createServerAuth: any
  export default createServerAuth
}

declare module '@nuxthub/db' {
  export const db: any
  export const schema: any
}
