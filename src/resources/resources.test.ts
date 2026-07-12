import { ArgoCdClient } from '../index';

describe('resource endpoint mapping', () => {
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
});
