import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import fixture from '../tests/fixtures/project.v1.json' with { type: 'json' };
import { parseProject } from '../src/model/validate';

const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();await page.goto(server.resolvedUrls!.local[0]);await page.getByText('Sahna tayyorlanmoqda…').waitFor({state:'hidden'});
  const results=await page.evaluate(async project=>{
    const source='/src/app-electron/renderer/composition.ts';const {services}=await import(source) as typeof import('../src/app-electron/renderer/composition');
    const canvas=document.createElement('canvas'),renderer=services.createRenderer(),resolver=services.resolver({},project);await document.fonts.ready;
    await renderer.init(canvas,project.settings.frame.width,project.settings.frame.height);await renderer.load(project,resolver);
    const results:{name:string;time:number;png:string;rgbaHash:string}[]=[];
    try{
      for(const [name,time] of [['rest',0],['wave-0800',800],['wave-1600',1600],['clip-ended',5000],['camera',800]] as const){
        const current=structuredClone(project),scene=current.scenes[current.sceneOrder[0]],camera=scene.entities[scene.cameraId];
        if(name==='camera'&&camera.kind==='camera'){camera.zoom=.82;camera.rotation=.08;camera.x+=90;}
        await renderer.load(current,resolver);renderer.render(services.evaluator.evaluate(current,scene.id,time));
        const raw=await renderer.capture(),hash=await crypto.subtle.digest('SHA-256',new Uint8Array(raw.rgba));
        const blob=await renderer.capturePng(),png=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
        results.push({name,time,png,rgbaHash:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')});
      }
      return {userAgent:navigator.userAgent,results};
    }finally{renderer.dispose();resolver.dispose();}
  },parseProject(fixture));
  await mkdir('tests/golden-frames',{recursive:true});const files=[];
  for(const item of results.results){const bytes=Buffer.from(item.png,'base64'),file=`${item.name}.png`;await writeFile(`tests/golden-frames/${file}`,bytes);files.push({file,time:item.time,rgbaHash:item.rgbaHash,pngHash:createHash('sha256').update(bytes).digest('hex')});}
  await writeFile('tests/golden-frames/manifest.json',JSON.stringify({width:1920,height:1080,userAgent:results.userAgent,renderer:'ANGLE SwiftShader, Arial on Windows',files},null,2)+'\n');
  console.log(`${files.length} golden frames written. Review changes before accepting a new baseline.`);
}finally{await browser.close();await server.close();}
