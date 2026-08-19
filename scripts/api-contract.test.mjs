import assert from 'node:assert/strict';
import test from 'node:test';
import { compareOperations, extractOperationsFromSource, normalizeRoute } from './api-contract.mjs';

test('normalizes route parameter names and query strings', () => {
  assert.equal(
    normalizeRoute('/api/v1/clusters/{id.value}/invalidate-cache?refresh=true'),
    '/api/v1/clusters/{}/invalidate-cache',
  );
});

test('extracts direct and locally composed resource mappings', () => {
  const source = `
    class ExampleResource {
      async get(name: string) {
        return this.request(\`/api/v1/examples/\${encodeURIComponent(name)}\`);
      }

      async update(name: string, params: object) {
        const path = appendQuery(\`/api/v1/examples/\${encodeURIComponent(name)}\`, params);
        return this.post(path, {});
      }
    }
  `;
  const result = extractOperationsFromSource(source, 'ExampleResource.ts');

  assert.deepEqual(
    result.operations.map(({ method, normalizedPath }) => ({ method, normalizedPath })),
    [
      { method: 'GET', normalizedPath: '/api/v1/examples/{}' },
      { method: 'POST', normalizedPath: '/api/v1/examples/{}' },
    ],
  );
  assert.deepEqual(result.unresolved, []);
});

test('reports an actionable HTTP method mismatch', () => {
  const errors = compareOperations(
    [
      {
        method: 'GET',
        path: '/api/v1/clusters/{server}/invalidate-cache',
        normalizedPath: '/api/v1/clusters/{}/invalidate-cache',
        source: 'ClusterResource.invalidateCache',
        location: 'src/resources/ClusterResource.ts:56',
      },
    ],
    [{ method: 'POST', path: '/api/v1/clusters/{id.value}/invalidate-cache' }],
    'v3.5.1',
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /maps GET/);
  assert.match(errors[0].message, /defines POST/);
  assert.match(errors[0].message, /ClusterResource\.invalidateCache/);
  assert.equal(
    errors[0].key,
    'ClusterResource.invalidateCache|GET|/api/v1/clusters/{}/invalidate-cache',
  );
});
