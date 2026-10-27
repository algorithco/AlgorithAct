import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), '..');
const sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 192, 256];

if (!process.versions.electron) {
  const { default: electron } = await import('electron');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [script, ...process.argv.slice(2)], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
  });
  child.on('error', error => { console.error(error); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else {
  const { app, nativeImage } = await import('electron');
  try {
    const brand = join(root, 'public', 'brand');
    const original = nativeImage.createFromPath(join(brand, 'AlgorithAct.png'));
    if (original.isEmpty()) throw new Error('The original AlgorithAct artwork is missing.');
    const { width, height } = original.getSize();
    const pixels = original.toBitmap();
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) < 100) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left || bottom < top) throw new Error('The original artwork has no visible logo.');
    // Keep the supplied artwork intact; only its desktop tile framing changes.
    const mark = original.crop({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 });
    const aspect = mark.getSize().height / mark.getSize().width;

    function frame(size) {
      // The other Algorithco desktop marks occupy about 54% of their tiles.
      const markWidth = Math.round(size * 0.54);
      const markHeight = Math.round(markWidth * aspect);
      const resized = mark.resize({ width: markWidth, height: markHeight, quality: 'best' });
      const input = resized.toBitmap();
      const output = Buffer.alloc(size * size * 4);
      const offsetX = Math.floor((size - markWidth) / 2);
      const offsetY = Math.floor((size - markHeight) / 2);
      for (let i = 3; i < output.length; i += 4) output[i] = 255;
      for (let y = 0; y < markHeight; y++) for (let x = 0; x < markWidth; x++) {
        const i = (y * markWidth + x) * 4;
        const destination = ((y + offsetY) * size + x + offsetX) * 4;
        for (let channel = 0; channel < 3; channel++) {
          let value = input[i + channel];
          if (size <= 64) {
            // A restrained unsharp pass keeps the small blades and yellow dot distinct.
            let neighbours = 0;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nx = x + dx, ny = y + dy;
              neighbours += nx < 0 || ny < 0 || nx >= markWidth || ny >= markHeight
                ? 0 : input[(ny * markWidth + nx) * 4 + channel];
            }
            value += 0.25 * (value - neighbours / 4);
          }
          output[destination + channel] = Math.round(Math.max(0, Math.min(255, value)));
        }
      }
      // A 12.5% corner radius with subpixel coverage, including at 16px.
      const radius = size / 8, samples = 8;
      for (let y = 0; y < Math.ceil(radius); y++) for (let x = 0; x < Math.ceil(radius); x++) {
        let inside = 0;
        for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
          const dx = Math.max(0, radius - x - (sx + 0.5) / samples);
          const dy = Math.max(0, radius - y - (sy + 0.5) / samples);
          if (dx * dx + dy * dy <= radius * radius) inside++;
        }
        const alpha = Math.round(255 * inside / (samples * samples));
        for (const [cx, cy] of [[x, y], [size - 1 - x, y], [x, size - 1 - y], [size - 1 - x, size - 1 - y]]) {
          output[(cy * size + cx) * 4 + 3] = alpha;
        }
      }
      return nativeImage.createFromBitmap(output, { width: size, height: size });
    }

    // Store independently rendered PNG frames, rather than resizing a small bitmap.
    const images = sizes.map(size => frame(size).toPNG());
    const directory = Buffer.alloc(6 + sizes.length * 16);
    directory.writeUInt16LE(1, 2);
    directory.writeUInt16LE(sizes.length, 4);
    let offset = directory.length;
    for (let index = 0; index < sizes.length; index++) {
      const entry = 6 + index * 16, size = sizes[index];
      directory[entry] = directory[entry + 1] = size === 256 ? 0 : size;
      directory.writeUInt16LE(1, entry + 4);
      directory.writeUInt16LE(32, entry + 6);
      directory.writeUInt32LE(images[index].length, entry + 8);
      directory.writeUInt32LE(offset, entry + 12);
      offset += images[index].length;
    }
    await writeFile(join(brand, 'algorithact.ico'), Buffer.concat([directory, ...images]));
    await writeFile(join(brand, 'algorithact-desktop.png'), frame(512).toPNG());
    if (process.argv.includes('--preview')) {
      const preview = join(root, '.qa', 'icon-preview');
      await mkdir(preview, { recursive: true });
      for (let index = 0; index < sizes.length; index++) {
        await writeFile(join(preview, `${sizes[index]}.png`), images[index]);
      }
    }
    console.log(`Desktop icons: ${sizes.join(', ')}px; 54% logo width; rounded transparent corners.`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
}
