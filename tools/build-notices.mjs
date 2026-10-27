import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const supplemental = JSON.parse(await readFile(join(root, 'resources/licenses/manifest.json'), 'utf8'));
const sections = ['AlgorithAct bundled JavaScript dependency notices',
  'Generated from the installed production dependencies in package-lock.json.',
  'Electron/Chromium, Geist fonts and FFmpeg retain their separately shipped notices.'];
let count = 0;
for (const [path, entry] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  if (!path || entry.dev || entry.devOptional) continue;
  const directory = join(root, path);
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  if (metadata.version !== entry.version) throw new Error(`Run npm ci: ${path} differs from the lockfile.`);
  const files = (await readdir(directory)).filter(name => /^(licen[cs]e|copying|notice)([._-].*)?$/i.test(name)).sort();
  sections.push(`\n${'='.repeat(72)}\n${metadata.name}@${metadata.version}\nLicense: ${metadata.license ?? entry.license ?? 'See text below'}`);
  if (!files.length) {
    const notice = supplemental[metadata.name];
    if (!notice || notice.version !== metadata.version) throw new Error(`Missing license text for ${metadata.name}. Review its package before distributing.`);
    sections.push(`Upstream license: ${notice.source}\n${await readFile(join(root, 'resources/licenses', notice.file), 'utf8')}`);
  }
  for (const file of files) sections.push(`\n--- ${file} ---\n${await readFile(join(directory, file), 'utf8')}`);
  count++;
}
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'THIRD_PARTY_LICENSES.txt'), sections.join('\n') + '\n');
await Promise.all(['LICENSE', 'THIRD_PARTY_NOTICES.md'].map(file => readFile(join(root, file)).then(bytes => writeFile(join(root, 'dist', file), bytes))));
console.log(`Bundled license texts for ${count} production dependencies.`);
