import { test,expect } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { motions } from '../../content/characters/hero/build';
import { retargetProject } from '../helpers/retarget-fixture';
import { decodeBundle } from '../../src/storage/zip-container';

test('both rigs render all five shared motions identically in preview and export',async({page})=>{
  test.setTimeout(60000);await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  const cases=motions.map(motion=>({name:motion.tags[0],title:motion.name,time:Math.round(motion.durationMs*.55),project:retargetProject(motion)}));
  const frames=await page.evaluate(async cases=>{
    const source='/src/app-electron/renderer/composition.ts';const {services}=await import(source) as typeof import('../../src/app-electron/renderer/composition');await document.fonts.ready;
    const results:{name:string;purpose:string;hash:string;png:string}[]=[];
    for(const purpose of ['preview','export'] as const){
      const canvas=document.createElement('canvas'),renderer=services.createRenderer(purpose);await renderer.init(canvas,960,720);
      try{for(const item of cases){
        const resolver=services.resolver({},item.project);
        try{await renderer.load(item.project,resolver);renderer.render(services.evaluator.evaluate(item.project,item.project.sceneOrder[0],item.time));const raw=await renderer.capture(),hash=await crypto.subtle.digest('SHA-256',new Uint8Array(raw.rgba)),blob=await renderer.capturePng();
          const png=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
          results.push({name:item.name,purpose,hash:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join(''),png});
        }finally{resolver.dispose();}
      }}finally{renderer.dispose();}
    }
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=3*780;const context=canvas.getContext('2d')!;context.fillStyle='#e8e7e2';context.fillRect(0,0,canvas.width,canvas.height);
    for(const [i,item]of cases.entries()){
      const png=results.find(result=>result.name===item.name&&result.purpose==='preview')!.png,bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'}));
      const x=(i%2)*960,y=Math.floor(i/2)*780;context.fillStyle='#27332A';context.font='26px Arial';context.fillText(`${item.title} · ${item.time} ms`,x+30,y+38);context.drawImage(bitmap,x,y+60);bitmap.close();
    }
    return {results,contact:canvas.toDataURL('image/png').split(',')[1]};
  },cases);
  await mkdir('.qa/retarget',{recursive:true});
  for(const frame of frames.results.filter(frame=>frame.purpose==='preview'))await writeFile(`.qa/retarget/${frame.name}.png`,Buffer.from(frame.png,'base64'));
  await writeFile('.qa/retarget/contact.png',Buffer.from(frames.contact,'base64'));
  expect(frames.results).toHaveLength(10);
  for(const item of cases)expect(frames.results.find(frame=>frame.name===item.name&&frame.purpose==='export')!.hash).toBe(frames.results.find(frame=>frame.name===item.name&&frame.purpose==='preview')!.hash);
  expect(new Set(frames.results.filter(frame=>frame.purpose==='preview').map(frame=>frame.hash)).size).toBe(5);
});

test('Novcha can be added, animated and saved with its own rig',async({page})=>{
  await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  await page.getByRole('button',{name:'Personajlar',exact:true}).click();
  const original=page.getByRole('button',{name:'Original personajini qo‘shish',exact:true}),tall=page.getByRole('button',{name:'Novcha personajini qo‘shish',exact:true});
  expect(await tall.locator('svg[data-rig-id]').getAttribute('data-rig-id')).not.toBe(await original.locator('svg[data-rig-id]').getAttribute('data-rig-id'));
  await tall.click();await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('Novcha 2');
  await page.getByRole('button',{name:'Harakatlar',exact:true}).click();await page.getByRole('button',{name:/Yurish.*Takroriy/}).click();await expect(page.getByRole('button',{name:'Yurish klipi',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Poza vositasi',exact:true}).click();await expect(page.getByTestId('joint-shinL')).toBeVisible();
  await page.screenshot({path:'.qa/retarget/editor.png',fullPage:true});
  const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Loyihani saqlash',exact:true}).click();const download=await saved;await download.saveAs('.qa/retarget/two-rigs.anim');
  const {project}=await decodeBundle(new Uint8Array(await readFile((await download.path())!))),scene=project.scenes[project.sceneOrder[0]],characters=Object.values(scene.entities).filter(entity=>entity.kind==='character');
  expect(characters).toHaveLength(2);expect(new Set(characters.map(entity=>project.library.characters[entity.characterId].rigId)).size).toBe(2);
  const novcha=characters.find(entity=>entity.name==='Novcha 2')!;expect(Object.values(scene.timeline.clips).some(clip=>clip.kind==='motion'&&clip.entityId===novcha.id)).toBe(true);
});
