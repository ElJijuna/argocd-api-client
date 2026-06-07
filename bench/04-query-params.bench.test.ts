import { ArgoCdClient } from '../src/ArgoCdClient';
import { applicationList, makeMockResponse } from './fixtures';
import { runBenchAsync } from './helpers';

const ITERATIONS = 1_000;

describe('04 - Query params', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n04 - Query params');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applications.list() with repeated project params and selector', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(applicationList)));
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await runBenchAsync(
      'applications.list({ project: [2], selector })',
      () =>
        client.applications.list({
          project: ['default', 'platform'],
          selector: 'team=platform,env=prod',
          repo: 'https://github.com/argoproj/argocd-example-apps.git',
        }),
      ITERATIONS,
    );
  });
});
