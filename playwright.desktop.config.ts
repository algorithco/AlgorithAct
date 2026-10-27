import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  webServer: undefined,
  projects: [{
    name: 'desktop',
    testMatch: ['**/desktop.spec.ts', '**/packaged-export.spec.ts', '**/window-controls.spec.ts'],
  }],
});
