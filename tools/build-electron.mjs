import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('dist-electron',{recursive:true});
await build({entryPoints:['src/app-electron/main/index.ts'],outfile:'dist-electron/main.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],sourcemap:true,target:'node22'});
await build({entryPoints:['src/app-electron/preload/bridge.ts'],outfile:'dist-electron/preload.cjs',bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
console.log('Electron main and isolated preload built.');
