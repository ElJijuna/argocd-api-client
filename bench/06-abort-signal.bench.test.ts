import { ArgoCdClient } from '../src/ArgoCdClient';
import { applicationList, makeMockResponse } from './fixtures';
import { runBenchAsync } from './helpers';

const ITERATIONS = 1_000;

describe('06 - AbortSignal', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n06 - AbortSignal');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applications.list() with AbortSignal', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(applicationList)));
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });
    const controller = new AbortController();

    await runBenchAsync(
      'applications.list({}, signal)',
      () => client.applications.list({}, controller.signal),
      ITERATIONS,
    );
  });
});
