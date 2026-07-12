import type { ArgoCdSession, ArgoCdSessionRequest, ArgoCdUserInfo } from './domain/session';
import { ArgoCdApiError } from './errors/ArgoCdApiError';
import { AccountResource } from './resources/AccountResource';
import { ApplicationResource } from './resources/ApplicationResource';
import { ApplicationSetResource } from './resources/ApplicationSetResource';
import { CertificateResource } from './resources/CertificateResource';
import { ClusterResource } from './resources/ClusterResource';
import { GpgKeyResource } from './resources/GpgKeyResource';
import { ProjectResource } from './resources/ProjectResource';
import { RepoCredsResource } from './resources/RepoCredsResource';
import { RepositoryResource } from './resources/RepositoryResource';
import { SettingsResource } from './resources/SettingsResource';
import { VersionResource } from './resources/VersionResource';
import type { QueryParams, QueryValue } from './resources/types';

export interface RequestEvent {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  statusCode?: number;
  error?: Error;
}

export interface ArgoCdClientEvents {
  request: (event: RequestEvent) => void;
}

export interface ArgoCdClientOptions {
  /** Base URL of the Argo CD server, without `/api/v1`. */
  baseUrl: string;
  /** Argo CD JWT sent as `Authorization: Bearer <jwt>` for authenticated endpoints. */
  token?: string;
  /** Fetch-compatible transport. Defaults to the runtime's global `fetch`. */
  fetch?: typeof globalThis.fetch;
}

export interface ArgoCdCredentialsOptions {
  /** Base URL of the Argo CD server, without `/api/v1`. */
  baseUrl: string;
  /** Argo CD username. */
  username: string;
  /** Argo CD password. */
  password: string;
  /** Optional AbortSignal for the initial login request. */
  signal?: AbortSignal;
  /** Fetch-compatible transport. Defaults to the runtime's global `fetch`. */
  fetch?: typeof globalThis.fetch;
}

interface StoredCredentials {
  username: string;
  password: string;
}

/**
 * Main entry point for the Argo CD REST API client.
 *
 * @example
 * ```typescript
 * const argocd = new ArgoCdClient({
 *   baseUrl: 'https://argocd.example.com',
 *   token: process.env.ARGOCD_TOKEN,
 * });
 *
 * const apps = await argocd.applications.list({ project: ['default'] });
 * ```
 */
export class ArgoCdClient {
  /** Application API resource. */
  readonly applications: ApplicationResource;
  /** ApplicationSet API resource. */
  readonly applicationSets: ApplicationSetResource;
  /** Project API resource. */
  readonly projects: ProjectResource;
  /** Repository API resource. */
  readonly repositories: RepositoryResource;
  /** Repository credential templates API resource. */
  readonly repoCreds: RepoCredsResource;
  /** Cluster API resource. */
  readonly clusters: ClusterResource;
  /** Account API resource. */
  readonly accounts: AccountResource;
  /** Repository TLS/SSH certificate API resource. */
  readonly certificates: CertificateResource;
  /** GPG public key API resource. */
  readonly gpgKeys: GpgKeyResource;
  /** Server settings API resource. */
  readonly settings: SettingsResource;
  /** Server version API resource. */
  readonly version: VersionResource;
  private readonly baseUrl: string;
  private token?: string;
  private credentials?: StoredCredentials;
  private readonly fetch: typeof globalThis.fetch;
  private refreshPromise?: Promise<void>;
  private readonly publicHeaders = { Accept: 'application/json' };
  private readonly postHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };
  private readonly listeners: Map<
    keyof ArgoCdClientEvents,
    ArgoCdClientEvents[keyof ArgoCdClientEvents][]
  > = new Map();

  constructor(options: ArgoCdClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.fetch = options.fetch ?? globalThis.fetch;
    const request = <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
      this.request<T>(path, params, signal);
    const post = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      this.bodyRequest<T>('POST', path, body, signal);
    const put = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      this.bodyRequest<T>('PUT', path, body, signal);
    const patch = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      this.bodyRequest<T>('PATCH', path, body, signal);
    const del = <T>(path: string, signal?: AbortSignal) =>
      this.emptyRequest<T>('DELETE', path, signal);
    const ndJson = <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
      this.ndJsonRequest<T>(path, params, signal);

    this.applications = new ApplicationResource(request, post, del, patch, put, ndJson);
    this.applicationSets = new ApplicationSetResource(request, post, put, del);
    this.projects = new ProjectResource(request, post, put, del);
    this.repositories = new RepositoryResource(request, post, del);
    this.repoCreds = new RepoCredsResource(request, post, del);
    this.clusters = new ClusterResource(request, post, del, put);
    this.accounts = new AccountResource(request, post, put, del);
    this.certificates = new CertificateResource(request, post, del);
    this.gpgKeys = new GpgKeyResource(request, post, del);
    this.settings = new SettingsResource(request);
    this.version = new VersionResource(request);
  }

  on<K extends keyof ArgoCdClientEvents>(event: K, callback: ArgoCdClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];

    callbacks.push(callback);
    this.listeners.set(event, callbacks);

    return this;
  }

  private emit<K extends keyof ArgoCdClientEvents>(
    event: K,
    payload: Parameters<ArgoCdClientEvents[K]>[0],
  ): void {
    const callbacks = this.listeners.get(event) ?? [];

    for (const cb of callbacks) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  /**
   * Creates an authenticated client by exchanging credentials for a session token.
   * Stores the credentials internally so the client can auto-refresh on 401 responses.
   */
  static async fromCredentials(options: ArgoCdCredentialsOptions): Promise<ArgoCdClient> {
    const { baseUrl, username, password, signal, fetch } = options;
    const client = new ArgoCdClient({ baseUrl, fetch });
    const { token } = await client.createSession({ username, password }, signal);

    client.token = token;
    client.credentials = { username, password };

    return client;
  }

  /**
   * Fetches a new session token using the stored credentials and updates the client.
   * Throws if the client was not created with `fromCredentials`.
   */
  async refreshSession(signal?: AbortSignal): Promise<void> {
    if (!this.credentials) {
      throw new Error(
        'No credentials stored — use ArgoCdClient.fromCredentials() to enable session refresh.',
      );
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.performSessionRefresh(signal).finally(() => {
        this.refreshPromise = undefined;
      });
    }

    return this.refreshPromise;
  }

  private async performSessionRefresh(signal?: AbortSignal): Promise<void> {
    this.token = undefined;
    const { token } = await this.bodyRequest<ArgoCdSession>(
      'POST',
      '/api/v1/session',
      this.credentials,
      signal,
      false,
    );

    this.token = token;
  }

  /**
   * Creates an Argo CD session from username/password credentials.
   *
   * `POST /api/v1/session`
   */
  async createSession(body: ArgoCdSessionRequest, signal?: AbortSignal): Promise<ArgoCdSession> {
    return this.bodyRequest<ArgoCdSession>('POST', '/api/v1/session', body, signal, false);
  }

  /**
   * Invalidates the current session token on the Argo CD server (logout).
   * Does not clear the token stored in this client instance.
   *
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns Empty object on success.
   *
   * @example
   * await argocd.deleteSession();
   */
  async deleteSession(signal?: AbortSignal): Promise<Record<string, never>> {
    return this.emptyRequest<Record<string, never>>('DELETE', '/api/v1/session', signal);
  }

  /**
   * Returns info about the currently authenticated user.
   *
   * `GET /api/v1/session/userinfo`
   *
   * @param signal - Optional `AbortSignal` to cancel the request.
   * @returns `{ loggedIn, username, iss, groups }`.
   *
   * @example
   * const info = await argocd.userInfo();
   * console.log(info.username, info.groups);
   */
  async userInfo(signal?: AbortSignal): Promise<ArgoCdUserInfo> {
    return this.request<ArgoCdUserInfo>('/api/v1/session/userinfo', {}, signal);
  }

  private authHeaders(includeContentType?: boolean) {
    const base = includeContentType ? this.postHeaders : this.publicHeaders;

    return this.token ? { ...base, Authorization: `Bearer ${this.token}` } : { ...base };
  }

  private async ndJsonRequest<T>(
    path: string,
    params?: QueryParams,
    signal?: AbortSignal,
  ): Promise<T[]> {
    const url = buildUrl(`${this.baseUrl}${path}`, params);

    return this.executeRequest(
      url,
      'GET',
      () => ({ headers: this.authHeaders(), signal }),
      parseNdJsonResponse<T>,
      signal,
    );
  }

  private async request<T>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<T> {
    const url = buildUrl(`${this.baseUrl}${path}`, params);

    return this.executeRequest(
      url,
      'GET',
      () => ({ headers: this.authHeaders(), signal }),
      parseJsonResponse<T>,
      signal,
    );
  }

  private async bodyRequest<T>(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    body: unknown,
    signal?: AbortSignal,
    authenticate = true,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const serialized = JSON.stringify(body);

    return this.executeRequest(
      url,
      method,
      () => ({
        method,
        headers: authenticate ? this.authHeaders(true) : this.postHeaders,
        body: serialized,
        signal,
      }),
      parseJsonResponse<T>,
      signal,
      authenticate,
    );
  }

  private async emptyRequest<T>(method: 'DELETE', path: string, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    return this.executeRequest(
      url,
      method,
      () => ({ method, headers: this.authHeaders(), signal }),
      parseJsonResponse<T>,
      signal,
    );
  }

  private async executeRequest<T>(
    url: string,
    method: RequestEvent['method'],
    init: () => RequestInit,
    parse: (response: Response, context: RequestContext) => Promise<T>,
    signal?: AbortSignal,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const startedAt = new Date();

    let statusCode: number | undefined;

    try {
      const tokenAtStart = this.token;

      let response = await this.fetch(url, init());

      if (response.status === 401 && this.credentials && retryOnUnauthorized) {
        if (this.token === tokenAtStart) {
          await this.refreshSession(signal);
        }

        response = await this.fetch(url, init());
      }

      statusCode = response.status;
      const result = await parse(response, { url, method });
      const finishedAt = new Date();

      this.emit('request', {
        url,
        method,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
      });

      return result;
    } catch (error) {
      const finishedAt = new Date();

      this.emit('request', {
        url,
        method,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: error as Error,
      });

      throw error;
    }
  }
}

interface RequestContext {
  url: string;
  method: RequestEvent['method'];
}

async function parseJsonResponse<T>(response: Response, context: RequestContext): Promise<T> {
  if (!response.ok) {
    throw await createApiError(response, context);
  }

  return (await response.json()) as T;
}

async function parseNdJsonResponse<T>(response: Response, context: RequestContext): Promise<T[]> {
  if (!response.ok) {
    throw await createApiError(response, context);
  }

  const results: T[] = [];

  for await (const line of readLines(response)) {
    if (!line) {
      continue;
    }

    const parsed = JSON.parse(line) as { result?: T; error?: unknown };

    if (!parsed.error && parsed.result) {
      results.push(parsed.result);
    }
  }

  return results;
}

async function* readLines(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    for (const line of (await response.text()).split('\n')) {
      yield line;
    }

    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let pending = '';

  while (true) {
    const { done, value } = await reader.read();

    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split('\n');

    pending = lines.pop()!;

    for (const line of lines) {
      yield line;
    }

    if (done) {
      break;
    }
  }

  if (pending) {
    yield pending;
  }
}

async function createApiError(
  response: Response,
  context: RequestContext,
): Promise<ArgoCdApiError> {
  let body: unknown;

  try {
    if (typeof response.text === 'function') {
      const text = await response.text();

      try {
        body = JSON.parse(text);
      } catch {
        body = text || undefined;
      }
    } else if (typeof response.json === 'function') {
      body = await response.json();
    }
  } catch {
    body = undefined;
  }

  const requestId =
    response.headers?.get('x-request-id') ??
    response.headers?.get('x-argo-request-id') ??
    undefined;

  return new ArgoCdApiError(response.status, response.statusText, { ...context, body, requestId });
}

function buildUrl(url: string, params?: Record<string, QueryValue | undefined>): string {
  const parsed = new URL(url);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        parsed.searchParams.append(key, String(item));
      }
    } else {
      parsed.searchParams.set(key, String(value));
    }
  }

  return parsed.toString();
}
