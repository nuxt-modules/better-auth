import type { account, schema, session, user, users, verification } from '#auth/schema'

type IsAny<T> = 0 extends (1 & T) ? true : false
type Assert<T extends true> = T

export type SchemaAssertions = [
  Assert<IsAny<typeof user> extends false ? true : false>,
  Assert<IsAny<typeof session> extends false ? true : false>,
  Assert<IsAny<typeof account> extends false ? true : false>,
  Assert<IsAny<typeof verification> extends false ? true : false>,
  Assert<IsAny<typeof schema.user> extends false ? true : false>,
  Assert<IsAny<typeof users> extends false ? true : false>,
  Assert<typeof user extends typeof users ? true : false>,
  Assert<typeof schema.user extends typeof user ? true : false>,
  Assert<typeof user.$inferSelect.id extends string ? true : false>,
  Assert<typeof user.$inferSelect.email extends string ? true : false>,
]

// @ts-expect-error Generated columns must reject unknown fields.
export type UnknownColumn = typeof user.nonexistentColumn
