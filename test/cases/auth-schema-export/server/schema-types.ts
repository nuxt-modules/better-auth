import type { account, challenges, identitys, loginSessions, persons, schema, session, user, verification } from '#auth/schema'

type IsAny<T> = 0 extends (1 & T) ? true : false
type Assert<T extends true> = T

export type SchemaAssertions = [
  Assert<IsAny<typeof user> extends false ? true : false>,
  Assert<IsAny<typeof session> extends false ? true : false>,
  Assert<IsAny<typeof account> extends false ? true : false>,
  Assert<IsAny<typeof verification> extends false ? true : false>,
  Assert<IsAny<typeof schema.user> extends false ? true : false>,
  Assert<IsAny<typeof persons> extends false ? true : false>,
  Assert<typeof user extends typeof persons ? true : false>,
  Assert<typeof session extends typeof loginSessions ? true : false>,
  Assert<typeof account extends typeof identitys ? true : false>,
  Assert<typeof verification extends typeof challenges ? true : false>,
  Assert<typeof schema.user extends typeof user ? true : false>,
  Assert<typeof user.$inferSelect.id extends string ? true : false>,
  Assert<typeof user.$inferSelect.email extends string ? true : false>,
]

// @ts-expect-error Generated columns must reject unknown fields.
export type UnknownColumn = typeof user.nonexistentColumn
