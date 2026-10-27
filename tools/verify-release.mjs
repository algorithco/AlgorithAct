import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const directory = 'release/assets';
const names = (await readdir(directory)).sort();
const expected = [
  `AlgorithAct-Setup-${version}-x64.exe`,
  ...['x64', 'arm64'].flatMap(arch => [
    `AlgorithAct-${version}-macOS-${arch}.dmg`, `AlgorithAct-${version}-macOS-${arch}.zip`,
    `AlgorithAct-${version}-Linux-${arch}.AppImage`, `AlgorithAct-${version}-Linux-${arch}.tar.gz`,
  ]),
  `AlgorithAct-FFmpeg-Sources-${version}.tar.gz`,
];
for (const name of expected) if (!names.includes(name)) throw new Error(`Release is incomplete: ${name}`);
for (const name of names) if (!expected.includes(name)) throw new Error(`Unexpected release file: ${name}`);
const checksums = [];
for (const name of names) {
  const bytes = await readFile(join(directory, name));
  if (bytes.byteLength < 1000) throw new Error(`Empty or truncated artifact: ${name}`);
  checksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
}
await writeFile(join(directory, 'SHA256SUMS.txt'), checksums.join('\n') + '\n');
console.log(`Verified ${names.length} release assets and generated SHA256SUMS.txt.`);
