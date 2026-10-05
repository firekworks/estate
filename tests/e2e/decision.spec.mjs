import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockBackend, deals } from "./fixtures.mjs";
const step = async (page, label) =>
  page
    .locator(".analyzer-stepper")
    .getByRole("button", { name: new RegExp("^" + label + " ·") })
    .click();
test("empty, incomplete, estimated and validated; cost changes revoke review; stress is keyboard dismissible", async ({
  page,
}) => {
  await mockBackend(page, "signed-out");
  await page.goto("/");
  await page.getByRole("button", { name: "Analizar", exact: true }).click();
  await expect(page.locator('[data-calculation-state="EMPTY"]')).toBeVisible();
  for (const label of [
    "Captura",
    "Inmueble",
    "Mercado",
    "Compra",
    "Operación",
    "Decisión",
  ]) {
    await step(page, label);
    await expect(page.locator(".analyzer-stepper .done")).toHaveCount(0);
    await expect(page.locator(".view-analyzer .score-dial")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Ver escenarios" }),
    ).toHaveCount(0);
  }
  await step(page, "Captura");
  await page.getByLabel("Nombre interno").fill("Operación QA");
  await page.getByLabel(/^Municipio/).fill("Castalla");
  await step(page, "Inmueble");
  await page.getByLabel("Superficie construida").fill("80");
  await step(page, "Mercado");
  await page.getByLabel("Precio anunciado").fill("85000");
  await page.getByLabel("Alquiler esperado").fill("650");
  await expect(
    page.locator('[data-calculation-state="INCOMPLETE"]'),
  ).toBeVisible();
  await step(page, "Operación");
  await page
    .getByRole("checkbox", {
      name: "He revisado los costes y los importes a cero",
    })
    .check();
  await expect(
    page.locator('[data-calculation-state="ESTIMATED"]'),
  ).toBeVisible();
  await step(page, "Decisión");
  await expect(page.locator(".analyzer-stepper .done")).toHaveCount(6);
  await expect(page.locator(".view-analyzer .score-dial")).toHaveCount(1);
  await expect(page.locator(".stress-matrix")).not.toBeVisible();
  await page.getByRole("button", { name: "Ver escenarios" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ver escenarios" }),
  ).toBeFocused();
  await page
    .getByText("Registrar evidencia verificada", { exact: true })
    .click();
  for (const label of ["Precio", "Superficie", "Alquiler", "Costes"])
    await page
      .getByLabel(`${label} · fuente verificada`)
      .fill("Documento QA comprobado");
  await expect(
    page.locator('[data-calculation-state="VALIDATED"]'),
  ).toBeVisible();
  await page.route("**/api/import", route=>route.fulfill({json:{url:"https://example.test/listing",portal:"manual",extraction:{status:"enriched"},listing:{asking_price:82000,built_area_m2:82}}}));
  await step(page,"Captura");
  await page.getByLabel("URL del anuncio").fill("https://example.test/listing");
  await page.getByRole("button",{name:"Importar anuncio"}).click();
  await expect(page.locator('[data-calculation-state="ESTIMATED"]')).toBeVisible();
  await step(page, "Operación");
  await page.getByLabel("IBI", { exact: false }).fill("320");
  await expect(
    page.locator('[data-calculation-state="INCOMPLETE"]'),
  ).toBeVisible();
  await expect(page.locator(".view-analyzer .score-dial")).toHaveCount(0);
});
test("legacy incomplete stored analysis cannot leak outputs through Radar or workspace", async ({
  page,
}) => {
  await mockBackend(page, "populated");
  await page.route("**/rest/v1/estate_properties?**", (route) =>
    route.fulfill({
      json: [
        {
          ...deals[0],
          features: {},
          estate_deal_analyses: [
            {
              ...deals[0].estate_deal_analyses[0],
              inputs: {
                ...deals[0].estate_deal_analyses[0].inputs,
                monthlyRent: 0,
              },
            },
          ],
        },
      ],
    }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Radar/ })
    .click();
  await expect(
    page.getByText("QA · Piso centro", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".deal-card .score-dial")).toHaveCount(0);
  await page
    .locator(".deal-card-main")
    .filter({ hasText: "QA · Piso centro" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Análisis incompleto" }),
  ).toBeVisible();
  await expect(page.locator(".view-property .score-dial")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ver escenarios" }),
  ).toHaveCount(0);
});
test("UI save and reload preserves inputs, cost review and analysis; fixture only, not real RLS", async ({
  page,
}) => {
  await mockBackend(page, "empty");
  let saved = null,
    saveCount = 0;
  await page.route("**/rest/v1/rpc/estate_save_analysis", async (route) => {
    const b = route.request().postDataJSON();
    saveCount++;
    saved = {
      ...deals[0],
      ...b.p_property,
      id: deals[0].id,
      estate_property_images: [],
      estate_deal_analyses: [
        {
          inputs: b.p_inputs,
          outputs: b.p_outputs,
          created_at: new Date().toISOString(),
          data_confidence: b.p_inputs.dataConfidence,
        },
      ],
    };
    await route.fulfill({ json: deals[0].id });
  });
  await page.route("**/rest/v1/estate_properties?**", (route) =>
    route.fulfill({ json: saved ? [saved] : [] }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Analizar", exact: true }).click();
  await page.getByLabel("Nombre interno").fill("Persistencia UI QA");
  await page.getByLabel(/^Municipio/).fill("Castalla");
  await step(page, "Inmueble");
  await page.getByLabel("Superficie construida").fill("80");
  await step(page, "Mercado");
  await page.getByLabel("Precio anunciado").fill("85000");
  await page.getByLabel("Alquiler esperado").fill("650");
  await step(page, "Operación");
  await page.getByRole("checkbox").check();
  await step(page, "Decisión");
  await page
    .getByRole("button", { name: "Crear workspace", exact: true })
    .click();
  await expect(page.locator(".view-property")).toBeVisible();
  expect(saveCount).toBe(1);
  expect(saved.features.costsReviewed).toBe(true);
  expect(saved.estate_deal_analyses[0].inputs.purchasePrice).toBe(85000);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Pipeline/ })
    .click();
  await page
    .getByRole("button", { name: /Persistencia UI QA/ })
    .first()
    .click();
  await expect(
    page.locator('[data-calculation-state="ESTIMATED"]'),
  ).toBeVisible();
  await page.locator(".view-property").evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    axe.violations.filter((v) => ["critical", "serious"].includes(v.impact)),
  ).toEqual([]);
});
