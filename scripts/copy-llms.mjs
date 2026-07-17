import { copyFile, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const docs = new URL('../docs/', import.meta.url);

await copyFile(new URL('llms.txt', root), new URL('llms.txt', docs));

const fullSources = [
  ['LLM index', 'llms.txt'],
  ['README', 'README.md'],
  ['Architecture', 'ARCHITECTURE.md'],
  ['Roadmap', 'ROADMAP.md'],
];
const fullContents = await Promise.all(
  fullSources.map(async ([title, path]) => {
    const content = await readFile(new URL(path, root), 'utf8');

    return `# ${title}\n\n${content.trim()}\n`;
  }),
);

await writeFile(new URL('llms-full.txt', docs), fullContents.join('\n---\n\n'));

console.log('Generated llms.txt and llms-full.txt documentation.');
