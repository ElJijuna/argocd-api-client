import type {
  ArgoCdCertificate,
  ArgoCdCertificateDeleteParams,
  ArgoCdCertificateList,
} from '../domain/certificate';
import type { BodyRequestFn, EmptyBodyRequestFn, RequestFn } from './types';

/** Methods for Argo CD repository TLS/SSH certificates. */
export class CertificateResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly post: BodyRequestFn,
    private readonly deleteRequest: EmptyBodyRequestFn,
  ) {}

  /** Lists all repository certificates. */
  async list(signal?: AbortSignal): Promise<ArgoCdCertificateList> {
    return this.request<ArgoCdCertificateList>('/api/v1/certificates', undefined, signal);
  }

  /** Adds one or more repository certificates. */
  async create(
    certificates: ArgoCdCertificate[],
    signal?: AbortSignal,
  ): Promise<ArgoCdCertificateList> {
    return this.post<ArgoCdCertificateList>(
      '/api/v1/certificates',
      { items: certificates },
      signal,
    );
  }

  /**
   * Deletes repository certificates matching the given filters.
   * At least one filter param is recommended to avoid deleting all certificates.
   */
  async delete(
    params: ArgoCdCertificateDeleteParams = {},
    signal?: AbortSignal,
  ): Promise<ArgoCdCertificateList> {
    const query = new URLSearchParams();

    if (params.hostNamePattern) {
      query.set('hostNamePattern', params.hostNamePattern);
    }

    if (params.certType) {
      query.set('certType', params.certType);
    }

    if (params.certSubType) {
      query.set('certSubType', params.certSubType);
    }

    const qs = query.toString();

    return this.deleteRequest<ArgoCdCertificateList>(
      `/api/v1/certificates${qs ? `?${qs}` : ''}`,
      signal,
    );
  }
}
