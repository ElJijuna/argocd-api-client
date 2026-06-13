import type {
  ArgoCdRepoAppsParams,
  ArgoCdRepoAppsResponse,
  ArgoCdRepository,
  ArgoCdRepositoryList,
  ArgoCdRepositoryRefs,
} from '../domain/repository';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD repository credentials and repository metadata. */
export class RepositoryResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists configured repositories. */
  async list(signal?: AbortSignal): Promise<ArgoCdRepositoryList> {
    return this.request<ArgoCdRepositoryList>('/api/v1/repositories', undefined, signal);
  }

  /** Gets one repository by repo URL. */
  async get(repo: string, signal?: AbortSignal): Promise<ArgoCdRepository> {
    return this.request<ArgoCdRepository>(
      `/api/v1/repositories/${encodeURIComponent(repo)}`,
      undefined,
      signal,
    );
  }

  /** Creates repository credentials/config. */
  async create(repository: ArgoCdRepository, signal?: AbortSignal): Promise<ArgoCdRepository> {
    return this.post<ArgoCdRepository>('/api/v1/repositories', { repo: repository }, signal);
  }

  /** Deletes repository credentials/config by repo URL. */
  async deleteByRepo(repo: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/repositories/${encodeURIComponent(repo)}`,
      signal,
    );
  }

  /** Returns branches and tags for a repository. */
  async refs(repo: string, signal?: AbortSignal): Promise<ArgoCdRepositoryRefs> {
    return this.request<ArgoCdRepositoryRefs>(
      `/api/v1/repositories/${encodeURIComponent(repo)}/refs`,
      undefined,
      signal,
    );
  }

  /** Returns the list of apps detected inside a repository at a given path/revision. */
  async apps(
    repo: string,
    params: ArgoCdRepoAppsParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdRepoAppsResponse> {
    return this.request<ArgoCdRepoAppsResponse>(
      `/api/v1/repositories/${encodeURIComponent(repo)}/apps`,
      params,
      signal,
    );
  }
}
