import type { ArgoCdGpgKey, ArgoCdGpgKeyCreateResponse, ArgoCdGpgKeyList } from '../domain/gpgkey';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD GPG public keys used for commit verification. */
export class GpgKeyResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists all configured GPG public keys. */
  async list(signal?: AbortSignal): Promise<ArgoCdGpgKeyList> {
    return this.request<ArgoCdGpgKeyList>('/api/v1/gpgkeys', undefined, signal);
  }

  /**
   * Imports one or more GPG public keys.
   *
   * @param key - Key object containing at minimum `keyData` (ASCII-armored PGP block).
   * @param params - Optional import behavior.
   * @param params.upsert - When true, replaces an existing key with the same ID.
   */
  async create(
    key: ArgoCdGpgKey,
    params: { upsert?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdGpgKeyCreateResponse> {
    const qs = params.upsert ? '?upsert=true' : '';

    return this.post<ArgoCdGpgKeyCreateResponse>(`/api/v1/gpgkeys${qs}`, key, signal);
  }

  /** Deletes a GPG public key by key ID. */
  async deleteByKeyId(keyId: string, signal?: AbortSignal): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/gpgkeys/${encodeURIComponent(keyId)}`,
      signal,
    );
  }
}
