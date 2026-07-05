import { defineConfig } from "@playwright/test";

// E2E contra el dev server (necesario: el login usa el enlace de modo
// desarrollo que solo existe con NODE_ENV=development). Requiere MongoDB
// local con seed (npm run seed).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
