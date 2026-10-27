import { expect, test, type Page } from '@playwright/test';

async function openEditor(page:Page) {
  await page.goto('/');
  await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('Qahramon');
}

for(const viewport of [{width:1920,height:1032,minWidth:1000,minHeight:560},{width:1280,height:720,minWidth:600,minHeight:335}]) {
  test(`canvas has useful editing space at ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await openEditor(page);
    const canvas=page.getByTestId('scene-canvas');
    await expect.poll(async()=>Math.round((await canvas.boundingBox())!.width)).toBeGreaterThanOrEqual(viewport.minWidth);
    const frame=(await canvas.boundingBox())!;
    expect(frame.height).toBeGreaterThanOrEqual(viewport.minHeight);
    expect(frame.width/frame.height).toBeCloseTo(16/9,2);
    expect(frame.y).toBeGreaterThanOrEqual(64);
    const actualZoom=Math.round(frame.width/1920*100);
    await expect(page.getByTestId('viewport-zoom')).toHaveText(`${actualZoom}%`);
    await expect(page.getByRole('button',{name:'Qatlamlar paneli',exact:true})).toHaveAttribute('aria-expanded','false');
    await expect(page.locator('.project-panel')).toBeHidden();
    for(const name of ['Personajlar','Matn qo‘shish','Ijro etish','Xususiyatlar paneli','Fokus rejimi'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
    expect(await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}))).toEqual({width:viewport.width,height:viewport.height});
  });
}

test('focus mode restores panel choices, selection and playback position',async({page})=>{
  await openEditor(page);
  await page.getByRole('button',{name:'Qatlamlar paneli',exact:true}).click();
  await expect(page.locator('.project-panel')).toBeVisible();
  const time=await page.getByTestId('timecode').innerText();
  const originalWidth=(await page.getByTestId('scene-canvas').boundingBox())!.width;
  await page.getByRole('button',{name:'Fokus rejimi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Fokus rejimi',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.properties-dock')).toBeHidden();
  await expect(page.locator('.project-panel')).toBeHidden();
  await expect(page.getByTestId('time-ruler')).toBeHidden();
  await expect.poll(async()=>(await page.getByTestId('scene-canvas').boundingBox())!.width).toBeGreaterThan(originalWidth);
  await page.keyboard.press('Escape');
  await expect(page.locator('.project-panel')).toBeVisible();
  await expect(page.locator('.properties-dock')).toBeVisible();
  await expect(page.getByTestId('time-ruler')).toBeVisible();
  await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('Qahramon');
  await expect(page.getByTestId('timecode')).toHaveText(time);
  await page.getByRole('button',{name:'Xususiyatlar paneli',exact:true}).click();
  await expect(page.locator('.properties-dock')).toBeHidden();
  await page.keyboard.press('f');
  await expect(page.getByRole('button',{name:'Fokus rejimi',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.properties-dock')).toBeHidden();
});

test('timeline resize makes room for the canvas without changing the project',async({page})=>{
  await openEditor(page);
  const handle=page.getByRole('separator',{name:'Timeline balandligi',exact:true});
  const time=await page.getByTestId('timecode').innerText();
  const canvasHeight=(await page.getByTestId('scene-canvas').boundingBox())!.height;
  await handle.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect.poll(async()=>(await page.getByTestId('scene-canvas').boundingBox())!.height).toBeLessThan(canvasHeight);
  const resizedHeight=await handle.getAttribute('aria-valuenow');
  await page.getByRole('button',{name:'Timeline yig‘ish',exact:true}).click();
  await page.getByRole('button',{name:'Timeline ochish',exact:true}).click();
  await expect(handle).toHaveAttribute('aria-valuenow',resizedHeight!);
  const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+90,{steps:8});await page.mouse.up();
  await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeLessThan(Number(resizedHeight));
  await handle.dblclick();
  await expect.poll(async()=>(await page.getByTestId('scene-canvas').boundingBox())!.height).toBeCloseTo(canvasHeight,0);
  await expect(page.getByTestId('timecode')).toHaveText(time);
  await expect(page.getByLabel('Obyekt nomi',{exact:true})).toHaveValue('Qahramon');
});

test('zoom uses actual scale, supports wheel navigation and fit resets panning',async({page})=>{
  await openEditor(page);
  const viewport=page.getByTestId('viewport');
  const canvas=page.getByTestId('scene-canvas');
  const before=(await canvas.boundingBox())!;
  await page.getByRole('button',{name:'Haqiqiy o‘lcham',exact:true}).click();
  await expect(page.getByTestId('viewport-zoom')).toHaveText('100%');
  await expect.poll(async()=>(await canvas.boundingBox())!.width).toBe(1920);
  await page.getByRole('button',{name:'Sahnani sig‘dirish',exact:true}).click();
  await expect.poll(async()=>(await canvas.boundingBox())!.width).toBeCloseTo(before.width,0);
  const area=(await viewport.boundingBox())!;
  await page.mouse.move(area.x+area.width/2,area.y+area.height/2);
  await page.mouse.wheel(70,90);
  await expect.poll(async()=>(await canvas.boundingBox())!.y).toBeCloseTo(before.y-90,0);
  await page.keyboard.down('Control');await page.mouse.wheel(0,-100);await page.keyboard.up('Control');
  await expect.poll(async()=>(await canvas.boundingBox())!.width).toBeGreaterThan(before.width);
  await page.getByRole('button',{name:'Sahnani sig‘dirish',exact:true}).click();
  await expect.poll(async()=>(await canvas.boundingBox())!.y).toBeCloseTo(before.y,0);
});

test('small windows show layers and properties one at a time and text editing starts at the top',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await openEditor(page);
  await page.getByRole('button',{name:'Qatlamlar paneli',exact:true}).click();
  await expect(page.locator('.project-panel')).toBeVisible();
  await expect(page.locator('.properties-dock')).toBeHidden();
  await page.locator('.project-panel').getByRole('button',{name:/Asosiy sarlavha \d/}).click();
  await expect(page.locator('.project-panel')).toBeHidden();
  await expect(page.locator('.properties-dock')).toBeVisible();
  const text=page.getByRole('textbox',{name:'Matn mazmuni',exact:true});
  await expect(text).toBeVisible();
  const textBox=(await text.boundingBox())!;
  const transform=(await page.getByRole('heading',{name:'Transformatsiya',exact:true}).boundingBox())!;
  expect(textBox.y).toBeLessThan(transform.y);
  await text.fill('Kengroq sahnada qulay tahrirlash.');
  await expect(page.locator('.static-track.text').filter({hasText:'Kengroq sahnada qulay tahrirlash.'})).toHaveCount(1);
  await page.getByRole('button',{name:'Xususiyatlarni yopish',exact:true}).click();
  await expect(page.locator('.properties-dock')).toBeHidden();
  await page.getByRole('button',{name:'Xususiyatlar paneli',exact:true}).click();
  await expect(text).toHaveValue('Kengroq sahnada qulay tahrirlash.');
});
