import { ArgoCdClient } from '../src/ArgoCdClient';
import { makeMockResponse } from './fixtures';
import { runBenchAsync } from './helpers';

const ITERATIONS = 1_000;

describe('05 - Error path', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n05 - Error path');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applications.get() 404', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse({ error: 'not found' }, 404)));
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await runBenchAsync(
      'applications.get() 404',
      async () => {
        try {
          await client.applications.get('missing');
        } catch {
          /* expected */
        }
      },
      ITERATIONS,
    );
  });
});
