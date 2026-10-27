import { packager } from '@electron/packager';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureFfmpegBundle } from './ffmpeg-bundle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const variantIndex=process.argv.indexOf('--variant'),variant=variantIndex<0?undefined:process.argv[variantIndex+1];
if(variantIndex>=0&&(!variant||! /^[a-z][a-z0-9-]{0,47}$/.test(variant)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(variant)))throw new Error('Invalid package variant.');
const output=variant?join(root,'release',variant):join(root,'release');
const architecture=process.arch;
if(process.platform!=='win32'||!['x64','arm64'].includes(architecture))throw new Error('Run Windows packaging on Windows x64 or ARM64.');
const ffmpeg=await ensureFfmpegBundle(root,process.platform,architecture);
const target=join(output,`AlgorithAct-win32-${architecture}`);
// Packager replaces this generated folder; never allow it outside release/.
if(relative(output,target).startsWith('..')||dirname(target)!==output)throw new Error('Invalid package output path.');
const metadata=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const electron=JSON.parse(await readFile(join(root,'node_modules/electron/package.json'),'utf8'));
await Promise.all(['dist/index.html','dist-electron/main.cjs','dist/brand/algorithact.ico'].map(path=>stat(join(root,path))));
const stagingRoot=join(root,'.qa');
await mkdir(stagingRoot,{recursive:true});
const stage=await mkdtemp(join(stagingRoot,'package-stage-'));
if(dirname(stage)!==stagingRoot||!relative(stagingRoot,stage).startsWith('package-stage-'))throw new Error('Invalid staging cleanup path.');
try {
  // The main/preload/renderer builds are bundled; source, tests and node_modules stay out.
  for(const folder of ['dist','dist-electron'])await cp(join(root,folder),join(stage,folder),{recursive:true,filter:path=>!path.endsWith('.map')});
  for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])await cp(join(root,file),join(stage,file));
  const {name,productName,version,description,main,type,license,author,repository}=metadata;
  await writeFile(join(stage,'package.json'),JSON.stringify({name,productName,version,description,main,type,license,author,repository,private:true},null,2)+'\n');
  const paths=await packager({
    dir:stage,out:output,name:'AlgorithAct',executableName:'AlgorithAct',
    platform:'win32',arch:architecture,electronVersion:electron.version,
    appVersion:version,buildVersion:version,appBundleId:'com.algorithact.desktop',
    icon:join(root,'dist/brand/algorithact.ico'),asar:true,prune:false,overwrite:true,extraResource:ffmpeg.directory,
    win32metadata:{CompanyName:'AlgorithAct',FileDescription:'AlgorithAct',InternalName:'AlgorithAct',OriginalFilename:'AlgorithAct.exe',ProductName:'AlgorithAct'},
  });
  console.log(`Windows app: ${join(paths[0],'AlgorithAct.exe')}`);
} finally {
  await rm(stage,{recursive:true,force:true});
}
