import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.platform, arch = process.arch;
const targets = { win32: ['--win', 'nsis'], darwin: ['--mac', 'dmg', 'zip'], linux: ['--linux', 'AppImage', 'tar.gz'] };
if (!targets[platform] || !['x64', 'arm64'].includes(arch)) throw new Error('Unsupported installer target.');
const prepackaged = `release/AlgorithAct-${platform}-${arch}${platform === 'darwin' ? '/AlgorithAct.app' : ''}`;
const result = spawnSync(process.execPath, [join(root, 'node_modules/electron-builder/out/cli/cli.js'), '--config', 'electron-builder.config.cjs', ...targets[platform], `--${arch}`, '--prepackaged', prepackaged, '--publish', 'never'], { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
