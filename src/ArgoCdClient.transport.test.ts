import { ArgoCdApiError, ArgoCdClient } from './index';

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('ArgoCdClient transport', () => {
  it('shares an in-flight explicit session refresh', async () => {
    let sessionCalls = 0;

    const transport = jest.fn(async () => {
      sessionCalls += 1;
      await Promise.resolve();

      return jsonResponse({ token: `token-${sessionCalls}` });
    });
    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
      fetch: transport as typeof fetch,
    });

    await Promise.all([client.refreshSession(), client.refreshSession()]);

    expect(sessionCalls).toBe(2);
  });

  it('manages local session state explicitly', async () => {
    let sessionCalls = 0;
    let resolveRefresh!: (response: Response) => void;

    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const transport = jest.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      if (String(input).endsWith('/api/v1/session')) {
        sessionCalls += 1;

        return sessionCalls === 1 ? jsonResponse({ token: 'initial' }) : refreshResponse;
      }

      return jsonResponse({ items: [] });
    });
    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
      fetch: transport as typeof fetch,
    });

    expect(client.hasCredentials()).toBe(true);

    const refreshing = client.refreshSession();

    expect(client.setToken('manual')).toBe(client);
    resolveRefresh(jsonResponse({ token: 'stale-refresh' }));
    await refreshing;
    await client.applications.list();

    expect(transport.mock.calls.at(-1)?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer manual' },
    });
    expect(client.clearSession()).toBe(client);
    expect(client.hasCredentials()).toBe(false);

    await client.applications.list();

    expect(transport.mock.calls.at(-1)?.[1]).toMatchObject({
      headers: { Accept: 'application/json' },
    });
    expect(transport.mock.calls.at(-1)?.[1]?.headers).not.toHaveProperty('Authorization');
  });

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

  it('streams logs lazily and emits an event after completion', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ result: { content: 'first' } })}\n`));
        controller.enqueue(encoder.encode(JSON.stringify({ result: { content: 'second' } })));
        controller.close();
      },
    });
    const transport = jest.fn(async () => new Response(stream));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });
    const events: import('./ArgoCdClient').RequestEvent[] = [];

    client.on('request', (event) => events.push(event));

    const iterable = client.applications.logsStream('guestbook');

    expect(transport).not.toHaveBeenCalled();

    const entries = [];

    for await (const entry of iterable) {
      entries.push(entry);
    }

    expect(entries.map(({ content }) => content)).toEqual(['first', 'second']);
    expect(events).toMatchObject([{ method: 'GET', statusCode: 200, error: undefined }]);
  });

  it('cancels the response reader when log iteration stops early', async () => {
    const cancel = jest.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `${JSON.stringify({ result: { content: 'first' } })}\n${JSON.stringify({ result: { content: 'second' } })}\n`,
          ),
        );
      },
      cancel,
    });
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () => new Response(stream)) as typeof fetch,
    });
    const entries = [];

    for await (const entry of client.applications.logsStream('guestbook')) {
      entries.push(entry);
      break;
    }

    expect(entries).toMatchObject([{ content: 'first' }]);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('handles blank NDJSON lines through the text fallback', async () => {
    const response = {
      body: null,
      ok: true,
      status: 200,
      text: async () => `\n${JSON.stringify({ result: { content: 'line' } })}\n`,
    } as Response;
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () => response) as typeof fetch,
    });

    await expect(client.applications.logs('guestbook')).resolves.toEqual([{ content: 'line' }]);
  });

  it('handles a streamed NDJSON response ending with a newline', async () => {
    const payload = `${JSON.stringify({ result: { content: 'line' } })}\n`;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () => new Response(stream)) as typeof fetch,
    });

    await expect(client.applications.logs('guestbook')).resolves.toEqual([{ content: 'line' }]);
  });

  it('throws a contextual error for a failed NDJSON response', async () => {
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () => new Response('denied', { status: 403 })) as typeof fetch,
    });

    await expect(client.applications.logs('guestbook')).rejects.toMatchObject({
      status: 403,
      body: 'denied',
    });
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

  it.each([
    {
      response: { ok: false, status: 400, statusText: 'Bad', text: async () => '' },
      body: undefined,
    },
    {
      response: {
        ok: false,
        status: 400,
        statusText: 'Bad',
        json: async () => ({ error: 'json fallback' }),
      },
      body: { error: 'json fallback' },
    },
    {
      response: {
        ok: false,
        status: 400,
        statusText: 'Bad',
        text: async () => Promise.reject(new Error('unreadable')),
      },
      body: undefined,
    },
    {
      response: { ok: false, status: 400, statusText: 'Bad' },
      body: undefined,
    },
  ])('handles API error body variant %#', async ({ response, body }) => {
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () => response as unknown as Response) as typeof fetch,
    });

    await expect(client.applications.list()).rejects.toMatchObject({ body });
  });

  it('supports Argo request IDs and default error details', async () => {
    const error = new ArgoCdApiError(500, 'Internal Server Error');
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: (async () =>
        new Response('failed', {
          status: 500,
          headers: { 'x-argo-request-id': 'argo-123' },
        })) as typeof fetch,
    });

    expect(error.body).toBeUndefined();
    await expect(client.applications.list()).rejects.toMatchObject({ requestId: 'argo-123' });
  });
});
