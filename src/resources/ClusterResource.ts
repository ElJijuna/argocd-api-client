import type { ArgoCdCluster, ArgoCdClusterList } from '../domain/cluster';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD managed clusters. */
export class ClusterResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
    private readonly put: BodyRequestFn,
  ) {}

  /** Lists configured clusters. */
  async list(signal?: AbortSignal): Promise<ArgoCdClusterList> {
    return this.request<ArgoCdClusterList>('/api/v1/clusters', undefined, signal);
  }

  /** Gets one cluster by server URL. */
  async get(server: string, signal?: AbortSignal): Promise<ArgoCdCluster> {
    return this.request<ArgoCdCluster>(
      `/api/v1/clusters/${encodeURIComponent(server)}`,
      undefined,
      signal,
    );
  }

  /** Creates a cluster entry. */
  async create(cluster: ArgoCdCluster, signal?: AbortSignal): Promise<ArgoCdCluster> {
    return this.post<ArgoCdCluster>('/api/v1/clusters', { cluster }, signal);
  }

  /** Updates a cluster by server URL (full replace). */
  async update(
    server: string,
    cluster: ArgoCdCluster,
    signal?: AbortSignal,
  ): Promise<ArgoCdCluster> {
    return this.put<ArgoCdCluster>(
      `/api/v1/clusters/${encodeURIComponent(server)}`,
      { cluster },
      signal,
    );
  }

  /** Deletes a cluster by server URL. */
  async deleteByServer(server: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/clusters/${encodeURIComponent(server)}`,
      signal,
    );
  }

  /** Invalidates the cache for a cluster and returns the updated cluster. */
  async invalidateCache(server: string, signal?: AbortSignal): Promise<ArgoCdCluster> {
    return this.post<ArgoCdCluster>(
      `/api/v1/clusters/${encodeURIComponent(server)}/invalidate-cache`,
      undefined,
      signal,
    );
  }
}
