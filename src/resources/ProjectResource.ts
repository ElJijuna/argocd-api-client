import type { ArgoCdProject, ArgoCdProjectList, ArgoCdProjectListParams } from '../domain/project';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

export class ProjectResource {
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly put: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  async list(
    params: ArgoCdProjectListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdProjectList> {
    return this.request<ArgoCdProjectList>('/api/v1/projects', params, signal);
  }

  async get(name: string, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.request<ArgoCdProject>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      undefined,
      signal,
    );
  }

  async create(project: ArgoCdProject, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.post<ArgoCdProject>('/api/v1/projects', { project }, signal);
  }

  async update(name: string, project: ArgoCdProject, signal?: AbortSignal): Promise<ArgoCdProject> {
    return this.put<ArgoCdProject>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      { project },
      signal,
    );
  }

  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/projects/${encodeURIComponent(name)}`,
      signal,
    );
  }
}
