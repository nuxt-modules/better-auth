export type HubSecondaryStorageMode = boolean | 'custom' | undefined

export function resolveCustomSecondaryStorageRequirement(
  hubSecondaryStorage: HubSecondaryStorageMode,
  userHasSecondaryStorage: boolean,
  isDev: boolean,
): { shouldThrow: boolean, shouldWarn: boolean, message: string } | null {
  if (hubSecondaryStorage !== 'custom')
    return null

  if (userHasSecondaryStorage)
    return null

  const message = '[nuxt-better-auth] hubSecondaryStorage: "custom" requires secondaryStorage in defineServerAuth().'
  return { shouldThrow: !isDev, shouldWarn: isDev, message }
}
