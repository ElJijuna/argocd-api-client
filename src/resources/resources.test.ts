import * as publicApi from '../index';
import { ArgoCdClient } from '../index';

describe('resource endpoint mapping', () => {
  it('exposes every public resource class', () => {
    expect([
      publicApi.AccountResource,
      publicApi.ApplicationResource,
      publicApi.ApplicationSetResource,
      publicApi.CertificateResource,
      publicApi.ClusterResource,
      publicApi.GpgKeyResource,
      publicApi.ProjectResource,
      publicApi.RepoCredsResource,
      publicApi.RepositoryResource,
      publicApi.SettingsResource,
      publicApi.VersionResource,
    ]).not.toContain(undefined);
  });

  it('maps representative resources through the shared transport', async () => {
    const transport = jest.fn(
      async (_input: string | URL | Request) =>
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });

    await client.applications.list();
    await client.projects.list();
    await client.repositories.list();

    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      'https://argocd.example.com/api/v1/applications',
      'https://argocd.example.com/api/v1/projects',
      'https://argocd.example.com/api/v1/repositories',
    ]);
  });

  it('covers optional resource defaults and empty response shapes', async () => {
    const podManifest = JSON.stringify({ metadata: { name: 'pod' }, spec: {}, status: {} });
    const responses = [
      {},
      {},
      {},
      {},
      { items: [{ liveState: podManifest }] },
      { hosts: [{ name: 'node' }] },
      {},
      {},
      {},
    ];
    const transport = jest.fn(
      async () =>
        new Response(JSON.stringify(responses.shift()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      fetch: transport as typeof fetch,
    });

    await client.applications.get('app');
    await client.applications.sync('app');
    await client.applications.rollback('app');
    await expect(client.applications.images('app')).resolves.toEqual([]);
    await expect(client.applications.pods('app')).resolves.toMatchObject([
      { name: 'pod', containers: [] },
    ]);
    await expect(client.applications.nodes('app')).resolves.toMatchObject([{ name: 'node' }]);
    await client.applications.deleteResource('app');
    await client.applications.deleteResource('app', { kind: undefined });
    await client.certificates.delete({ certSubType: 'ssh-rsa' });

    expect(transport).toHaveBeenCalledTimes(9);
  });
});
