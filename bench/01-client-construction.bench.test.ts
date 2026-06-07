import { ArgoCdClient } from '../src/ArgoCdClient';
import { runBench } from './helpers';

describe('01 - Client construction', () => {
  beforeAll(() => console.log('\n01 - Client construction'));

  it('new ArgoCdClient() without token', () => {
    runBench('new ArgoCdClient({ baseUrl })', () => {
      new ArgoCdClient({ baseUrl: 'https://argocd.example.com' });
    });
  });

  it('new ArgoCdClient() with token', () => {
    runBench('new ArgoCdClient({ baseUrl, token })', () => {
      new ArgoCdClient({
        baseUrl: 'https://argocd.example.com',
        token: 'jwt-token',
      });
    });
  });
});
