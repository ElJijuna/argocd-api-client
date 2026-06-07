import type { ArgoCdCluster, ArgoCdClusterList } from '../domain/cluster';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

export class ClusterResource {
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  async list(signal?: AbortSignal): Promise<ArgoCdClusterList> {
    return this.request<ArgoCdClusterList>('/api/v1/clusters', undefined, signal);
  }

  async get(server: string, signal?: AbortSignal): Promise<ArgoCdCluster> {
    return this.request<ArgoCdCluster>(
      `/api/v1/clusters/${encodeURIComponent(server)}`,
      undefined,
      signal,
    );
  }

  async create(cluster: ArgoCdCluster, signal?: AbortSignal): Promise<ArgoCdCluster> {
    return this.post<ArgoCdCluster>('/api/v1/clusters', { cluster }, signal);
  }

  async deleteByServer(server: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/clusters/${encodeURIComponent(server)}`,
      signal,
    );
  }
}
