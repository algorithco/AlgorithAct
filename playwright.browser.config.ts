import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  projects: [{
    name: 'browser',
    testIgnore: ['**/desktop.spec.ts', '**/packaged-export.spec.ts', '**/window-controls.spec.ts', '**/golden-frames.spec.ts'],
  }],
});
