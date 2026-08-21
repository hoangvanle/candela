import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the built output on `vite preview`, so what is verified is
 * what ships. The viewport is the one the prototype was tuned at (SPEC §1).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/candela/',
    ...devices['iPhone 15'],
    // Keyboard focus behaviour is the thing under test; drive it for real.
    hasTouch: true,
    isMobile: true,
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 393, height: 852 } } }],
  webServer: {
    // The build lives in the `test` script, not here: a reused preview server
    // would otherwise keep serving the previous build after a source change.
    command: 'npx vite preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/candela/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
