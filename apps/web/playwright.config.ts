import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./e2e/global-setup";

// The browser tests run against the built site (as the server runs it) and a test database of made-up roles.
const PORT = 4013;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${String(PORT)}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "node .output/server/index.mjs",
    // Playwright starts the server before the global setup makes the database, so it waits on a static file.
    url: `http://localhost:${String(PORT)}/favicon.svg`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), NUXT_DATABASE_URL: E2E_DATABASE_URL },
  },
});
