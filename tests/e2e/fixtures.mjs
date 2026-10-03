// Browser-only fixtures. Never imported by application code or sent to a backend.
import { analyzeDeal } from "../../src/lib/estate-engine.ts";
export const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "qa@example.test",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const inputs = {
  purchasePrice: 90000,
  marketValueEstimate: 110000,
  monthlyRent: 750,
  builtAreaM2: 95,
  purchaseTaxPct: 10,
  ltvPct: 60,
  interestPct: 3,
  termYears: 25,
  notaryRegistry: 1200,
  appraisal: 350,
  financingFees: 0,
  renovation: 9000,
  furniture: 1000,
  reserve: 3000,
  communityMonthly: 35,
  ibiAnnual: 280,
  insuranceAnnual: 240,
  maintenanceMonthly: 35,
  managementPct: 0,
  vacancyPct: 5,
  otherMonthly: 0,
  monthlySavings: 800,
  nextCapitalTarget: 30000,
  recoverableCapital: 0,
  targetNetYieldPct: 7,
  dataConfidence: 0.8,
  daysOnMarket: 82,
  priceDrops: 1,
};
export const deals = [
  "analyzing",
  "visit",
  "negotiating",
  "managed",
  "rehab",
].map((stage, i) => ({
  id: `00000000-0000-4000-8000-00000000001${i}`,
  title: `QA · ${["Piso centro", "Local comercial", "Vivienda exterior", "Piso en alquiler", "Casa en reforma"][i]}`,
  property_type: i === 1 ? "commercial" : "apartment",
  municipality: i % 2 ? "Ibi" : "Castalla",
  province: "Alicante",
  address: "Dirección de prueba aislada",
  stage,
  latitude: 38.596 + i * 0.002,
  longitude: -0.672 + i * 0.003,
  built_area_m2: 95,
  usable_area_m2: 85,
  bedrooms: 3,
  bathrooms: 1,
  floor_label: "2",
  has_elevator: true,
  has_terrace: false,
  has_balcony: true,
  has_garage: false,
  has_storage: false,
  has_pool: false,
  orientation: "sur",
  year_built: 1992,
  energy_rating: "D",
  condition: "good",
  features: { rentalStrategy: "long_term" },
  notes: "Fixture de QA local",
  updated_at: "2026-10-01T12:00:00Z",
  stage_entered_at: "2026-09-20T12:00:00Z",
  estate_tasks: [
    {
      id: `task-${i}`,
      title: "Revisar documentación",
      status: "open",
      due_at: "2026-10-04T12:00:00Z",
    },
  ],
  estate_listings: [
    {
      id: `listing-${i}`,
      asking_price: 90000,
      portal: "Fixture QA",
      url: "https://example.test/property",
      last_seen_at: "2026-10-01",
      first_seen_at: "2026-08-01",
      is_active: true,
    },
  ],
  estate_market_estimates: [],
  estate_property_images: [],
  estate_renovation_items: [],
  estate_risks:
    i === 1
      ? [
          {
            id: "risk-1",
            title: "Validar licencia",
            category: "legal",
            severity: 80,
            confidence: 0.8,
            is_kill_switch: true,
            resolved_at: null,
            created_at: "2026-10-01",
          },
        ]
      : [],
  estate_deal_analyses: [
    {
      inputs,
      outputs: analyzeDeal(inputs),
      score: 72,
      verdict: "VISITAR",
      data_confidence: 0.8,
      created_at: "2026-10-01",
    },
  ],
  estate_actual_performance:
    i >= 3
      ? [
          {
            id: `actual-${i}`,
            period: "2026-09-01",
            rent_received: 730,
            operating_expenses: 110,
            debt_payment: 250,
            capex: 0,
            debt_balance: 51000,
            valuation: 112000,
            occupied_days: 30,
            forecast: { outputs: { netMonthlyCashFlow: 380 } },
          },
        ]
      : [],
  estate_investor_cashflows:
    i >= 3
      ? [
          {
            id: `flow-${i}`,
            occurred_at: "2025-01-01",
            direction: "contribution",
            amount: 48000,
            source: "QA",
          },
          {
            id: `dist-${i}`,
            occurred_at: "2026-09-01",
            direction: "distribution",
            amount: 3000,
            source: "QA",
          },
        ]
      : [],
}));
export const comps = Array.from({ length: 16 }, (_, i) => ({
  id: `comp-${i}`,
  municipality: "Castalla",
  property_type: "apartment",
  transaction_type: "rent",
  price: 500 + i * 25,
  area_m2: 65 + i * 3,
  observed_at: "2026-09-25",
  similarity: i < 4 ? null : 0.8,
  url: `https://example.test/comparable/${i}`,
  source: "CSV de QA",
}));
export const datasets = [
  {
    id: "dataset-qa",
    name: "Muestra QA",
    source_key: "manual",
    mode: "walk",
    unit: "count",
    area_label: "Castalla",
    estate_mobility_points: [
      {
        lat: 38.596,
        lng: -0.672,
        value: 35,
        mode: "walk",
        label: "Aforo de prueba",
        observed_at: "2026-09-25T10:00:00Z",
      },
    ],
  },
  {
    id: "dataset-b",
    name: "Muestra B QA",
    source_key: "manual",
    mode: "walk",
    unit: "count",
    area_label: "Ibi",
    estate_mobility_points: [
      {
        lat: 38.598,
        lng: -0.67,
        value: 20,
        mode: "walk",
        label: "Aforo B",
        observed_at: "2026-09-25T10:00:00Z",
      },
    ],
  },
];
export async function mockBackend(page, state = "populated") {
  const requests = [];
  await page.route("https://*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, method: route.request().method() });
    if (url.pathname.startsWith("/auth/")) return route.fulfill({ json: user });
    if (state === "loading" && url.pathname.includes("estate_properties"))
      await new Promise((r) => setTimeout(r, 1200));
    if (state === "error" && url.pathname.includes("estate_comparables"))
      return route.fulfill({
        status: 403,
        json: {
          code: "42501",
          message: "permission denied for table estate_comparables",
        },
      });
    if (route.request().method() !== "GET") return route.fulfill({ json: [] });
    const populated = state === "populated" || state === "error";
    const table = url.pathname.split("/").at(-1);
    return route.fulfill({
      json: populated
        ? table === "estate_properties"
          ? deals
          : table === "estate_comparables"
            ? comps
            : table === "estate_mobility_datasets"
              ? datasets
              : []
        : [],
    });
  });
  if (state !== "signed-out")
    await page.addInitScript(
      ({ user }) => {
        const encode = (x) => btoa(JSON.stringify(x));
        const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.qa-signature`;
        localStorage.setItem(
          "sb-xmkhdjjnxlpwqeatiwfx-auth-token",
          JSON.stringify({
            access_token: token,
            refresh_token: "qa-only",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user,
          }),
        );
      },
      { user },
    );
  return requests;
}
