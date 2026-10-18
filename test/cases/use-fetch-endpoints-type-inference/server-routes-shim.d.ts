// Nuxt 4.6 reads route types from `#build/server-routes`. This fixture checks the module's
// declarations without the generated route table, so it selects Nuxt's InternalApi engine.
type AnyHTTPMethod = string

export type Path = string
export type ValidInput<_Path, _Method extends AnyHTTPMethod = 'GET'> = string
export type Response<_Path, _Method extends AnyHTTPMethod = 'GET'> = unknown
export type Methods<_Path> = string
export type ResponseHeaders<_Path, _Method extends AnyHTTPMethod = 'GET'> = Headers
export type ErrorBody<_Path, _Method extends AnyHTTPMethod = 'GET'> = unknown
export type RequestBody<_Path, _Method extends AnyHTTPMethod = 'GET', Fallback = BodyInit | null> = Fallback
export type RequestQuery<_Path, _Method extends AnyHTTPMethod = 'GET', Fallback = Record<string, unknown>> = Fallback
export type RequestHeaders<_Path, _Method extends AnyHTTPMethod = 'GET', Fallback = HeadersInit> = Fallback
export type Requires<_Path, _Method extends AnyHTTPMethod, _Field extends 'body' | 'query' | 'headers'> = false
export type StrictFetchPaths = false
export type RouteTypesEngine = 'internal-api'
