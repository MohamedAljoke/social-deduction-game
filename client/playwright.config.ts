import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  // workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    headless: true,
    launchOptions: {
      // slowMo: 1000,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run start:e2e --prefix ../backend",
      url: "http://127.0.0.1:3000/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        "VITE_API_URL=http://127.0.0.1:3000 VITE_WS_URL=ws://127.0.0.1:3000/ws VITE_LANGUAGE=en npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
