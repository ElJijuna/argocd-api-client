/**
 * Thrown when the Argo CD API returns a non-2xx response.
 */
export class ArgoCdApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Argo CD API error: ${status} ${statusText}`);
    this.name = 'ArgoCdApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
