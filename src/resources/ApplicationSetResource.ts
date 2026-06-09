import type {
  ArgoCdApplicationSet,
  ArgoCdApplicationSetList,
  ArgoCdApplicationSetListParams,
} from '../domain/applicationset';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD ApplicationSets. */
export class ApplicationSetResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly put: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists ApplicationSets, optionally filtered by project. */
  async list(
    params: ArgoCdApplicationSetListParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationSetList> {
    return this.request<ArgoCdApplicationSetList>('/api/v1/applicationsets', params, signal);
  }

  /** Gets one ApplicationSet by name. */
  async get(name: string, signal?: AbortSignal): Promise<ArgoCdApplicationSet> {
    return this.request<ArgoCdApplicationSet>(
      `/api/v1/applicationsets/${encodeURIComponent(name)}`,
      undefined,
      signal,
    );
  }

  /** Creates an ApplicationSet. */
  async create(
    applicationSet: ArgoCdApplicationSet,
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationSet> {
    return this.post<ArgoCdApplicationSet>(
      '/api/v1/applicationsets',
      { applicationset: applicationSet },
      signal,
    );
  }

  /** Updates an ApplicationSet by name (full replace). */
  async update(
    name: string,
    applicationSet: ArgoCdApplicationSet,
    signal?: AbortSignal,
  ): Promise<ArgoCdApplicationSet> {
    return this.put<ArgoCdApplicationSet>(
      `/api/v1/applicationsets/${encodeURIComponent(name)}`,
      { applicationset: applicationSet },
      signal,
    );
  }

  /** Deletes an ApplicationSet by name. */
  async deleteByName(name: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/applicationsets/${encodeURIComponent(name)}`,
      signal,
    );
  }
}
