import { ArgoCdApiError, ArgoCdClient } from './index';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
  });
}

describe('ArgoCdClient capabilities', () => {
  it('queries the official version endpoint and caches successful results', async () => {
    const transport = jest.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      jsonResponse({ Version: 'v3.5.1' }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });
    const first = await client.capabilities();
    const second = await client.capabilities();

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('https://argocd.example.com/api/version');
    expect(second).toBe(first);
    expect(first.supported).toBe(true);
    expect(first.features.applicationWatchStream).toBe(true);
  });

  it('refreshes the cached result when requested', async () => {
    const transport = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ Version: 'v3.5.1' }))
      .mockResolvedValueOnce(jsonResponse({ Version: 'v3.5.2' }));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });
    const cached = await client.capabilities();

    expect((await client.capabilities()).version.raw).toBe('v3.5.1');

    const refreshed = await client.capabilities({ refresh: true });

    expect(transport).toHaveBeenCalledTimes(2);
    expect(cached.version.raw).toBe('v3.5.1');
    expect(refreshed.version.raw).toBe('v3.5.2');
  });

  it('propagates non-2xx version responses without caching them', async () => {
    const transport = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'unavailable' }, 503))
      .mockResolvedValueOnce(jsonResponse({ Version: 'v3.5.1' }));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });

    await expect(client.capabilities()).rejects.toMatchObject<Partial<ArgoCdApiError>>({
      status: 503,
    });
    await expect(client.capabilities()).resolves.toMatchObject({ supported: true });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('passes abort signals to the version request', async () => {
    const transport = jest.fn(
      async (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          );
        }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });
    const controller = new AbortController();
    const pending = client.capabilities({ signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
