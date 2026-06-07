import type { ArgoCdAccount, ArgoCdAccountList, ArgoCdCanIResponse } from '../domain/account';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD local accounts and account capabilities. */
export class AccountResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly put: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists local accounts. */
  async list(signal?: AbortSignal): Promise<ArgoCdAccountList> {
    return this.request<ArgoCdAccountList>('/api/v1/account', undefined, signal);
  }

  /** Gets one account by name. */
  async get(name: string, signal?: AbortSignal): Promise<ArgoCdAccount> {
    return this.request<ArgoCdAccount>(
      `/api/v1/account/${encodeURIComponent(name)}`,
      undefined,
      signal,
    );
  }

  /** Checks whether current credentials can perform an action. */
  async canI(
    resource: string,
    action: string,
    subresource: string,
    signal?: AbortSignal,
  ): Promise<ArgoCdCanIResponse> {
    return this.request<ArgoCdCanIResponse>(
      `/api/v1/account/can-i/${encodeURIComponent(resource)}/${encodeURIComponent(action)}/${encodeURIComponent(subresource)}`,
      undefined,
      signal,
    );
  }

  /** Updates account password. */
  async updatePassword(
    body: { currentPassword: string; name: string; newPassword: string },
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    return this.put<Record<string, never>>('/api/v1/account/password', body, signal);
  }

  /** Deletes one account token by token id. */
  async deleteToken(
    name: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    return this.deleteRequest<Record<string, never>>(
      `/api/v1/account/${encodeURIComponent(name)}/token/${encodeURIComponent(id)}`,
      signal,
    );
  }
}
