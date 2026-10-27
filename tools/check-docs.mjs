import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (extname(entry.name) === '.md') files.push(path);
  }
  return files;
}
const files = (await readdir(root)).filter(name => name.endsWith('.md')).map(name => join(root, name));
for (const directory of ['docs', '.github', 'resources/ffmpeg']) files.push(...await markdownFiles(join(root, directory)));
const failures = [];
let count = 0;
for (const file of files) {
  const source = (await readFile(file, 'utf8')).replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  const targets = [...source.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)].map(match => match[1]);
  targets.push(...[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]));
  for (const target of targets) {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) continue;
    const path = decodeURIComponent(target.replace(/^<|>$/g, '').split(/[?#]/)[0]);
    if (!path) continue;
    count++;
    try { await access(resolve(dirname(file), path)); }
    catch { failures.push(`${file.slice(root.length + 1)}: ${target}`); }
  }
}
if (failures.length) throw new Error(`Broken local documentation links:\n${failures.join('\n')}`);
console.log(`Checked ${count} local links in ${files.length} Markdown documents.`);
