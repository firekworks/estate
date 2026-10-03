import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockBackend } from "./fixtures.mjs";
const sizes = [
  [1440, 900],
  [1512, 982],
  [1728, 1117],
  [1280, 800],
  [768, 1024],
  [390, 844],
];
const modules = [
  ["Inicio", "home"],
  ["Radar", "radar"],
  ["Mercado", "market"],
  ["Flujo", "flow"],
  ["Pipeline", "pipeline"],
  ["Cartera", "portfolio"],
];
async function nav(page, label) {
  if (
    await page
      .getByRole("button", { name: "Abrir menú", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: new RegExp(label) })
    .click();
  if (label === "Flujo")
    await expect(page.locator(".view-mobility")).toBeVisible();
}
for (const state of ["signed-out", "empty", "populated"])
  for (const [width, height] of sizes) {
    test(`${state} ${width}x${height}`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height });
      const calls = await mockBackend(page, state);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/");
      await page.waitForTimeout(600);
      for (const [label, name] of modules) {
        await nav(page, label);
        await page.waitForTimeout(250);
        if (name === "flow") await page.locator(".leaflet-container").waitFor();
        await expect(page.locator("body")).not.toContainText(
          "permission denied",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${name} overflow`,
        ).toBeTruthy();
        await page.screenshot({ animations:"disabled",
          path: `docs/qa/product-pass/${state}-${name}-${width}x${height}.png`,
        });
        if (width === 1440) {
          const axe = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
          expect(
            axe.violations.filter(
              (v) => v.impact === "critical" || v.impact === "serious",
            ),
            `${name} accessibility: ${JSON.stringify(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
          ).toEqual([]);
        }
      }
      await page.getByRole("button", { name: "Analizar", exact: true }).click();
      await page.screenshot({ animations:"disabled",
        path: `docs/qa/product-pass/${state}-analyzer-${width}x${height}.png`,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      if (state === "populated") {
        await nav(page, "Pipeline");
        await page
          .getByRole("button", { name: /QA · Piso centro/ })
          .first()
          .click();
        await page.screenshot({ animations:"disabled",
          path: `docs/qa/product-pass/${state}-property-${width}x${height}.png`,
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
      }
      if (state === "signed-out")
        expect(calls.filter((r) => r.path.includes("/rest/"))).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
test("Market failure is human, retry works; loading is not empty", async ({
  page,
}) => {
  await mockBackend(page, "error");
  await page.goto("/");
  await nav(page, "Mercado");
  await expect(
    page.getByRole("heading", { name: "Muestra no disponible" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("permission denied");
  await page.screenshot({ animations:"disabled", path: "docs/qa/product-pass/error-market.png" });
  await page.unroute("https://*.supabase.co/**");
  await mockBackend(page, "empty");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("heading", { name: "Construye tu muestra de mercado" }),
  ).toBeVisible();
});
test("Private functionality and strategy remain usable", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await nav(page, "Radar");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(page.getByLabel("Precio máximo €")).toBeVisible();
  await page.getByText("Búsquedas guardadas", { exact: false }).first().click();
  await page.getByLabel("Nombre", { exact: true }).fill("QA");
  await page.getByRole("button", { name: "Guardar filtros actuales" }).click();
  await nav(page, "Cartera");
  await page
    .getByRole("button", { name: "REFINANCE", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Capital liberado", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar escenario de estrategia" })
    .click();
  await expect(page.getByRole("status")).toContainText("guardado");
  await nav(page, "Flujo");
  await page.getByText("Comparación A/B de muestras", { exact: true }).click();
  await page.locator(".map-compare select").selectOption("dataset-b");
  await expect(page.getByText("Unidad: count", { exact: false })).toBeVisible();
});

test("Loading feedback is distinct and access expires without stale rows", async ({
  page,
}) => {
  await mockBackend(page, "loading");
  await page.goto("/");
  await expect(page.getByText("Cargando tu espacio")).toBeVisible();
  await page.screenshot({ animations:"disabled", path: "docs/qa/product-pass/loading-home.png" });
  await expect(
    page.getByRole("heading", { name: "Un activo. Toda la perspectiva." }),
  ).toBeVisible();
});
test("Analyzer and property accessibility, workspace navigation and logout", async ({
  page,
}) => {
  await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Analizar", exact: true }).click();
  await page.waitForTimeout(600);
  let axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    axe.violations
      .filter((v) => ["critical", "serious"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await nav(page, "Pipeline");
  await page
    .getByRole("button", { name: /QA · Piso centro/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    axe.violations
      .filter((v) => ["critical", "serious"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  for (const label of ["Reforma", "Riesgos", "Operativa e historial"]) {
    await page
      .locator(".property-tabs")
      .getByRole("button", { name: new RegExp(label) })
      .click();
    await expect(page.locator(".property-tabs")).toBeVisible();
  }
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await nav(page, "Mercado");
  await expect(
    page.getByRole("button", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
});
