export interface BetterAuthNitroOptions {
  /**
   * Path to the Better Auth server config. Relative paths resolve from the Nitro root.
   * Defaults to `server/auth.config`.
   */
  config?: string
}

export interface ResolvedBetterAuthNitroOptions {
  config: string
}

export function normalizeBetterAuthNitroOptions(options?: BetterAuthNitroOptions): ResolvedBetterAuthNitroOptions {
  return {
    config: options?.config || 'server/auth.config',
  }
}
