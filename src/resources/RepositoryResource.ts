import type { ArgoCdRepository, ArgoCdRepositoryList } from '../domain/repository';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

export class RepositoryResource {
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  async list(signal?: AbortSignal): Promise<ArgoCdRepositoryList> {
    return this.request<ArgoCdRepositoryList>('/api/v1/repositories', undefined, signal);
  }

  async get(repo: string, signal?: AbortSignal): Promise<ArgoCdRepository> {
    return this.request<ArgoCdRepository>(
      `/api/v1/repositories/${encodeURIComponent(repo)}`,
      undefined,
      signal,
    );
  }

  async create(repository: ArgoCdRepository, signal?: AbortSignal): Promise<ArgoCdRepository> {
    return this.post<ArgoCdRepository>('/api/v1/repositories', { repo: repository }, signal);
  }

  async deleteByRepo(repo: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/repositories/${encodeURIComponent(repo)}`,
      signal,
    );
  }
}
