/**
 * Thrown when the Argo CD API returns a non-2xx response.
 */
export class ArgoCdApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;
  readonly url?: string;
  readonly method?: string;
  readonly requestId?: string;

  constructor(
    status: number,
    statusText: string,
    details: { body?: unknown; url?: string; method?: string; requestId?: string } = {},
  ) {
    super(`Argo CD API error: ${status} ${statusText}`);
    this.name = 'ArgoCdApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = details.body;
    this.url = details.url;
    this.method = details.method;
    this.requestId = details.requestId;
  }
}
