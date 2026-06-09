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

  it('skips undefined query params in the URL', async () => {
    mockJson({ items: [] });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

    await client.applications.list({ selector: undefined });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.has('selector')).toBe(false);
  });

  it('throws from refreshSession when no credentials are stored', async () => {
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

    await expect(client.refreshSession()).rejects.toThrow('No credentials stored');
  });

  describe('resource CRUD methods', () => {
    let client: ArgoCdClient;

    beforeEach(() => {
      client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
    });

    it('creates an application', async () => {
      mockJson({ metadata: { name: 'guestbook' } });

      await client.applications.create({ metadata: { name: 'guestbook' } });

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/applications');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('patches an application', async () => {
      mockJson({ metadata: { name: 'guestbook' } });

      await client.applications.patch('guestbook', { spec: {} });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
    });

    it('refreshes an application', async () => {
      mockJson({ metadata: { name: 'guestbook' } });

      await client.applications.refresh('guestbook');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('refresh=normal');
    });

    it('gets a project', async () => {
      mockJson({ metadata: { name: 'default' } });

      await client.projects.get('default');

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/projects/default');
    });

    it('creates a project', async () => {
      mockJson({ metadata: { name: 'default' } });

      await client.projects.create({ metadata: { name: 'default' } });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('updates a project', async () => {
      mockJson({ metadata: { name: 'default' } });

      await client.projects.update('default', { metadata: { name: 'default' } });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/projects/default');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    });

    it('deletes a project by name', async () => {
      mockJson({});

      await client.projects.deleteByName('default');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/projects/default');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('gets a repository', async () => {
      mockJson({ repo: 'https://github.com/acme/app.git' });

      await client.repositories.get('https://github.com/acme/app.git');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/repositories/');
    });

    it('creates a repository', async () => {
      mockJson({ repo: 'https://github.com/acme/app.git' });

      await client.repositories.create({ repo: 'https://github.com/acme/app.git' });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('deletes a repository', async () => {
      mockJson({});

      await client.repositories.deleteByRepo('https://github.com/acme/app.git');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('gets a cluster', async () => {
      mockJson({ name: 'in-cluster', server: 'https://kubernetes.default.svc' });

      await client.clusters.get('https://kubernetes.default.svc');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/clusters/');
    });

    it('creates a cluster', async () => {
      mockJson({ name: 'in-cluster', server: 'https://kubernetes.default.svc' });

      await client.clusters.create({
        name: 'in-cluster',
        server: 'https://kubernetes.default.svc',
      });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('deletes a cluster by server', async () => {
      mockJson({});

      await client.clusters.deleteByServer('https://kubernetes.default.svc');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('gets an account', async () => {
      mockJson({ name: 'admin', enabled: true });

      await client.accounts.get('admin');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/account/admin');
    });

    it('checks account can-i', async () => {
      mockJson({ value: 'yes' });

      await client.accounts.canI('applications', 'get', '*');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/account/can-i/');
    });

    it('updates account password', async () => {
      mockJson({});

      await client.accounts.updatePassword({
        currentPassword: 'old',
        name: 'admin',
        newPassword: 'new',
      });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/account/password');
    });

    it('deletes an account token', async () => {
      mockJson({});

      await client.accounts.deleteToken('admin', 'token-id');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/account/admin/token/token-id');
    });
  });

  describe('401 auto-refresh on POST and DELETE', () => {
    it('auto-refreshes on 401 from a POST request and retries', async () => {
      mockJson({ token: 'initial-token' }); // fromCredentials
      mockJson({ metadata: { name: 'g' } }, 401); // POST 401
      mockJson({ token: 'new-token' }); // refresh
      mockJson({ metadata: { name: 'g' } }); // retry success

      const client = await ArgoCdClient.fromCredentials({
        baseUrl: 'https://argocd.example.com',
        username: 'admin',
        password: 'secret',
      });
      const result = await client.applications.create({ metadata: { name: 'g' } });

      expect(result.metadata?.name).toBe('g');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('auto-refreshes on 401 from a DELETE request and retries', async () => {
      mockJson({ token: 'initial-token' }); // fromCredentials
      mockJson({}, 401); // DELETE 401
      mockJson({ token: 'new-token' }); // refresh
      mockJson({}); // retry success

      const client = await ArgoCdClient.fromCredentials({
        baseUrl: 'https://argocd.example.com',
        username: 'admin',
        password: 'secret',
      });
      await client.applications.deleteByName('guestbook');

      expect(mockFetch).toHaveBeenCalledTimes(4);
      const lastCall = mockFetch.mock.calls[3][1];
      expect(lastCall).toMatchObject({ headers: { Authorization: 'Bearer new-token' } });
    });

    it('emits a request event with error on failed POST', async () => {
      mockJson({ error: 'bad' }, 400);
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
      const events: import('./ArgoCdClient').RequestEvent[] = [];
      client.on('request', (e) => events.push(e));

      await expect(client.applications.create({ metadata: { name: 'g' } })).rejects.toThrow(
        ArgoCdApiError,
      );

      expect(events[0].method).toBe('POST');
      expect(events[0].error).toBeInstanceOf(ArgoCdApiError);
      expect(events[0].statusCode).toBe(400);
    });

    it('emits a request event with error on failed DELETE', async () => {
      mockJson({ error: 'not found' }, 404);
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
      const events: import('./ArgoCdClient').RequestEvent[] = [];
      client.on('request', (e) => events.push(e));

      await expect(client.applications.deleteByName('nonexistent')).rejects.toThrow(ArgoCdApiError);

      expect(events[0].method).toBe('DELETE');
      expect(events[0].error).toBeInstanceOf(ArgoCdApiError);
    });
  });
});
