import type { ArgoCdSettings } from '../domain/settings';
import type { RequestFn } from './types';

/** Methods for Argo CD server settings. */
export class SettingsResource {
  /** @internal */
  constructor(private readonly request: RequestFn) {}

  /** Returns the Argo CD server settings (public, read-only). */
  async get(signal?: AbortSignal): Promise<ArgoCdSettings> {
    return this.request<ArgoCdSettings>('/api/v1/settings', undefined, signal);
  }
}
