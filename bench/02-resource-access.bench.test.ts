import { ArgoCdClient } from '../src/ArgoCdClient';
import { runBench } from './helpers';

describe('02 - Resource access', () => {
  beforeAll(() => console.log('\n02 - Resource access'));

  it('reads existing resource properties', () => {
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    runBench('client resource property reads', () => {
      const resources = [
        client.applications,
        client.projects,
        client.repositories,
        client.clusters,
        client.accounts,
      ];

      if (resources.length !== 5) {
        throw new Error('unexpected resource count');
      }
    });
  });
});
