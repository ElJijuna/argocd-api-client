import type {
  ArgoCdApplication,
  ArgoCdApplicationGetParams,
  ArgoCdApplicationList,
  ArgoCdApplicationListParams,
  ArgoCdApplicationLogsParams,
  ArgoCdLogEntry,
  ArgoCdManagedResource,
  ArgoCdManagedResourcesList,
  ArgoCdManagedResourcesParams,
  ArgoCdResourceTree,
} from '../domain/application';
import type { BodyRequestFn, EmptyBodyRequestFn, NdJsonRequestFn, RequestFn } from './types';

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
    private readonly put: BodyRequestFn,
    private readonly ndJson: NdJsonRequestFn,
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

  /** Updates an application by name (full replace). */
  async update(
    name: string,
    application: ArgoCdApplication,
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.put<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}`,
      { application },
      signal,
    );
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

  /** Rolls back an application to a previous deployment ID. */
  async rollback(
    name: string,
    body: { id?: number; prune?: boolean; dryRun?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplication> {
    return this.post<ArgoCdApplication>(
      `/api/v1/applications/${encodeURIComponent(name)}/rollback`,
      body,
      signal,
    );
  }

  /** Fetches buffered pod logs for an application. */
  async logs(
    name: string,
    params: ArgoCdApplicationLogsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdLogEntry[]> {
    return this.ndJson<ArgoCdLogEntry>(
      `/api/v1/applications/${encodeURIComponent(name)}/logs`,
      params,
      signal,
    );
  }

  /** Returns the live resource tree for an application. */
  async resourceTree(
    name: string,
    params: { appNamespace?: string } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdResourceTree> {
    return this.request<ArgoCdResourceTree>(
      `/api/v1/applications/${encodeURIComponent(name)}/resource-tree`,
      params,
      signal,
    );
  }

  /** Returns the managed Kubernetes resources for an application. */
  async managedResources(
    name: string,
    params: ArgoCdManagedResourcesParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdManagedResource[]> {
    const res = await this.request<ArgoCdManagedResourcesList>(
      `/api/v1/applications/${encodeURIComponent(name)}/managed-resources`,
      params,
      signal,
    );
    return res.items ?? [];
  }

  /** Refreshes an application using the normal refresh mode. */
  async refresh(name: string, signal?: AbortSignal): Promise<ArgoCdApplication> {
    return this.get(name, { refresh: 'normal' }, signal);
  }
}
