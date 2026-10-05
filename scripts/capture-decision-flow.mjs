import { chromium } from "@playwright/test";
import { mockBackend } from "../tests/e2e/fixtures.mjs";
import fs from "node:fs/promises";
const phase = process.argv[2] || "after",
  dir = `docs/qa/decision-flow/${phase}`;
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch(),
  rows = [];
for (const [width, height] of [
  [1440, 900],
  [1512, 982],
  [1280, 800],
  [390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await mockBackend(page, "populated");
  await page.goto("http://localhost:3188");
  await page.waitForTimeout(500);
  const nav = async (label) => {
    const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("button", { name: new RegExp(label) })
      .click();
    await page.waitForTimeout(350);
  };
  for (const label of [
    "Inicio",
    "Radar",
    "Mercado",
    "Flujo",
    "Pipeline",
    "Cartera",
    "Analizar",
    "Workspace",
  ]) {
    if (label === "Analizar")
      await page.getByRole("button", { name: "Analizar", exact: true }).click();
    else if (label === "Workspace") {
      await nav("Pipeline");
      await page
        .getByRole("button", { name: /QA · Piso centro/ })
        .first()
        .click();
    } else await nav(label);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${dir}/${label}-${width}x${height}.png`,
      animations: "disabled",
    });
    rows.push({
      label,
      width,
      height,
      words: (await page.locator("main").innerText()).split(/\s+/).length,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
  }
  await page.close();
}
await browser.close();
await fs.writeFile(`${dir}/summary.json`, JSON.stringify(rows, null, 2));
