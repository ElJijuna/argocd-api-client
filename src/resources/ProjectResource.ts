import type { ArgoCdEvent } from '../domain/application';
import type { ArgoCdProject, ArgoCdProjectList, ArgoCdProjectListParams } from '../domain/project';
import type { ArgoCdRepositoryList } from '../domain/repository';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD projects. */
export class ProjectResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly put: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists projects, optionally filtered by name. */
  async list(
    params: ArgoCdProjectListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdProjectList> {
    return this.request<ArgoCdProjectList>('/api/v1/projects', params, signal);
  }

  /** Gets one project by name. */
  async get(name: string, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.request<ArgoCdProject>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      undefined,
      signal,
    );
  }

  /** Creates a project. */
  async create(project: ArgoCdProject, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.post<ArgoCdProject>('/api/v1/projects', { project }, signal);
  }

  /** Updates a project by name. */
  async update(name: string, project: ArgoCdProject, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.put<ArgoCdProject>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      { project },
      signal,
    );
  }

  /** Deletes a project by name. */
  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      signal,
    );
  }

  /** Returns Kubernetes events for a project. */
  async events(name: string, signal?: AbortSignal): Promise<ArgoCdEvent[]> {
    const res = await this.request<{ items?: ArgoCdEvent[] }>(
      `/api/v1/projects/${encodeURIComponent(name)}/events`,
      undefined,
      signal,
    );

    return res.items ?? [];
  }

  /** Returns repositories associated with a project. */
  async repositories(name: string, signal?: AbortSignal): Promise<ArgoCdRepositoryList> {
    return this.request<ArgoCdRepositoryList>(
      `/api/v1/projects/${encodeURIComponent(name)}/repositories`,
      undefined,
      signal,
    );
  }
}
