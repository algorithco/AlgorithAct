import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='win32')throw new Error('Use npm run dev:desktop on this platform.');
const executable=join(root,'release',`AlgorithAct-win32-${process.arch}`,'AlgorithAct.exe');
try { await access(executable); }
catch { throw new Error('AlgorithAct.exe is missing. Run npm run package:win first.'); }
const env={...process.env};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ANIM_DEV_URL;
const child=spawn(executable,[],{cwd:dirname(executable),env,stdio:'inherit',windowsHide:false});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
process.on('SIGINT',()=>child.kill());
