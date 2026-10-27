import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!['win32','darwin','linux'].includes(process.platform))throw new Error('Unsupported desktop platform.');
const application=join(root,'release',`AlgorithAct-${process.platform}-${process.arch}`);
const executable=process.platform==='darwin'?join(application,'AlgorithAct.app','Contents','MacOS','AlgorithAct'):join(application,process.platform==='win32'?'AlgorithAct.exe':'AlgorithAct');
try { await access(executable); }
catch { throw new Error('Packaged app is missing. Run npm run package:desktop first.'); }
const env={...process.env};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ANIM_DEV_URL;
const child=spawn(executable,[],{cwd:dirname(executable),env,stdio:'inherit',windowsHide:false});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
process.on('SIGINT',()=>child.kill());
