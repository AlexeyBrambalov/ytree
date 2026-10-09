import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests: the real frontend against the real Kotlin backend.
 * Both get their own ports (5174 and 8081), so the tests can run while `../dev.sh` is up.
 */
export const E2E_APP_URL = 'http://localhost:5174'
export const E2E_API_URL = 'http://localhost:8081'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  // One client and one in-memory backend: tests share it, so they run one at a time and reset it first.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: E2E_APP_URL,
    // Tests find elements by their `data-qa` tags (src/helpers/qa.ts) through `getByTestId`.
    testIdAttribute: 'data-qa',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The `e2e` profile adds POST /api/e2e/reset and moves the backend to 8081.
      command: './gradlew --quiet bootJar && java -jar build/libs/backend.jar --spring.profiles.active=e2e',
      cwd: '../backend',
      url: `${E2E_API_URL}/api/providers`,
      timeout: 180_000,
      reuseExistingServer: !isCI,
      stdout: 'ignore',
    },
    {
      command: 'pnpm exec vite --port 5174 --strictPort',
      env: { VITE_API_BASE_URL: E2E_API_URL },
      url: E2E_APP_URL,
      timeout: 60_000,
      reuseExistingServer: !isCI,
    },
  ],
})
