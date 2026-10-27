import { expect, test, type Locator, type Page } from '@playwright/test';

async function openWorkspace(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({ timeout: 20_000 });
  await expect(page.getByRole('tablist', { name: 'Yaratish rejimi' })).toBeVisible();
  await expect(page.locator('#manual-workspace')).toBeVisible();
}

function modeTabs(page: Page) {
  const tabs = page.getByRole('tablist', { name: 'Yaratish rejimi' });
  return {
    manual: tabs.getByRole('tab', { name: 'Manual', exact: true }),
    ai: tabs.getByRole('tab', { name: /^AI(?:\s|$)/ }),
  };
}

async function editorSnapshot(page: Page) {
  const workspace = page.locator('#manual-workspace');
  return {
    name: await workspace.getByLabel('Obyekt nomi', { exact: true }).inputValue(),
    text: await workspace.getByLabel('Matn mazmuni', { exact: true }).inputValue(),
    time: await workspace.getByTestId('timecode').innerText(),
    zoom: await workspace.getByTestId('viewport-zoom').getAttribute('data-fit')==='true'?'fit':await workspace.getByTestId('viewport-zoom').innerText(),
    layerCount: await workspace.locator('.project-panel .layer-visibility').count(),
  };
}

test('Manual and AI are separate accessible workspaces with an honest AI placeholder', async ({ page }) => {
  await openWorkspace(page);
  const { manual, ai } = modeTabs(page);
  await expect(page.getByRole('tablist', { name: 'Yaratish rejimi' }).getByRole('tab')).toHaveCount(2);
  await expect(manual).toHaveAttribute('aria-selected', 'true');
  await expect(manual).toHaveAttribute('aria-controls', 'manual-workspace');
  await expect(ai).toHaveAttribute('aria-selected', 'false');
  await expect(ai).toHaveAttribute('aria-controls', 'ai-workspace');
  await expect(page.locator('#ai-workspace')).toBeHidden();

  await ai.click();
  const aiWorkspace = page.locator('#ai-workspace');
  await expect(ai).toHaveAttribute('aria-selected', 'true');
  await expect(manual).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#manual-workspace')).toBeHidden();
  await expect(aiWorkspace).toBeVisible();
  await expect(aiWorkspace.getByRole('heading', { name: 'AI bilan yarating', exact: true })).toBeVisible();
  await expect(aiWorkspace.getByText('Tez kunda', { exact: true })).toBeVisible();
  await expect(aiWorkspace.getByRole('textbox')).toHaveCount(0);
  await expect(aiWorkspace.getByRole('button', { name: /generate|yaratish|generatsiya/i })).toHaveCount(0);

  await manual.click();
  await expect(page.locator('#manual-workspace')).toBeVisible();
  await expect(page.getByLabel('Obyekt nomi', { exact: true })).toHaveValue('Qahramon');
});

test('mode tabs support arrow navigation without moving the animation playhead', async ({ page }) => {
  await openWorkspace(page);
  const { manual, ai } = modeTabs(page);
  const timeBefore = await page.getByTestId('timecode').innerText();
  await manual.focus();
  await page.keyboard.press('ArrowRight');
  await expect(ai).toBeFocused();
  await expect(ai).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ai-workspace')).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await expect(manual).toBeFocused();
  await expect(manual).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('timecode')).toHaveText(timeBefore);

  await page.keyboard.press('ArrowLeft');
  await expect(ai).toBeFocused();
  await page.keyboard.press('Home');
  await expect(manual).toBeFocused();
  await page.keyboard.press('End');
  await expect(ai).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(manual).toBeFocused();
  await expect(page.getByTestId('timecode')).toHaveText(timeBefore);
});

test('AI preserves manual edits, selection, time and zoom and ignores editor shortcuts', async ({ page }) => {
  await openWorkspace(page);
  const { manual, ai } = modeTabs(page);
  await page.getByRole('button', { name: 'Matn qo‘shish', exact: true }).click();
  await page.getByLabel('Obyekt nomi', { exact: true }).fill('Saqlanadigan qatlam');
  await page.getByLabel('Matn mazmuni', { exact: true }).fill('Bu g‘oya Manual rejimida qoladi.');
  const initialZoom=Number.parseFloat(await page.getByTestId('viewport-zoom').innerText());
  await page.getByRole('button', { name: 'Sahnani kattalashtirish', exact: true }).click();
  const ruler = page.getByTestId('time-ruler');
  const bounds = await ruler.boundingBox();
  expect(bounds).not.toBeNull();
  await ruler.click({ position: { x: bounds!.width * 0.3, y: bounds!.height / 2 } });
  const before = await editorSnapshot(page);
  expect(before.time).not.toMatch(/^00:00:00/);
  expect(Number.parseFloat(before.zoom)).toBeGreaterThan(initialZoom);

  await ai.click();
  await manual.click();
  expect(await editorSnapshot(page)).toEqual(before);

  for (const shortcut of ['Space', 'Delete', 'Control+d']) {
    await test.step(`${shortcut} does not change the Manual project from AI`, async () => {
      await ai.click();
      // Place keyboard focus outside the tab buttons so Space cannot simply activate a tab.
      await page.getByRole('heading', { name: 'AI bilan yarating', exact: true }).click();
      await page.keyboard.press(shortcut);
      if (shortcut === 'Space') {
        // A playback leak needs several animation frames to become visible in the timecode.
        await page.waitForTimeout(200);
      }
      await manual.click();
      expect(await editorSnapshot(page)).toEqual(before);
      await expect(page.getByRole('button', { name: 'Ijro etish', exact: true })).toBeVisible();
    });
  }
});

test('opening AI pauses playback and returning to Manual keeps the paused frame', async ({ page }) => {
  await openWorkspace(page);
  const { manual, ai } = modeTabs(page);
  await page.getByRole('button', { name: 'Ijro etish', exact: true }).click();
  await expect(page.getByTestId('timecode')).not.toHaveText(/^00:00:00/);
  await ai.click();
  await manual.click();
  await expect(page.getByRole('button', { name: 'Ijro etish', exact: true })).toBeVisible();
  const pausedFrame = await page.getByTestId('timecode').innerText();
  await ai.click();
  await page.waitForTimeout(200);
  await manual.click();
  await expect(page.getByTestId('timecode')).toHaveText(pausedFrame);
});

test('keyboard actions and timeline collapse preserve the manual editing workflow', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openWorkspace(page);
  const { manual, ai } = modeTabs(page);
  const initialTime = await page.getByTestId('timecode').innerText();
  const layerButtons = page.locator('.project-panel .layer-visibility');
  const initialLayers = await layerButtons.count();

  await page.getByRole('button', { name: 'Matn qo‘shish', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Obyekt nomi', { exact: true })).toHaveValue('Yangi matn');
  await expect(layerButtons).toHaveCount(initialLayers + 1);
  await expect(page.getByRole('button', { name: 'Ijro etish', exact: true })).toBeVisible();
  await expect(page.getByTestId('timecode')).toHaveText(initialTime);
  await page.getByLabel('Matn mazmuni', { exact: true }).fill('Klaviatura bilan yaratilgan matn.');

  await ai.click();
  await manual.click();
  await expect(manual).toBeFocused();
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.anim$/);
  expect(await download.failure()).toBeNull();

  const timeline = page.getByRole('region', { name: 'Animatsiya timeline', exact: true });
  const ruler = page.getByTestId('time-ruler');
  const rulerBounds = await ruler.boundingBox();
  expect(rulerBounds).not.toBeNull();
  await ruler.click({ position: { x: rulerBounds!.width * 0.35, y: rulerBounds!.height / 2 } });
  const beforeCollapse = await editorSnapshot(page);
  const trackLabels = await timeline.getByRole('button', { name: /ko‘rinishi$/ }).evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
  const canvas = page.getByTestId('scene-canvas');
  const expandedHeight = (await canvas.boundingBox())!.height;
  const collapse = timeline.getByRole('button', { name: 'Timeline yig‘ish', exact: true });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await collapse.click();
  const restore = timeline.getByRole('button', { name: 'Timeline ochish', exact: true });
  await expect(restore).toHaveAttribute('aria-expanded', 'false');
  await expect(ruler).toBeHidden();
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBeGreaterThan(expandedHeight);
  expect(await editorSnapshot(page)).toEqual(beforeCollapse);

  await restore.click();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(ruler).toBeVisible();
  await expect(timeline.getByRole('button', { name: 'Yangi matn', exact: true })).toBeVisible();
  expect(await timeline.getByRole('button', { name: /ko‘rinishi$/ }).evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')))).toEqual(trackLabels);
  expect(await editorSnapshot(page)).toEqual(beforeCollapse);
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBeCloseTo(expandedHeight, 0);
});

async function expectUsableControl(control: Locator, viewport: { width: number; height: number }) {
  await expect(control).toBeVisible();
  const bounds = await control.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(36);
  expect(bounds!.height).toBeGreaterThanOrEqual(36);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await control.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  test(`workspace remains readable and contained at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openWorkspace(page);
    const { manual, ai } = modeTabs(page);
    const controls = [
      manual,
      ai,
      ...['Loyihani saqlash', 'Eksport', 'Personajlar', 'Harakatlar', 'Matn qo‘shish', 'Rasm yuklash', 'Audio yuklash', 'Tanlash vositasi', 'Ijro etish'].map(name => page.getByRole('button', { name, exact: true })),
    ];
    for (const control of controls) await expectUsableControl(control, viewport);
    const fieldLabel = page.locator('#manual-workspace').getByText('Joylashuv', { exact: true });
    await expect(fieldLabel).toBeVisible();
    expect(await fieldLabel.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
    await expect(page.getByRole('region', { name: 'Animatsiya timeline', exact: true })).toBeVisible();

    for (const tab of [manual, ai]) {
      await tab.click();
      expect(await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }))).toEqual(viewport);
    }
  });
}
