import type { ArgoCdVersion } from '../domain/version';
import type { RequestFn } from './types';

/** Methods for Argo CD server version. */
export class VersionResource {
  /** @internal */
  constructor(private readonly request: RequestFn) {}

  /** Returns Argo CD server version information. */
  async get(signal?: AbortSignal): Promise<ArgoCdVersion> {
    return this.request<ArgoCdVersion>('/api/version', undefined, signal);
  }
}
