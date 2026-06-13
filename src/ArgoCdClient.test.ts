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

  it('deletes the current session (logout)', async () => {
    mockJson({});
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

    await client.deleteSession();

    expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/session');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('returns userinfo for the authenticated user', async () => {
    mockJson({ loggedIn: true, username: 'admin', iss: 'argocd', groups: ['admins'] });
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

    const info = await client.userInfo();

    expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/session/userinfo');
    expect(info.loggedIn).toBe(true);
    expect(info.username).toBe('admin');
    expect(info.groups).toEqual(['admins']);
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

  it('fromCredentials session POST sends no Authorization header', async () => {
    mockJson({ token: 'jwt-token' });

    await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('refreshSession emits a request event on the client', async () => {
    mockJson({ token: 'initial-token' });
    mockJson({ token: 'refreshed-token' });

    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });

    const events: string[] = [];
    client.on('request', (e) => events.push(e.url));

    await client.refreshSession();

    expect(events).toHaveLength(1);
    expect(events[0]).toContain('/api/v1/session');
  });

  it('refreshSession sends no Authorization header during re-auth', async () => {
    mockJson({ token: 'initial-token' });
    mockJson({ token: 'refreshed-token' });

    const client = await ArgoCdClient.fromCredentials({
      baseUrl: 'https://argocd.example.com',
      username: 'admin',
      password: 'secret',
    });

    await client.refreshSession();

    // call index 1 is the refreshSession POST
    const headers = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  describe('VersionResource', () => {
    it('returns server version info', async () => {
      mockJson({
        Version: 'v2.9.3',
        BuildDate: '2024-01-15T12:00:00Z',
        GitCommit: 'f8dc03b',
        GitTag: 'v2.9.3',
        GoVersion: 'go1.21.4',
        Platform: 'linux/amd64',
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const version = await client.version.get();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/version');
      expect(version.Version).toBe('v2.9.3');
      expect(version.GitTag).toBe('v2.9.3');
      expect(version.Platform).toBe('linux/amd64');
    });
  });

  describe('SettingsResource', () => {
    it('returns server settings', async () => {
      mockJson({
        url: 'https://argocd.example.com',
        appLabelKey: 'app.kubernetes.io/name',
        statusBadgeEnabled: true,
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const settings = await client.settings.get();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/settings');
      expect(settings.url).toBe('https://argocd.example.com');
      expect(settings.appLabelKey).toBe('app.kubernetes.io/name');
      expect(settings.statusBadgeEnabled).toBe(true);
    });
  });

  describe('RepoCredsResource', () => {
    it('lists repository credential templates', async () => {
      mockJson({ items: [{ url: 'https://github.com/acme', username: 'bot' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const creds = await client.repoCreds.list();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/repocreds');
      expect(creds.items[0].url).toBe('https://github.com/acme');
    });

    it('creates a repository credential template', async () => {
      mockJson({ url: 'https://github.com/acme', username: 'bot' });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const cred = await client.repoCreds.create({
        url: 'https://github.com/acme',
        username: 'bot',
      });

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/repocreds');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(cred.url).toBe('https://github.com/acme');
    });

    it('deletes a repository credential template by URL', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.repoCreds.deleteByUrl('https://github.com/acme');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/repocreds/');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });
  });

  describe('CertificateResource', () => {
    it('lists repository certificates', async () => {
      mockJson({ items: [{ serverName: 'github.com', certType: 'ssh', certSubType: 'ssh-rsa' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const certs = await client.certificates.list();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/certificates');
      expect(certs.items?.[0].serverName).toBe('github.com');
      expect(certs.items?.[0].certType).toBe('ssh');
    });

    it('creates repository certificates', async () => {
      mockJson({ items: [{ serverName: 'gitlab.com', certType: 'https' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const result = await client.certificates.create([
        { serverName: 'gitlab.com', certType: 'https', certData: 'cert-pem-data' },
      ]);

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/certificates');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(result.items?.[0].serverName).toBe('gitlab.com');
    });

    it('deletes certificates with query param filters', async () => {
      mockJson({ items: [] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.certificates.delete({ hostNamePattern: 'github.com', certType: 'ssh' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/certificates');
      expect(url).toContain('hostNamePattern=github.com');
      expect(url).toContain('certType=ssh');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('deletes certificates with no filters when params omitted', async () => {
      mockJson({ items: [] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.certificates.delete();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/certificates');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });
  });

  describe('GpgKeyResource', () => {
    it('lists GPG keys', async () => {
      mockJson({ items: { A1B2C3D4: { keyID: 'A1B2C3D4', owner: 'alice', trust: 'ultimate' } } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const keys = await client.gpgKeys.list();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/gpgkeys');
      expect(keys.items?.['A1B2C3D4']?.owner).toBe('alice');
    });

    it('imports a GPG key', async () => {
      mockJson({ created: { A1B2C3D4: { keyID: 'A1B2C3D4', owner: 'alice' } }, skipped: [] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const result = await client.gpgKeys.create({
        keyData: '-----BEGIN PGP PUBLIC KEY BLOCK-----...',
      });

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/gpgkeys');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(result.created?.['A1B2C3D4']?.owner).toBe('alice');
      expect(result.skipped).toEqual([]);
    });

    it('imports a GPG key with upsert flag', async () => {
      mockJson({ created: { A1B2C3D4: { keyID: 'A1B2C3D4' } }, skipped: [] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.gpgKeys.create({ keyData: '...' }, { upsert: true });

      expect(mockFetch.mock.calls[0][0]).toContain('upsert=true');
    });

    it('deletes a GPG key by key ID', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.gpgKeys.deleteByKeyId('A1B2C3D4');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/gpgkeys/A1B2C3D4');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });
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

    it('returns events for a project', async () => {
      mockJson({
        items: [{ reason: 'Synced', message: 'Synced successfully', type: 'Normal', count: 1 }],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const events = await client.projects.events('default');

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://argocd.example.com/api/v1/projects/default/events',
      );
      expect(events).toHaveLength(1);
      expect(events[0].reason).toBe('Synced');
      expect(events[0].type).toBe('Normal');
    });

    it('returns empty events array when items absent for project', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const events = await client.projects.events('default');

      expect(events).toEqual([]);
    });

    it('returns repositories for a project', async () => {
      mockJson({ items: [{ repo: 'https://github.com/acme/app.git', type: 'git' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const repos = await client.projects.repositories('default');

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://argocd.example.com/api/v1/projects/default/repositories',
      );
      expect(repos.items[0].repo).toBe('https://github.com/acme/app.git');
    });

    it('lists tokens for an account', async () => {
      mockJson({ items: [{ id: 'tok-1', issuedAt: 1700000000, expiresAt: 1800000000 }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const tokens = await client.accounts.listTokens('admin');

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://argocd.example.com/api/v1/account/admin/tokens',
      );
      expect(tokens.items[0].id).toBe('tok-1');
      expect(tokens.items[0].issuedAt).toBe(1700000000);
    });

    it('creates an account token', async () => {
      mockJson({ token: 'eyJhb...', id: 'tok-new', issuedAt: 1700000000 });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const result = await client.accounts.createToken('admin', {
        expiresIn: '24h',
        id: 'tok-new',
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://argocd.example.com/api/v1/account/admin/token',
      );
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(result.token).toBe('eyJhb...');
      expect(result.id).toBe('tok-new');
    });

    it('creates an account token with defaults when no body given', async () => {
      mockJson({ token: 'eyJhb...', id: 'tok-new' });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.accounts.createToken('admin');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('invalidates cluster cache', async () => {
      mockJson({ name: 'in-cluster', server: 'https://kubernetes.default.svc' });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const cluster = await client.clusters.invalidateCache('https://kubernetes.default.svc');

      expect(mockFetch.mock.calls[0][0]).toContain(
        '/api/v1/clusters/https%3A%2F%2Fkubernetes.default.svc/invalidate-cache',
      );
      expect(cluster.name).toBe('in-cluster');
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

    it('updates an application via PUT', async () => {
      mockJson({ metadata: { name: 'guestbook' } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applications.update('guestbook', { metadata: { name: 'guestbook' } });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    });

    it('rolls back an application', async () => {
      mockJson({ metadata: { name: 'guestbook' } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applications.rollback('guestbook', { id: 3 });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/rollback');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('returns the resource tree', async () => {
      mockJson({ nodes: [{ kind: 'Deployment', name: 'guestbook' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const tree = await client.applications.resourceTree('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/resource-tree');
      expect(tree.nodes?.[0].kind).toBe('Deployment');
    });

    it('returns managed resources', async () => {
      mockJson({ items: [{ kind: 'Deployment', name: 'guestbook' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const resources = await client.applications.managedResources('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain(
        '/api/v1/applications/guestbook/managed-resources',
      );
      expect(resources[0].kind).toBe('Deployment');
    });

    it('returns empty array when managed-resources items is absent', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const resources = await client.applications.managedResources('guestbook');

      expect(resources).toEqual([]);
    });

    it('parses NDJSON logs and returns log entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            [
              JSON.stringify({ result: { content: 'line 1', podName: 'pod-abc' }, error: null }),
              JSON.stringify({ result: { content: 'line 2', podName: 'pod-abc' }, error: null }),
            ].join('\n'),
          ),
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const logs = await client.applications.logs('guestbook', { tailLines: 2 });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/logs');
      expect(logs).toHaveLength(2);
      expect(logs[0].content).toBe('line 1');
      expect(logs[1].content).toBe('line 2');
    });

    it('skips NDJSON lines with error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            [
              JSON.stringify({ result: { content: 'good line' }, error: null }),
              JSON.stringify({ result: null, error: 'EOF' }),
            ].join('\n'),
          ),
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
      const logs = await client.applications.logs('guestbook');

      expect(logs).toHaveLength(1);
      expect(logs[0].content).toBe('good line');
    });

    it('returns unique images from resource tree nodes', async () => {
      mockJson({
        nodes: [
          { kind: 'Deployment', name: 'api', images: ['my-app:v1', 'sidecar:latest'] },
          { kind: 'Pod', name: 'api-abc', images: ['my-app:v1'] },
        ],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const images = await client.applications.images('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/resource-tree');
      expect(images).toEqual(['my-app:v1', 'sidecar:latest']);
    });

    it('returns empty images array when nodes have no images', async () => {
      mockJson({ nodes: [{ kind: 'Deployment', name: 'api' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const images = await client.applications.images('guestbook');

      expect(images).toEqual([]);
    });

    it('returns pods parsed from managed resources liveState', async () => {
      const podManifest = {
        metadata: { name: 'api-abc123', namespace: 'default' },
        spec: {
          nodeName: 'node-1',
          containers: [{ name: 'api', image: 'my-app:v1' }],
        },
        status: {
          phase: 'Running',
          containerStatuses: [
            { name: 'api', ready: true, restartCount: 2, state: { running: {} } },
          ],
        },
      };
      mockJson({
        items: [{ kind: 'Pod', name: 'api-abc123', liveState: JSON.stringify(podManifest) }],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const pods = await client.applications.pods('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain(
        '/api/v1/applications/guestbook/managed-resources',
      );
      expect(mockFetch.mock.calls[0][0]).toContain('kind=Pod');
      expect(pods).toHaveLength(1);
      expect(pods[0].name).toBe('api-abc123');
      expect(pods[0].phase).toBe('Running');
      expect(pods[0].nodeName).toBe('node-1');
      expect(pods[0].containers[0].name).toBe('api');
      expect(pods[0].containers[0].image).toBe('my-app:v1');
      expect(pods[0].containers[0].ready).toBe(true);
      expect(pods[0].containers[0].restartCount).toBe(2);
    });

    it('skips managed resources without liveState when returning pods', async () => {
      mockJson({ items: [{ kind: 'Pod', name: 'api-abc123' }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const pods = await client.applications.pods('guestbook');

      expect(pods).toEqual([]);
    });

    it('returns containers flattened from pods with podName back-reference', async () => {
      const podManifest = {
        metadata: { name: 'api-abc123', namespace: 'default' },
        spec: {
          containers: [
            { name: 'api', image: 'my-app:v1' },
            { name: 'sidecar', image: 'proxy:v2' },
          ],
        },
        status: { phase: 'Running', containerStatuses: [] },
      };
      mockJson({ items: [{ kind: 'Pod', liveState: JSON.stringify(podManifest) }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const containers = await client.applications.containers('guestbook');

      expect(containers).toHaveLength(2);
      expect(containers[0].name).toBe('api');
      expect(containers[0].podName).toBe('api-abc123');
      expect(containers[1].name).toBe('sidecar');
      expect(containers[1].podName).toBe('api-abc123');
    });

    it('returns nodes with OS info from resource tree hosts', async () => {
      mockJson({
        nodes: [],
        hosts: [
          {
            name: 'node-1',
            systemInfo: {
              osImage: 'Ubuntu 22.04 LTS',
              operatingSystem: 'linux',
              architecture: 'amd64',
              kernelVersion: '5.15.0',
              containerRuntimeVersion: 'containerd://1.7.0',
              kubeletVersion: 'v1.28.0',
            },
          },
        ],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const nodes = await client.applications.nodes('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/resource-tree');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('node-1');
      expect(nodes[0].osImage).toBe('Ubuntu 22.04 LTS');
      expect(nodes[0].operatingSystem).toBe('linux');
      expect(nodes[0].architecture).toBe('amd64');
      expect(nodes[0].kernelVersion).toBe('5.15.0');
      expect(nodes[0].containerRuntimeVersion).toBe('containerd://1.7.0');
      expect(nodes[0].kubeletVersion).toBe('v1.28.0');
    });

    it('returns empty nodes array when hosts is absent', async () => {
      mockJson({ nodes: [] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const nodes = await client.applications.nodes('guestbook');

      expect(nodes).toEqual([]);
    });

    it('returns health status from application status.health', async () => {
      mockJson({ status: { health: { status: 'Degraded', message: 'OOMKilled' } } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const health = await client.applications.health('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook');
      expect(health.status).toBe('Degraded');
      expect(health.message).toBe('OOMKilled');
    });

    it('returns Unknown health status when status.health is absent', async () => {
      mockJson({ status: {} });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const health = await client.applications.health('guestbook');

      expect(health.status).toBe('Unknown');
      expect(health.message).toBeUndefined();
    });

    it('returns only resources with differing live and normalized state', async () => {
      mockJson({
        items: [
          { kind: 'Deployment', name: 'api', liveState: '{"x":1}', normalizedLiveState: '{"x":2}' },
          {
            kind: 'Service',
            name: 'api-svc',
            liveState: '{"x":1}',
            normalizedLiveState: '{"x":1}',
          },
          { kind: 'ConfigMap', name: 'cfg' },
        ],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const diffs = await client.applications.diff('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain(
        '/api/v1/applications/guestbook/managed-resources',
      );
      expect(diffs).toHaveLength(1);
      expect(diffs[0].name).toBe('api');
    });

    it('returns events from the events endpoint', async () => {
      mockJson({
        items: [
          { reason: 'Pulled', message: 'Image pulled', type: 'Normal', count: 1 },
          { reason: 'OOMKilling', message: 'Out of memory', type: 'Warning', count: 3 },
        ],
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const events = await client.applications.events('guestbook');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applications/guestbook/events');
      expect(events).toHaveLength(2);
      expect(events[0].reason).toBe('Pulled');
      expect(events[0].type).toBe('Normal');
      expect(events[1].reason).toBe('OOMKilling');
      expect(events[1].count).toBe(3);
    });

    it('returns empty events array when items is absent', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const events = await client.applications.events('guestbook');

      expect(events).toEqual([]);
    });

    it('updates a cluster via PUT', async () => {
      mockJson({ name: 'prod', server: 'https://prod.k8s.io' });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.clusters.update('https://prod.k8s.io', { name: 'prod' });

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/clusters/');
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    });

    it('returns repository refs', async () => {
      mockJson({ branches: ['main', 'develop'], tags: ['v1.0.0'] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const refs = await client.repositories.refs('https://github.com/acme/app.git');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/repositories/');
      expect(mockFetch.mock.calls[0][0]).toContain('/refs');
      expect(refs.branches).toEqual(['main', 'develop']);
      expect(refs.tags).toEqual(['v1.0.0']);
    });

    it('lists ApplicationSets', async () => {
      mockJson({ items: [{ metadata: { name: 'my-set' } }] });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      const sets = await client.applicationSets.list();

      expect(mockFetch.mock.calls[0][0]).toBe('https://argocd.example.com/api/v1/applicationsets');
      expect(sets.items[0].metadata?.name).toBe('my-set');
    });

    it('gets an ApplicationSet', async () => {
      mockJson({ metadata: { name: 'my-set' } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applicationSets.get('my-set');

      expect(mockFetch.mock.calls[0][0]).toContain('/api/v1/applicationsets/my-set');
    });

    it('creates an ApplicationSet', async () => {
      mockJson({ metadata: { name: 'my-set' } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applicationSets.create({ metadata: { name: 'my-set' } });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('updates an ApplicationSet', async () => {
      mockJson({ metadata: { name: 'my-set' } });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applicationSets.update('my-set', { metadata: { name: 'my-set' } });

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    });

    it('deletes an ApplicationSet', async () => {
      mockJson({});
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });

      await client.applicationSets.deleteByName('my-set');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    });

    it('emits request event for logs (ndJson path)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: { content: 'hello' }, error: null })),
      });
      const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt' });
      const events: import('./ArgoCdClient').RequestEvent[] = [];

      client.on('request', (e) => events.push(e));

      await client.applications.logs('guestbook');

      expect(events).toHaveLength(1);
      expect(events[0].method).toBe('GET');
      expect(events[0].statusCode).toBe(200);
    });
  });
});
