import type {
  ArgoCdApplication,
  ArgoCdApplicationGetParams,
  ArgoCdApplicationList,
  ArgoCdApplicationListParams,
} from '../domain/application';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/**
 * Methods for Argo CD applications.
 *
 * Applications represent deployed GitOps workloads managed by Argo CD.
 */
export class ApplicationResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
    private readonly patchRequest: BodyRequestFn,
  ) {}

  /** Lists applications, optionally filtered by project, selector, repo, or namespace. */
  async list(
    params: ArgoCdApplicationListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationList> {
    return this.request<ArgoCdApplicationList>('/api/v1/applications', params, signal);
  }

  /** Gets one application by name. */
  async get(
    name: string,
    params: ArgoCdApplicationGetParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.request<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      params,
      signal,
    );
  }

  /** Creates an application. */
  async create(application: ArgoCdApplication, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>('/api/v1/applications', { application }, signal);
  }

  /** Deletes an application by name. */
  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      signal,
    );
  }

  /** Applies a JSON merge patch to an application. */
  async patch(name: string, patch: unknown, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.patchRequest<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      patch,
      signal,
    );
  }

  /** Starts a sync operation for an application. */
  async sync(
    name: string,
    body: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      body,
      signal,
    );
  }

  /** Refreshes an application using the normal refresh mode. */
  async refresh(name: string, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.get(name, { refresh: 'normal' }, signal);
  }
}
