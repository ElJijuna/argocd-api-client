import { readFile } from 'node:fs/promises';

const [architecture, client, readme, llms] = await Promise.all([
  readFile(new URL('../ARCHITECTURE.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/ArgoCdClient.ts', import.meta.url), 'utf8'),
  readFile(new URL('../README.md', import.meta.url), 'utf8'),
  readFile(new URL('../llms.txt', import.meta.url), 'utf8'),
]);
const resources = [...client.matchAll(/readonly (\w+): \w+Resource;/g)].map((match) => match[1]);
const missing = resources.filter((resource) => !architecture.includes(`\`${resource}\``));

if (!architecture.includes('```mermaid\n') || !/flowchart (?:LR|TB)/.test(architecture)) {
  throw new Error('ARCHITECTURE.md must contain a Mermaid flowchart.');
}

if (missing.length > 0) {
  throw new Error(`ARCHITECTURE.md is missing client resources: ${missing.join(', ')}`);
}

if (!readme.includes('[Architecture](ARCHITECTURE.md)')) {
  throw new Error('README.md must link to ARCHITECTURE.md.');
}

if (!llms.startsWith('# argocd-api-client\n')) {
  throw new Error('llms.txt must start with the package name as its H1.');
}

for (const requiredUrl of [
  'https://eljijuna.github.io/argocd-api-client/',
  'https://github.com/ElJijuna/argocd-api-client/blob/main/README.md',
  'https://github.com/ElJijuna/argocd-api-client/blob/main/ARCHITECTURE.md',
]) {
  if (!llms.includes(requiredUrl)) {
    throw new Error(`llms.txt is missing required URL: ${requiredUrl}`);
  }
}

for (const [name, content] of [
  ['ARCHITECTURE.md', architecture],
  ['README.md', readme],
  ['llms.txt', llms],
]) {
  if (!content.startsWith('# ')) {
    throw new Error(`${name} must start with one H1 heading.`);
  }

  if (/ +$/m.test(content)) {
    throw new Error(`${name} contains trailing whitespace.`);
  }

  if ((content.match(/^```/gm)?.length ?? 0) % 2 !== 0) {
    throw new Error(`${name} contains an unclosed fenced code block.`);
  }
}

console.log(`Architecture documentation covers ${resources.length} client resources.`);
