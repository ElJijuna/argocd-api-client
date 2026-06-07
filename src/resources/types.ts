/** Primitive or repeated query-string value accepted by request params. */
export type QueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | readonly boolean[];

/** Query-string parameter object accepted by resource methods. */
export type QueryParams = Record<string, QueryValue | undefined>;

/** @internal */
export type RequestFn = <T>(path: string, params?: QueryParams, signal?: AbortSignal) => Promise<T>;

/** @internal */
export type BodyRequestFn = <T>(path: string, body?: unknown, signal?: AbortSignal) => Promise<T>;

/** @internal */
export type EmptyBodyRequestFn = <T>(path: string, signal?: AbortSignal) => Promise<T>;
