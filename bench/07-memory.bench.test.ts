import { ArgoCdClient } from '../src/ArgoCdClient';
import { applicationList, makeMockResponse } from './fixtures';

const gc = (globalThis as unknown as { gc?: () => void }).gc;

function forceGc(): void {
  if (gc) {
    gc();
    gc();
  }
}

function formatBytes(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (abs >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n.toFixed(0)} B`;
}

function measureHeap(label: string, fn: () => void, iterations = 10_000): void {
  for (let i = 0; i < Math.floor(iterations / 10); i++) fn();
  forceGc();

  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < iterations; i++) fn();
  forceGc();
  const after = process.memoryUsage().heapUsed;

  const heapDelta = after - before;
  const bytesPerOp = heapDelta / iterations;
  const gcNote = gc ? '' : ' (approx; run with --expose-gc for precision)';

  console.log(
    `  ${label}\n` +
      `    heap delta ${formatBytes(heapDelta)} | ~${bytesPerOp.toFixed(1)} bytes/op${gcNote}`,
  );
}

async function measureHeapAsync(
  label: string,
  fn: () => Promise<unknown>,
  iterations = 1_000,
): Promise<void> {
  for (let i = 0; i < Math.floor(iterations / 10); i++) await fn();
  forceGc();

  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < iterations; i++) await fn();
  forceGc();
  const after = process.memoryUsage().heapUsed;

  const heapDelta = after - before;
  const bytesPerOp = heapDelta / iterations;
  const gcNote = gc ? '' : ' (approx)';

  console.log(
    `  ${label}\n` +
      `    heap delta ${formatBytes(heapDelta)} | ~${bytesPerOp.toFixed(1)} bytes/op${gcNote}`,
  );
}

describe('07 - Memory and GC pressure', () => {
  beforeAll(() => {
    jest.setTimeout(120_000);
    console.log(`\n07 - Memory and GC pressure [${gc ? 'GC forced' : 'approximate'}]`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('client construction heap cost', () => {
    measureHeap('new ArgoCdClient() x10k', () => {
      new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });
    });
  });

  it('applications.list() heap cost', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(applicationList)));
    const client = new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: 'jwt-token' });

    await measureHeapAsync('applications.list() x1k', () => client.applications.list());
  });

  it('clients are collectible after scope ends', () => {
    const instances = 500;
    forceGc();
    const before = process.memoryUsage().heapUsed;

    for (let i = 0; i < instances; i++) {
      new ArgoCdClient({ baseUrl: 'https://argocd.example.com', token: `token-${i}` });
    }

    forceGc();
    const after = process.memoryUsage().heapUsed;
    const retained = after - before;

    console.log(`  client leak check\n    retained after GC: ${formatBytes(retained)}`);
    expect(retained / instances).toBeLessThan(gc ? 1024 : 8192);
  });
});
