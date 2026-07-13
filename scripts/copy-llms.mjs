import { copyFile } from 'node:fs/promises';

await copyFile(
  new URL('../llms.txt', import.meta.url),
  new URL('../docs/llms.txt', import.meta.url),
);

console.log('Copied llms.txt to generated documentation.');
