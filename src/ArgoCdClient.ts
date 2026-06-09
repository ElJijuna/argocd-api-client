import type { ArgoCdSession, ArgoCdSessionRequest } from './domain/session';
import { ArgoCdApiError } from './errors/ArgoCdApiError';
import { AccountResource } from './resources/AccountResource';
import { ApplicationResource } from './resources/ApplicationResource';
import { ClusterResource } from './resources/ClusterResource';
import { ProjectResource } from './resources/ProjectResource';
import { RepositoryResource } from './resources/RepositoryResource';
import type { QueryParams, QueryValue } from './resources/types';

export interface ArgoCdClientOptions {
  /** Base URL of the Argo CD server, without `/api/v1`. */
  baseUrl: string;
  /** Argo CD JWT sent as `Authorization: Bearer <jwt>` for authenticated endpoints. */
  token?: string;
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
  /** Project API resource. */
  readonly projects: ProjectResource;
  /** Repository API resource. */
  readonly repositories: RepositoryResource;
  /** Cluster API resource. */
  readonly clusters: ClusterResource;
  /** Account API resource. */
  readonly accounts: AccountResource;
  private readonly baseUrl: string;
  private token?: string;
  private credentials?: StoredCredentials;
  private readonly publicHeaders = { Accept: 'application/json' };
  private readonly postHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };

  constructor(options: ArgoCdClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
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

    this.applications = new ApplicationResource(request, post, del, patch);
    this.projects = new ProjectResource(request, post, put, del);
    this.repositories = new RepositoryResource(request, post, del);
    this.clusters = new ClusterResource(request, post, del);
    this.accounts = new AccountResource(request, put, del);
  }

  /**
   * Creates an authenticated client by exchanging credentials for a session token.
   * Stores the credentials internally so the client can auto-refresh on 401 responses.
   */
  static async fromCredentials(options: ArgoCdCredentialsOptions): Promise<ArgoCdClient> {
    const { baseUrl, username, password, signal } = options;
    const base = new ArgoCdClient({ baseUrl });
    const { token } = await base.createSession({ username, password }, signal);
    const client = new ArgoCdClient({ baseUrl, token });
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
    const base = new ArgoCdClient({ baseUrl: this.baseUrl });
    const { token } = await base.createSession(this.credentials, signal);
    this.token = token;
  }

  /**
   * Creates an Argo CD session from username/password credentials.
   *
   * `POST /api/v1/session`
   */
  async createSession(body: ArgoCdSessionRequest, signal?: AbortSignal): Promise<ArgoCdSession> {
    return this.post<ArgoCdSession>('/api/v1/session', body, signal);
  }

  private authHeaders(includeContentType?: boolean) {
    const base = includeContentType ? this.postHeaders : this.publicHeaders;
    return this.token ? { ...base, Authorization: `Bearer ${this.token}` } : { ...base };
  }

  private async request<T>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<T> {
    const url = buildUrl(`${this.baseUrl}${path}`, params);
    let response = await fetch(url, { headers: this.authHeaders(), signal });
    if (response.status === 401 && this.credentials) {
      await this.refreshSession(signal);
      response = await fetch(url, { headers: this.authHeaders(), signal });
    }
    return parseResponse<T>(response);
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return this.bodyRequest<T>('POST', path, body, signal);
  }

  private async bodyRequest<T>(
    method: 'POST' | 'PUT' | 'PATCH',
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const serialized = JSON.stringify(body);
    let response = await fetch(url, {
      method,
      headers: this.authHeaders(true),
      body: serialized,
      signal,
    });
    if (response.status === 401 && this.credentials) {
      await this.refreshSession(signal);
      response = await fetch(url, {
        method,
        headers: this.authHeaders(true),
        body: serialized,
        signal,
      });
    }
    return parseResponse<T>(response);
  }

  private async emptyRequest<T>(method: 'DELETE', path: string, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response = await fetch(url, { method, headers: this.authHeaders(), signal });
    if (response.status === 401 && this.credentials) {
      await this.refreshSession(signal);
      response = await fetch(url, { method, headers: this.authHeaders(), signal });
    }
    return parseResponse<T>(response);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ArgoCdApiError(response.status, response.statusText);
  return (await response.json()) as T;
}

function buildUrl(url: string, params?: Record<string, QueryValue | undefined>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) parsed.searchParams.append(key, String(item));
    } else {
      parsed.searchParams.set(key, String(value));
    }
  }
  return parsed.toString();
}
