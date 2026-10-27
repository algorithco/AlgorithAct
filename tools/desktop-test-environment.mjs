import { appendFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

if (!process.env.GITHUB_ENV) throw new Error('This helper configures a GitHub Actions test job.');
const target = `${process.platform}-${process.arch}`, extension = process.platform === 'win32' ? '.exe' : '';
const directory = resolve('release', `AlgorithAct-${target}`);
const executable = process.platform === 'darwin' ? join(directory, 'AlgorithAct.app/Contents/MacOS/AlgorithAct') : join(directory, `AlgorithAct${extension}`);
await appendFile(process.env.GITHUB_ENV, Object.entries({
  ANIM_FFMPEG_PATH: resolve('resources/ffmpeg', target, `ffmpeg${extension}`),
  ANIM_FFPROBE_PATH: resolve('resources/ffmpeg', target, `ffprobe${extension}`),
  ANIM_PACKAGED_APP: executable,
  ANIM_DESKTOP_EXECUTABLE: executable,
}).map(([name, value]) => `${name}=${value}\n`).join(''));
