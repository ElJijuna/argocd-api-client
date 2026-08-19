import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compareOperations, extractClientOperations } from './api-contract.mjs';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const contractPath = new URL('../contracts/argocd/api-contract.json', import.meta.url);
const knownMismatchesPath = new URL('../contracts/argocd/known-mismatches.json', import.meta.url);
const [contract, knownMismatches] = await Promise.all(
  [contractPath, knownMismatchesPath].map(async (file) => JSON.parse(await readFile(file, 'utf8'))),
);
const client = await extractClientOperations(rootDir);

if (client.unresolved.length > 0) {
  const details = client.unresolved
    .map(
      (item) =>
        `- ${item.location} ${item.source} has an unresolved request mapping: ${item.expression}`,
    )
    .join('\n');

  throw new Error(`Could not inspect every client request mapping:\n${details}`);
}

const errors = compareOperations(client.operations, contract.operations, contract.argoCdVersion);
const knownByKey = new Map(
  knownMismatches.mismatches.map((mismatch) => [
    `${mismatch.source}|${mismatch.method}|${mismatch.normalizedPath}`,
    mismatch,
  ]),
);
const currentKeys = new Set(errors.map((error) => error.key));
const unexpected = errors.filter((error) => !knownByKey.has(error.key));
const stale = [...knownByKey.entries()].filter(([key]) => !currentKeys.has(key));

if (unexpected.length > 0 || stale.length > 0) {
  const details = [
    ...unexpected.map((error) => `- Unexpected mismatch: ${error.message}`),
    ...stale.map(
      ([, mismatch]) =>
        `- Stale known mismatch: ${mismatch.source} ${mismatch.method} ${mismatch.normalizedPath}`,
    ),
  ].join('\n');

  throw new Error(`Argo CD API contract mismatches:\n${details}`);
}

console.log(
  `Validated ${client.operations.length} client mappings against ${contract.operations.length} ` +
    `Argo CD ${contract.argoCdVersion} operations; ${errors.length} known mismatches remain.`,
);
