export function usePlaygroundSignOut() {
  const signOutPending = useState('playground:sign-out-pending', () => false)
  const { signOut } = useUserSession()

  async function executeSignOut() {
    if (signOutPending.value)
      return

    signOutPending.value = true

    try {
      await signOut({
        onSuccess: async () => {
          await navigateTo('/login')
        },
      })
    }
    finally {
      signOutPending.value = false
    }
  }

  return {
    signOutPending,
    signOut: executeSignOut,
  }
}
