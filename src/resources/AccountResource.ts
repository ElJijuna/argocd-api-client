import type { ArgoCdAccount, ArgoCdAccountList, ArgoCdCanIResponse } from '../domain/account';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

export class AccountResource {
  constructor(
    private readonly request: RequestFn,
    private readonly put: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  async list(signal?: AbortSignal): Promise<ArgoCdAccountList> {
    return this.request<ArgoCdAccountList>('/api/v1/account', undefined, signal);
  }

  async get(name: string, signal?: AbortSignal): Promise<ArgoCdAccount> {
    return this.request<ArgoCdAccount>(
      `/api/v1/account/${encodeURIComponent(name)}`,
      undefined,
      signal,
    );
  }

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

  async updatePassword(
    body: { currentPassword: string; name: string; newPassword: string },
    signal?: AbortSignal,
  ): Promise<Record<string, never>> {
    return this.put<Record<string, never>>('/api/v1/account/password', body, signal);
  }

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
