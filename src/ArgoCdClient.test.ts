import { ArgoCdApiError, ArgoCdClient } from './index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJson<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

describe('ArgoCdClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('creates a session with username and password', async () => {
    mockJson({ token: 'jwt-token' });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com/' });

    const session = await client.createSession({ username: 'admin', password: 'secret' });

    expect(session.token).toBe('jwt-token');
    expect(mockFetch).toHaveBeenCalledWith('https://argocd.example.com/api/v1/session', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
      signal: undefined,
    });
  });

  it('lists applications with bearer auth and query params', async () => {
    mockJson({ items: [{ metadata: { name: 'guestbook' } }] });
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      token: 'jwt-token',
    });

    const apps = await client.applications.list({
      project: ['default'],
      selector: 'team=platform',
    });

    expect(apps.items[0].metadata?.name).toBe('guestbook');
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(`${url.origin}${url.pathname}`).toBe('https://argocd.example.com/api/v1/applications');
    expect(url.searchParams.getAll('project')).toEqual(['default']);
    expect(url.searchParams.get('selector')).toBe('team=platform');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      headers: { Accept: 'application/json', Authorization: 'Bearer jwt-token' },
    });
  });

  it('gets and syncs an application', async () => {
    mockJson({ metadata: { name: 'guestbook' } });
    mockJson({ metadata: { name: 'guestbook' }, status: { operationState: { phase: 'Running' } } });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await client.applications.get('guestbook', { project: 'default' });
    const sync = await client.applications.sync('guestbook', { revision: 'main' });

    expect(sync.metadata?.name).toBe('guestbook');
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://argocd.example.com/api/v1/applications/guestbook?project=default',
    );
    expect(mockFetch.mock.calls[1]).toEqual([
      'https://argocd.example.com/api/v1/applications/guestbook/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ revision: 'main' }),
      }),
    ]);
  });

  it('exposes projects repositories clusters and accounts resources', async () => {
    mockJson({ items: [{ metadata: { name: 'default' } }] });
    mockJson({ items: [{ repo: 'https://github.com/acme/app.git' }] });
    mockJson({ items: [{ name: 'in-cluster' }] });
    mockJson({ items: [{ name: 'admin', enabled: true }] });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await client.projects.list();
    await client.repositories.list();
    await client.clusters.list();
    await client.accounts.list();

    expect(mockFetch.mock.calls.map((call) => call[0])).toEqual([
      'https://argocd.example.com/api/v1/projects',
      'https://argocd.example.com/api/v1/repositories',
      'https://argocd.example.com/api/v1/clusters',
      'https://argocd.example.com/api/v1/account',
    ]);
  });

  it('throws ArgoCdApiError on non-2xx responses', async () => {
    mockJson({ error: 'nope' }, 403);
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'bad-token' });

    await expect(client.applications.list()).rejects.toThrow(ArgoCdApiError);
  });

  it('emits a request event on successful GET', async () => {
    mockJson({ items: [{ metadata: { name: 'guestbook' } }] });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
    const events: import('./ArgoCdClient').RequestEvent[] = [];
    client.on('request', (e) => events.push(e));

    await client.applications.list();

    expect(events).toHaveLength(1);
    expect(events[0].method).toBe('GET');
    expect(events[0].url).toContain('/api/v1/applications');
    expect(events[0].statusCode).toBe(200);
    expect(events[0].error).toBeUndefined();
    expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('emits a request event with error on failed request', async () => {
    mockJson({ error: 'forbidden' }, 403);
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
    const events: import('./ArgoCdClient').RequestEvent[] = [];
    client.on('request', (e) => events.push(e));

    await expect(client.applications.list()).rejects.toThrow(ArgoCdApiError);

    expect(events).toHaveLength(1);
    expect(events[0].statusCode).toBe(403);
    expect(events[0].error).toBeInstanceOf(ArgoCdApiError);
  });

  it('emits a request event for POST requests', async () => {
    mockJson({ token: 'jwt' });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com' });
    const events: import('./ArgoCdClient').RequestEvent[] = [];
    client.on('request', (e) => events.push(e));

    await client.createSession({ username: 'admin', password: 'secret' });

    expect(events).toHaveLength(1);
    expect(events[0].method).toBe('POST');
    expect(events[0].url).toContain('/api/v1/session');
    expect(events[0].statusCode).toBe(200);
  });

  it('supports method chaining on .on()', () => {
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com' });
    const result = client.on('request', () => {});
    expect(result).toBe(client);
  });

  it('fromCredentials creates an authenticated client', async () => {
    mockJson({ token: 'jwt-from-login' });
    mockJson({ items: [{ metadata: { name: 'guestbook' } }] });

    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });
    await client.applications.list();

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://argocd.example.com/api/v1/session',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockFetch.mock.calls[1][1]).toMatchObject({
      headers: { Authorization: 'Bearer jwt-from-login' },
    });
  });

  it('refreshSession updates the token used in subsequent requests', async () => {
    mockJson({ token: 'initial-token' });
    mockJson({ token: 'refreshed-token' });
    mockJson({ items: [] });

    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });
    await client.refreshSession();
    await client.applications.list();

    expect(mockFetch.mock.calls[2][1]).toMatchObject({
      headers: { Authorization: 'Bearer refreshed-token' },
    });
  });

  it('auto-refreshes on 401 and retries the request', async () => {
    mockJson({ token: 'initial-token' });
    mockJson({ items: [] }, 401);
    mockJson({ token: 'new-token' });
    mockJson({ items: [{ metadata: { name: 'guestbook' } }] });

    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });
    const apps = await client.applications.list();

    expect(apps.items[0].metadata?.name).toBe('guestbook');
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockFetch.mock.calls[3][1]).toMatchObject({
      headers: { Authorization: 'Bearer new-token' },
    });
  });

  it('passes AbortSignal to GET POST and DELETE requests', async () => {
    mockJson({ items: [] });
    mockJson({ token: 'jwt-token' });
    mockJson({});
    const controller = new AbortController();
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await client.applications.list({}, controller.signal);
    await client.createSession({ username: 'admin', password: 'secret' }, controller.signal);
    await client.applications.deleteByName('guestbook', controller.signal);

    expect(mockFetch.mock.calls[0][1]).toMatchObject({ signal: controller.signal });
    expect(mockFetch.mock.calls[1][1]).toMatchObject({ signal: controller.signal });
    expect(mockFetch.mock.calls[2][1]).toMatchObject({ signal: controller.signal });
  });
});
