import { ArgoCdApiError, ArgoCdClient } from './index';

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('ArgoCdClient transport', () => {
  it('uses an injected fetch implementation', async () => {
    const transport = jest.fn(async (_input: string | URL | Request) =>
      jsonResponse({ Version: 'v2.14.0' }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });

    await client.version.get();

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/version');
  });

  it('deduplicates concurrent session refreshes', async () => {
    let sessionCalls = 0;
    let applicationCalls = 0;

    const transport = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith('/api/v1/session')) {
        sessionCalls += 1;

        return jsonResponse({ token: sessionCalls === 1 ? 'initial' : 'refreshed' });
      }

      applicationCalls += 1;

      if (applicationCalls <= 2) {
        return jsonResponse({ error: 'expired' }, 401);
      }

      return jsonResponse({ items: [] });
    });
    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
      fetch: transport as typeof fetch,
    });

    await Promise.all([client.applications.list(), client.applications.list()]);

    expect(sessionCalls).toBe(2);
    expect(applicationCalls).toBe(4);
  });

  it('parses NDJSON incrementally across chunk boundaries', async () => {
    const encoder = new TextEncoder();
    const payload = [
      JSON.stringify({ result: { content: 'first' }, error: null }),
      JSON.stringify({ result: { content: 'second' }, error: null }),
    ].join('\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(payload.slice(0, 17)));
        controller.enqueue(encoder.encode(payload.slice(17, 49)));
        controller.enqueue(encoder.encode(payload.slice(49)));
        controller.close();
      },
    });
    const transport = jest.fn(
      async (_input: string | URL | Request) => new Response(stream, { status: 200 }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });
    const logs = await client.applications.logs('guestbook');

    expect(logs.map((entry) => entry.content)).toEqual(['first', 'second']);
  });

  it('includes response context in ArgoCdApiError', async () => {
    const transport = jest.fn(async (_input: string | URL | Request) =>
      jsonResponse({ error: 'forbidden' }, 403, { 'x-request-id': 'request-123' }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });

    let error: unknown;

    try {
      await client.applications.list();
    } catch (cause) {
      error = cause;
    }

    expect(error).toBeInstanceOf(ArgoCdApiError);
    expect(error).toMatchObject({
      status: 403,
      method: 'GET',
      url: 'https://argocd.example.com/api/v1/applications',
      requestId: 'request-123',
      body: { error: 'forbidden' },
    });
  });
});
