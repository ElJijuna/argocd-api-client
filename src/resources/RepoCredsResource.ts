import type { ArgoCdRepoCred, ArgoCdRepoCredList } from '../domain/repocreds';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD repository credential templates. */
export class RepoCredsResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists all repository credential templates. */
  async list(signal?: AbortSignal): Promise<ArgoCdRepoCredList> {
    return this.request<ArgoCdRepoCredList>('/api/v1/repocreds', undefined, signal);
  }

  /** Creates a repository credential template. */
  async create(cred: ArgoCdRepoCred, signal?: AbortSignal): Promise<ArgoCdRepoCred> {
    return this.post<ArgoCdRepoCred>('/api/v1/repocreds', cred, signal);
  }

  /** Deletes a repository credential template by URL prefix. */
  async deleteByUrl(url: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/repocreds/${encodeURIComponent(url)}`,
      signal,
    );
  }
}
