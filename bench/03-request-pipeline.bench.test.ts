import { ArgoCdClient } from '../src/ArgoCdClient';
import { applicationList, emptyObject, makeMockResponse, session } from './fixtures';
import { runBenchAsync } from './helpers';

const ITERATIONS = 1_000;

describe('03 - Request pipeline (mocked fetch)', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n03 - Request pipeline (mocked fetch)');
  });

  it('applications.list() GET', async () => {
    const fetch = () => Promise.resolve(makeMockResponse(applicationList));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      token: 'jwt-token',
      fetch,
    });

    await runBenchAsync('applications.list()', () => client.applications.list(), ITERATIONS);
  });

  it('createSession() POST', async () => {
    const fetch = () => Promise.resolve(makeMockResponse(session));
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', fetch });

    await runBenchAsync(
      'createSession()',
      () => client.createSession({ username: 'admin', password: 'secret' }),
      ITERATIONS,
    );
  });

  it('applications.sync() POST body', async () => {
    const fetch = () => Promise.resolve(makeMockResponse(applicationList.items[0]));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      token: 'jwt-token',
      fetch,
    });

    await runBenchAsync(
      'applications.sync()',
      () => client.applications.sync('guestbook', { revision: 'main' }),
      ITERATIONS,
    );
  });

  it('applications.deleteByName() DELETE', async () => {
    const fetch = () => Promise.resolve(makeMockResponse(emptyObject));
    const client = new ArgoCdClient({
      baseUrl: 'https://argocd.example.com',
      token: 'jwt-token',
      fetch,
    });

    await runBenchAsync(
      'applications.deleteByName()',
      () => client.applications.deleteByName('guestbook'),
      ITERATIONS,
    );
  });
});
