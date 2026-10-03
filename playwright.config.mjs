import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "*.spec.mjs",
  workers: 2,
  webServer: {command:"npm run start -- --port 3188",url:"http://localhost:3188",reuseExistingServer:!process.env.CI,timeout:30000},
  use: { baseURL: "http://localhost:3188", headless: true },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/qa/product-pass/results.json" }],
  ],
});
