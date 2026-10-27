import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 2,
  // Pixel references use the GPU after all workflow/export contexts have closed.
  projects: [
    { name: 'workflows', testIgnore: '**/golden-frames.spec.ts' },
    { name: 'golden', testMatch: '**/golden-frames.spec.ts', dependencies: ['workflows'] },
  ],
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 }, headless: true, channel: 'chrome', launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
