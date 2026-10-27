import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = `${process.platform}-${process.arch}`;
if (!['win32-x64', 'darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64'].includes(target)) throw new Error(`No source-build configuration for ${target}.`);
const sourceLock = await readFile(join(root, 'resources/ffmpeg/sources.json'));
const sources = JSON.parse(sourceLock);
const sourceDirectory = join(root, '.qa/ffmpeg-sources');
const build = join(root, '.qa/ffmpeg-build', target);
const prefix = join(build, 'install');
await mkdir(sourceDirectory, { recursive: true });
await mkdir(build, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
}
for (const source of sources) {
  const archive = join(sourceDirectory, `${source.name}.tar.gz`);
  let bytes;
  try { bytes = await readFile(archive); } catch { /* Download only a missing source archive. */ }
  if (!bytes || digest(bytes) !== source.sha256) {
    console.log(`Downloading pinned ${source.name} source (${source.revision})...`);
    const response = await fetch(`https://codeload.github.com/${source.repository}/tar.gz/${source.revision}`, { signal: AbortSignal.timeout(300_000) });
    if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (digest(bytes) !== source.sha256) throw new Error(`${source.name} source checksum mismatch.`);
    await writeFile(archive, bytes);
  }
  if (!process.argv.includes('--sources-only')) {
    const directory = join(build, source.name);
    await mkdir(directory, { recursive: true });
    run('tar', ['-xzf', archive, '-C', directory, '--strip-components=1']);
  }
}
if (process.argv.includes('--sources-only')) {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  await mkdir(join(root, 'release/installer'), { recursive: true });
  run('tar', ['-czf', join(root, 'release/installer', `AlgorithAct-FFmpeg-Sources-${version}.tar.gz`), '-C', root, 'resources/ffmpeg/sources.json', 'resources/ffmpeg/README.md', 'tools/build-ffmpeg.mjs', 'tools/compile-ffmpeg.sh', '.qa/ffmpeg-sources']);
} else {
  run('bash', [join(root, 'tools/compile-ffmpeg.sh'), build, prefix]);
  const directory = join(root, 'resources/ffmpeg', target);
  await mkdir(join(directory, 'LICENSES'), { recursive: true });
  const extension = process.platform === 'win32' ? '.exe' : '';
  const files = [];
  for (const name of [`ffmpeg${extension}`, `ffprobe${extension}`]) {
    const destination = join(directory, name);
    await copyFile(join(prefix, 'bin', name), destination);
    await chmod(destination, 0o755);
    files.push({ name, bytes: (await stat(destination)).size, sha256: digest(await readFile(destination)) });
  }
  for (const [name, license] of [['ffmpeg', 'COPYING.LGPLv2.1'], ['ffmpeg', 'COPYING.LGPLv3'], ['ffmpeg', 'COPYING.GPLv3'], ['openh264', 'LICENSE'], ['libvpx', 'LICENSE'], ['libvpx', 'PATENTS'], ['opus', 'COPYING']]) {
    await copyFile(join(build, name, license), join(directory, 'LICENSES', `${name}-${license.replaceAll('/', '-')}.txt`));
  }
  const binary = join(directory, `ffmpeg${extension}`);
  const configuration = spawnSync(binary, ['-buildconf'], { encoding: 'utf8', windowsHide: true });
  if (configuration.error || configuration.status !== 0) throw new Error('The compiled FFmpeg cannot start.');
  await writeFile(join(directory, 'SOURCE-BUILD.txt'), `AlgorithAct FFmpeg source build: ${target}\nFFmpeg and codecs are unmodified external executables.\nSources and build instructions accompany the GitHub release in AlgorithAct-FFmpeg-Sources-<version>.tar.gz.\n\n${sourceLock.toString()}\n${configuration.stdout}${configuration.stderr}`);
  await writeFile(join(directory, 'BUILD-MANIFEST.json'), JSON.stringify({ platform: process.platform, arch: process.arch, version: sources[0].revision, sourceLockSha256: digest(sourceLock), license: 'LGPL-2.1-or-later', files }, null, 2) + '\n');
  console.log(`Built and verified ${target} FFmpeg/FFprobe.`);
}
