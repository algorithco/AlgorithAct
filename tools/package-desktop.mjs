import { packager } from '@electron/packager';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureFfmpegBundle } from './ffmpeg-bundle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.platform, architecture = process.arch;
if (!['win32', 'darwin', 'linux'].includes(platform) || !['x64', 'arm64'].includes(architecture)) throw new Error('Desktop packaging requires Windows, macOS or Linux on x64/ARM64.');
const variantIndex = process.argv.indexOf('--variant'), variant = variantIndex < 0 ? undefined : process.argv[variantIndex + 1];
if (variantIndex >= 0 && (!variant || !/^[a-z][a-z0-9-]{0,47}$/.test(variant) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(variant))) throw new Error('Invalid package variant.');
const output = variant ? join(root, 'release', variant) : join(root, 'release');
const target = join(output, `AlgorithAct-${platform}-${architecture}`);
if (relative(output, target).startsWith('..') || dirname(target) !== output) throw new Error('Invalid package output path.');
const ffmpeg = await ensureFfmpegBundle(root, platform, architecture);
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const electron = JSON.parse(await readFile(join(root, 'node_modules/electron/package.json'), 'utf8'));
await Promise.all(['dist/index.html', 'dist-electron/main.cjs'].map(path => stat(join(root, path))));
const stagingRoot = join(root, '.qa');
await mkdir(stagingRoot, { recursive: true });
const stage = await mkdtemp(join(stagingRoot, 'package-stage-'));
if (dirname(stage) !== stagingRoot || !relative(stagingRoot, stage).startsWith('package-stage-')) throw new Error('Invalid staging cleanup path.');
try {
  const app = join(stage, 'app'), runtime = join(stage, 'ffmpeg');
  await mkdir(app);
  for (const folder of ['dist', 'dist-electron']) await cp(join(root, folder), join(app, folder), { recursive: true, filter: path => !path.endsWith('.map') });
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) await cp(join(root, file), join(app, file));
  const sourceBuilt = Boolean(ffmpeg.manifest.sourceLockSha256);
  const runtimeFiles = new Set([...ffmpeg.manifest.files.map(file => file.name), 'BUILD-MANIFEST.json', 'SOURCE-BUILD.txt', 'LICENSES']);
  await cp(ffmpeg.target, join(runtime, `${platform}-${architecture}`), { recursive: true, filter: path => !sourceBuilt || path === ffmpeg.target || runtimeFiles.has(relative(ffmpeg.target, path).split(/[\\/]/)[0]) });
  const { name, productName, version, description, main, type, license, author, repository } = metadata;
  await writeFile(join(app, 'package.json'), JSON.stringify({ name, productName, version, description, main, type, license, author, repository, private: true }, null, 2) + '\n');
  const extension = platform === 'darwin' ? 'icns' : platform === 'win32' ? 'ico' : 'png';
  const paths = await packager({
    dir: app, out: output, name: 'AlgorithAct', executableName: 'AlgorithAct',
    platform, arch: architecture, electronVersion: electron.version,
    appVersion: version, buildVersion: version, appBundleId: 'com.algorithact.desktop',
    icon: join(root, 'public/brand', platform === 'linux' ? 'algorithact-desktop.png' : `algorithact.${extension}`),
    asar: true, prune: false, overwrite: true, extraResource: runtime,
    ...(platform === 'win32' ? { win32metadata: { CompanyName: 'Algorithco', FileDescription: 'AlgorithAct', InternalName: 'AlgorithAct', OriginalFilename: 'AlgorithAct.exe', ProductName: 'AlgorithAct' } } : {}),
  });
  console.log(`Desktop app: ${paths[0]}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
