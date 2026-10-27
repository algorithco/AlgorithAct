import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { decodeBundle } from '../../src/storage/zip-container';

const closedApplications = new WeakSet<ElectronApplication>();

async function launchEditor() {
  await mkdir('.qa', { recursive: true });
  const profile = await mkdtemp(resolve('.qa/window-controls-'));
  const environment = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.ANIM_DEV_URL;
  const executablePath = process.env.ANIM_DESKTOP_EXECUTABLE;
  const application = await electron.launch({ executablePath, args: [...(executablePath ? [] : ['dist-electron/main.cjs']), '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${profile}`], env: environment });
  const child = application.process();
  application.on('close', () => closedApplications.add(application));
  const page = await application.firstWindow();
  await expect(page.getByRole('group', { name: 'Oyna boshqaruvi' })).toBeVisible();
  await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({ timeout: 25000 });
  return { application, page, profile, child };
}

async function cleanup(application: ElectronApplication) {
  if (closedApplications.has(application)) return;
  // Test-owned windows can be destroyed even when a failed assertion leaves a dialog open.
  await application.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.destroy(); }).catch(() => {});
  await application.close();
}

test('custom controls minimize, maximize, restore and follow native window state', async () => {
  test.setTimeout(60000);
  const { application, page } = await launchEditor();
  try {
    expect(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMenuBarVisible())).toBe(false);
    expect(await page.locator('.app-header').evaluate(element => getComputedStyle(element).getPropertyValue('-webkit-app-region'))).toBe('drag');
    expect(await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).evaluate(element => getComputedStyle(element).getPropertyValue('-webkit-app-region'))).toBe('no-drag');
    await page.getByRole('button', { name: 'Oynani kattalashtirish', exact: true }).click();
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true);
    await page.getByRole('button', { name: 'Oynani tiklash', exact: true }).click();
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())).toBe(false);
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].maximize());
    await expect(page.getByRole('button', { name: 'Oynani tiklash', exact: true })).toBeVisible();
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].unmaximize());
    await expect(page.getByRole('button', { name: 'Oynani kattalashtirish', exact: true })).toBeVisible();
    for (const width of [1100, 1280, 1500, 1920]) {
      await application.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 800), width);
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
      await page.screenshot({ path: `.qa/custom-navigation-${width}.png` });
      const controls = page.locator('.app-header').locator('button:visible, input:visible');
      const bounds = await controls.evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { name: element.getAttribute('aria-label') ?? element.textContent, left: rect.left, right: rect.right, width: rect.width };
      }));
      for (let index = 0; index < bounds.length; index++) {
        const control = bounds[index];
        expect(control.left, `${control.name} left at ${width}`).toBeGreaterThanOrEqual(0);
        expect(control.right, `${control.name} right at ${width}`).toBeLessThanOrEqual(width);
        expect(control.width, `${control.name} width at ${width}`).toBeGreaterThanOrEqual(36);
        for (const next of bounds.slice(index + 1)) expect(Math.min(control.right, next.right) - Math.max(control.left, next.left), `${control.name} overlaps ${next.name} at ${width}`).toBeLessThanOrEqual(0);
      }
    }
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1500, 980));
    await page.screenshot({ path: '.qa/custom-navigation.png' });
    await page.getByRole('tab', { name: /^AI/ }).click();
    await expect(page.getByRole('heading', { name: 'AI bilan yarating' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ilovani yopish', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Oynani kichraytirish', exact: true }).click();
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(false);
  } finally { await cleanup(application); }
});

test('the X closes a clean project and exits the desktop process', async () => {
  const { application, page, child } = await launchEditor();
  try {
    await page.getByRole('button', { name: 'Yordam', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Yordam', exact: true })).toBeVisible();
    const exited = application.waitForEvent('close');
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    await exited;
    await expect.poll(() => child.exitCode).toBe(0);
  } finally { await cleanup(application); }
});

test('native close and custom X offer a keyboard-accessible cancel path in AI mode', async () => {
  const { application, page } = await launchEditor();
  try {
    await page.getByLabel('Loyiha nomi', { exact: true }).fill('Yopish tekshiruvi');
    await page.getByRole('tab', { name: /^AI/ }).click();
    // This exercises the same BrowserWindow close event as Alt+F4/taskbar Close.
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    const dialog = page.getByRole('dialog', { name: 'Chiqishdan oldin saqlaysizmi?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Bekor qilish', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Chiqishni bekor qilish', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Chiqishni bekor qilish', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    await dialog.getByRole('button', { name: 'Bekor qilish', exact: true }).click();
    await expect(page.getByLabel('Loyiha nomi', { exact: true })).toHaveValue('Yopish tekshiruvi');
    await expect(page.getByRole('heading', { name: 'AI bilan yarating' })).toBeVisible();
  } finally { await cleanup(application); }
});

test('save cancellation and failure keep the editor open; save-and-exit writes a valid project', async () => {
  const { application, page, profile, child } = await launchEditor();
  try {
    await page.getByLabel('Loyiha nomi', { exact: true }).fill('Saqlab yopish');
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Chiqishdan oldin saqlaysizmi?' });
    await application.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true, filePath: '' }); });
    await dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true })).toBeEnabled();
    await expect(dialog).toBeVisible();
    await application.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => { throw new Error('Save failure test'); }; });
    await dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true }).click();
    await expect(page.getByText('Save failure test', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true })).toBeEnabled();
    const path = join(profile, 'saved.anim');
    await application.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }); }, path);
    const exited = application.waitForEvent('close');
    await dialog.getByRole('button', { name: 'Saqlash va chiqish', exact: true }).click();
    await exited;
    expect((await decodeBundle(new Uint8Array(await readFile(path)))).project.meta.name).toBe('Saqlab yopish');
    await expect.poll(() => child.exitCode).toBe(0);
  } finally { await cleanup(application); }
});

test('discard-and-exit closes a dirty project and completes its recovery write', async () => {
  const { application, page, profile, child } = await launchEditor();
  try {
    await page.getByLabel('Loyiha nomi', { exact: true }).fill('Tiklash nusxasi');
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    const exited = application.waitForEvent('close');
    await page.getByRole('button', { name: 'Saqlamasdan chiqish', exact: true }).click();
    await exited;
    const bundle = await decodeBundle(new Uint8Array(await readFile(join(profile, 'recovery/latest.anim'))));
    expect(bundle.project.meta.name).toBe('Tiklash nusxasi');
    await expect.poll(() => child.exitCode).toBe(0);
  } finally { await cleanup(application); }
});

test('confirmed discard still exits when recovery storage fails', async () => {
  const { application, page, child } = await launchEditor();
  try {
    await application.evaluate(({ ipcMain }) => { ipcMain.removeHandler('recovery:write'); ipcMain.handle('recovery:write', () => { throw new Error('Recovery storage unavailable'); }); });
    await page.getByLabel('Loyiha nomi', { exact: true }).fill('Chiqish tekshiruvi');
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    const exited = application.waitForEvent('close');
    await page.getByRole('button', { name: 'Saqlamasdan chiqish', exact: true }).click();
    await exited;
    await expect.poll(() => child.exitCode).toBe(0);
  } finally { await cleanup(application); }
});

test('window controls work over export dialogs and closing stops the encoder safely', async () => {
  test.skip(!existsSync(`resources/ffmpeg/${process.platform}-${process.arch}/ffmpeg${process.platform==='win32'?'.exe':''}`) && !process.env.ANIM_FFMPEG_PATH, 'Prepare FFmpeg before testing native video export.');
  test.setTimeout(60000);
  const { application, page, profile, child } = await launchEditor();
  try {
    const path = join(profile, 'interrupted.webm');
    await writeFile(path, 'previous-video');
    await application.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }); }, path);
    await page.getByRole('button', { name: 'Eksport', exact: true }).click();
    await page.getByRole('button', { name: 'Eksport qilish', exact: true }).click();
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(2);
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Eksportni to‘xtatasizmi?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Bekor qilish', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Eksport sozlamalari', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ilovani yopish', exact: true }).click();
    const exited = application.waitForEvent('close');
    await dialog.getByRole('button', { name: 'To‘xtatib chiqish', exact: true }).click();
    await exited;
    await expect.poll(() => child.exitCode).toBe(0);
    expect(await readFile(path, 'utf8')).toBe('previous-video');
  } finally { await cleanup(application); }
});
