import { useUserSession } from '../../../../src/runtime/app/composables/useUserSession'

const { updateUser } = useUserSession()
void updateUser({ name: 'Updated', image: null, internalCode: 'writable', username: 'new-name' })
// @ts-expect-error Identity fields are not writable through updateUser.
void updateUser({ id: 'someone-else' })
// @ts-expect-error Email changes have a dedicated Better Auth action.
void updateUser({ email: 'other@example.com' })
// @ts-expect-error Verification is controlled by the server.
void updateUser({ emailVerified: true })
// @ts-expect-error Admin plugin role is output-only for user updates.
void updateUser({ role: 'admin' })
// @ts-expect-error Custom input:false fields cannot be written.
void updateUser({ readOnlyCode: 'overwrite' })
// @ts-expect-error Transport options are not optimistic user fields.
void updateUser({ fetchOptions: {} })
