export type QueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | readonly boolean[];

export type QueryParams = Record<string, QueryValue | undefined>;

export type RequestFn = <T>(path: string, params?: QueryParams, signal?: AbortSignal) => Promise<T>;

export type BodyRequestFn = <T>(path: string, body?: unknown, signal?: AbortSignal) => Promise<T>;

export type EmptyBodyRequestFn = <T>(path: string, signal?: AbortSignal) => Promise<T>;
