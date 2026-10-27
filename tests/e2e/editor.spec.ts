import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { decodeBundle } from '../../src/storage/zip-container';

test('editor workflow: render, playback, motion, key, undo and .anim/PNG export',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  await expect(page.getByRole('heading',{name:'Xususiyatlar'})).toBeVisible();
  await expect(page.getByLabel('Obyekt nomi')).toHaveValue('Qahramon');
  await page.getByRole('button',{name:'Ijro etish',exact:true}).click();await expect(page.getByRole('button',{name:'Pauza',exact:true})).toBeVisible();await page.waitForTimeout(500);await page.getByRole('button',{name:'Pauza',exact:true}).click();expect(await page.getByTestId('timecode').innerText()).not.toContain('00:00:00/');
  await page.getByRole('button',{name:'Boshiga qaytish',exact:true}).click();
  await page.getByRole('button',{name:'Harakatlar',exact:true}).click();await page.getByRole('button',{name:/Yurish.*Takroriy/}).click();await expect(page.getByRole('button',{name:'Yurish klipi',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('button',{name:'Yurish klipi',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.getByRole('button',{name:'Yurish klipi',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'X kaliti',exact:true}).click();await expect(page.getByRole('button',{name:/Qahramon transform.x kaliti 0/})).toBeVisible();
  const x=page.getByRole('spinbutton',{name:'X',exact:true});const oldX=await x.inputValue();await x.fill('1200');await expect(x).toHaveValue('1200');await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(x).toHaveValue(oldX);
  await page.getByRole('button',{name:'Poza vositasi',exact:true}).click();await expect(page.getByTestId('joint-forearmR')).toBeVisible();
  await page.getByRole('button',{name:'Tanlash vositasi',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Loyihani saqlash',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.anim$/);await download.saveAs('test-results/workflow.anim');
  await page.getByRole('button',{name:'Eksport',exact:true}).click();const imagePromise=page.waitForEvent('download');await page.getByRole('button',{name:'Eksport qilish',exact:true}).click();const png=await imagePromise;expect(png.suggestedFilename()).toMatch(/\.png$/);await png.saveAs('test-results/workflow-frame.png');
  await page.getByRole('button',{name:'Personajlar',exact:true}).click();await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/editor.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('text and project file roundtrip',async({page})=>{
  await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  await page.getByRole('button',{name:'Matn qo‘shish',exact:true}).click();await page.getByRole('textbox',{name:'Matn mazmuni',exact:true}).fill('Salom, Algorithco!');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Loyihani saqlash',exact:true}).click();const download=await downloadPromise;const path=await download.path();
  await page.getByRole('textbox',{name:'Matn mazmuni',exact:true}).fill('O‘zgartirilgan');
  await page.getByRole('button',{name:'Loyiha ochish',exact:true}).click();
  const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Saqlamasdan davom etish',exact:true}).click();
  const chooser=await chooserPromise;await chooser.setFiles(path!);
  await expect(page.getByRole('button',{name:'Yangi matn',exact:true})).toBeVisible();await page.getByRole('button',{name:'Yangi matn',exact:true}).click();await expect(page.getByRole('textbox',{name:'Matn mazmuni',exact:true})).toHaveValue('Salom, Algorithco!');
});

test('image bytes survive an .anim save and reopen',async({page})=>{
  await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  const base64=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#7659e8';ctx.fillRect(0,0,16,16);return canvas.toDataURL().split(',')[1];});
  const bytes=Buffer.from(base64,'base64');
  await page.getByLabel('Rasm fayli',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:bytes});
  await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('test.png');
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Loyihani saqlash',exact:true}).click();const download=await promise,path=(await download.path())!;
  const bundle=await decodeBundle(new Uint8Array(await readFile(path)));expect(Object.values(bundle.assets)[0]).toEqual(new Uint8Array(bytes));
  const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Loyiha ochish',exact:true}).click();await(await chooserPromise).setFiles(path);
  await page.getByRole('button',{name:'test.png',exact:true}).click();await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('test.png');
});
