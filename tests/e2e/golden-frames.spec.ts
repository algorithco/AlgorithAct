import { test,expect } from '@playwright/test';
import fixture from '../fixtures/project.v1.json' with { type:'json' };
import manifest from '../golden-frames/manifest.json' with { type:'json' };
import roundingMask from '../golden-frames/camera-rounding-mask.json' with { type:'json' };
import { parseProject } from '../../src/model/validate';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const withinRoundingBudget=(output:{changedPixels:number;knownRoundingPixels:number;roundingMaskPixels:number})=>
  output.changedPixels<=16 || output.changedPixels===output.knownRoundingPixels&&output.changedPixels<=output.roundingMaskPixels;

test('preview and retained export target preserve baseline pixels through seek and camera changes',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  const references=Object.fromEntries(await Promise.all(manifest.files.map(async item=>[item.file,(await readFile(`tests/golden-frames/${item.file}`)).toString('base64')])));
  expect(createHash('sha256').update(Buffer.from(references[roundingMask.file],'base64')).digest('hex')).toBe(roundingMask.baselinePngSha256);
  const outputs=await page.evaluate(async payload=>{
    const source='/src/app-electron/renderer/composition.ts';const {services}=await import(source) as typeof import('../../src/app-electron/renderer/composition');
    await document.fonts.ready;const results:{purpose:string;file:string;hash:string;pngHash:string;png:string;maxDelta:number;changedPixels:number;knownRoundingPixels:number;roundingMaskPixels:number}[]=[];
    const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');
    for(const purpose of ['preview','export'] as const){
      const canvas=document.createElement('canvas'),renderer=services.createRenderer(purpose),resolver=services.resolver({},payload.project);
      await renderer.init(canvas,payload.manifest.width,payload.manifest.height);
      try{
        // Non-monotonic order catches stale targets after reverse seeks and camera reloads.
        for(const item of [payload.manifest.files[2],payload.manifest.files[4],payload.manifest.files[0],payload.manifest.files[3],payload.manifest.files[1]]){
          const project=structuredClone(payload.project),scene=project.scenes[project.sceneOrder[0]],camera=scene.entities[scene.cameraId];
          if(item.file==='camera.png'&&camera.kind==='camera'){camera.zoom=.82;camera.rotation=.08;camera.x+=90;}
          await renderer.load(project,resolver);renderer.render(services.evaluator.evaluate(project,scene.id,item.time));
          const raw=await renderer.capture(),blob=await renderer.capturePng(),bitmap=await createImageBitmap(blob),readback=document.createElement('canvas');readback.width=raw.width;readback.height=raw.height;
          const context=readback.getContext('2d')!;context.drawImage(bitmap,0,0);bitmap.close();
          const bytes=Uint8Array.from(atob(payload.references[item.file]),c=>c.charCodeAt(0)),reference=await createImageBitmap(new Blob([bytes],{type:'image/png'}));context.clearRect(0,0,raw.width,raw.height);context.drawImage(reference,0,0);reference.close();
          const expected=context.getImageData(0,0,raw.width,raw.height).data;let maxDelta=0,changedPixels=0,knownRoundingPixels=0;
          const mask=new Set(item.file===payload.roundingMask.file?payload.roundingMask.pixels.map(([x,y,c])=>`${x}:${y}:${c}`):[]);
          for(let i=0;i<raw.rgba.length;i+=4){
            let changed=false,known=true;const x=(i/4)%raw.width,y=Math.floor(i/4/raw.width);
            for(let c=0;c<4;c++){const delta=Math.abs(raw.rgba[i+c]-expected[i+c]);maxDelta=Math.max(maxDelta,delta);if(delta){changed=true;if(delta!==1||!mask.has(`${x}:${y}:${c}`))known=false;}}
            if(changed){changedPixels++;if(known)knownRoundingPixels++;}
          }
          const pngBitmap=await createImageBitmap(blob);context.clearRect(0,0,raw.width,raw.height);context.drawImage(pngBitmap,0,0);pngBitmap.close();
          const png=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
          results.push({purpose,file:item.file,hash:await hash(raw.rgba),pngHash:await hash(new Uint8Array(context.getImageData(0,0,raw.width,raw.height).data.buffer)),png,maxDelta,changedPixels,knownRoundingPixels,roundingMaskPixels:mask.size});
        }
      }finally{renderer.dispose();resolver.dispose();}
    }
    return results;
  },{project:parseProject(fixture),manifest,references,roundingMask});
  expect(outputs).toHaveLength(10);
  await mkdir('.qa/golden-diffs',{recursive:true});
  await writeFile('.qa/golden-diffs/comparison.json',JSON.stringify(outputs.map(({png,...metrics})=>({...metrics,pngBytes:Math.floor(png.length*3/4)})),null,2)+'\n');
  for(const output of outputs)if(output.maxDelta>1||!withinRoundingBudget(output))await writeFile(`.qa/golden-diffs/${output.purpose}-${output.file}`,Buffer.from(output.png,'base64'));
  // Keep the general 16-pixel / one-level budget. The historical camera's 27
  // one-channel text-edge roundings are allowed only at reviewed coordinates,
  // bound to the original PNG hash. No larger error or arbitrary region is masked.
  for(const output of outputs){
    expect(output.maxDelta,`${output.purpose} ${output.file}`).toBeLessThanOrEqual(1);expect(withinRoundingBudget(output),`${output.purpose} ${output.file}: ${output.changedPixels} changed, ${output.knownRoundingPixels} reviewed roundings`).toBe(true);
    expect(output.pngHash,`raw/PNG ${output.purpose} ${output.file}`).toBe(output.hash);
    expect(output.hash,`preview/export ${output.file}`).toBe(outputs.find(item=>item.file===output.file&&item.purpose==='preview')!.hash);
  }
  for(const purpose of ['preview','export'])expect(outputs.find(item=>item.purpose===purpose&&item.file==='rest.png')!.hash).toBe(outputs.find(item=>item.purpose===purpose&&item.file==='clip-ended.png')!.hash);
});
