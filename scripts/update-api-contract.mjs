import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractContractOperations } from './api-contract.mjs';

const [, , version] = process.argv;

if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Usage: npm run contract:update -- vMAJOR.MINOR.PATCH');
}

const source = `https://raw.githubusercontent.com/argoproj/argo-cd/${version}/assets/swagger.json`;
const response = await fetch(source);

if (!response.ok) {
  throw new Error(`Failed to download ${source}: ${response.status} ${response.statusText}`);
}

const body = await response.text();
const swagger = JSON.parse(body);
const snapshot = {
  schemaVersion: 1,
  argoCdVersion: version,
  source,
  sha256: createHash('sha256').update(body).digest('hex'),
  operations: extractContractOperations(swagger),
};
const output = new URL('../contracts/argocd/api-contract.json', import.meta.url);

await mkdir(fileURLToPath(new URL('.', output)), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(
  `Pinned ${snapshot.operations.length} Argo CD ${version} operations ` +
    `(sha256 ${snapshot.sha256}).`,
);
