import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

await mkdir('.qa',{recursive:true});await mkdir('docs/benchmarks',{recursive:true});
const started=performance.now(),runs=10000;
const child=spawn(process.execPath,[resolve('node_modules/vitest/vitest.mjs'),'run','tests/unit/history.test.ts','--reporter=json','--outputFile=.qa/history-vitest.json'],{env:{...process.env,HISTORY_PROPERTY_RUNS:String(runs)},windowsHide:true,stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
const raw=JSON.parse(await readFile('.qa/history-vitest.json','utf8'));
const result={passed:code===0&&raw.success,sequences:runs,seed:20261025,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(3)),checks:['mixed transform/pose/text/audio metadata operations','reference invariants after each transaction','undo returns initial project','redo returns final project'],passedTests:raw.numPassedTests,failedTests:raw.numFailedTests};
await writeFile('docs/benchmarks/history-10000.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.passed?0:1;
