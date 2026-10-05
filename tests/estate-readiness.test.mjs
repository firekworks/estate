import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisReadiness,
  analyzeReadyDeal,
  ESSENTIAL_COSTS,
} from "../src/lib/estate-readiness.ts";
export const completeInput = {
  ...Object.fromEntries(ESSENTIAL_COSTS.map((k) => [k, 0])),
  purchasePrice: 85000,
  monthlyRent: 650,
  builtAreaM2: 80,
  ltvPct: 60,
  interestPct: 3,
  termYears: 25,
  targetNetYieldPct: 7,
  dataConfidence: 0.5,
  monthlySavings: 0,
  nextCapitalTarget: 20000,
  recoverableCapital: 0,
};
const draft = {
  title: "Inmueble de prueba",
  municipality: "Castalla",
  province: "Alicante",
  propertyType: "apartment",
  features: { costsReviewed: true },
};
test("untouched defaults are EMPTY and never run the financial engine", () => {
  const d = { ...draft, title: "", municipality: "", features: {} };
  const i = {
    ...completeInput,
    purchasePrice: 0,
    monthlyRent: 0,
    builtAreaM2: 0,
  };
  assert.equal(analysisReadiness(d, i).state, "EMPTY");
  assert.equal(analysisReadiness(d, i).coverage, 0);
  assert.equal(analyzeReadyDeal(d, i), null);
});
test("each missing critical datum suppresses all calculated outputs", () => {
  for (const key of ["purchasePrice", "monthlyRent", "builtAreaM2"])
    for (const value of [0, -1, NaN, Infinity, undefined, null])
      assert.equal(
        analyzeReadyDeal(draft, { ...completeInput, [key]: value }),
        null,
        `${key} ${value}`,
      );
  for (const key of ["title", "municipality", "propertyType"])
    assert.equal(
      analyzeReadyDeal({ ...draft, [key]: "" }, completeInput),
      null,
    );
  assert.equal(
    analyzeReadyDeal({ ...draft, features: {} }, completeInput),
    null,
  );
});
test("explicit zero costs are valid only after review; invalid costs and financing never calculate", () => {
  assert.ok(analyzeReadyDeal(draft, completeInput));
  for (const k of ESSENTIAL_COSTS)
    assert.equal(analyzeReadyDeal(draft, { ...completeInput, [k]: NaN }), null);
  assert.equal(
    analyzeReadyDeal(draft, { ...completeInput, vacancyPct: 100 }),
    null,
  );
  assert.equal(
    analyzeReadyDeal(draft, { ...completeInput, termYears: 0 }),
    null,
  );
  assert.ok(
    analyzeReadyDeal(draft, {
      ...completeInput,
      financingMode: "cash",
      termYears: 0,
    }),
  );
});
test("estimated versus validated follows traceable evidence, independent from confidence", () => {
  assert.equal(
    analysisReadiness(draft, { ...completeInput, dataConfidence: 1 }).state,
    "ESTIMATED",
  );
  const evidence = Object.fromEntries(
    ["price", "area", "rent", "costs"].map((k) => [
      k,
      { kind: "fact", source: "Verified document", observedAt: "2026-10-03" },
    ]),
  );
  assert.equal(
    analysisReadiness(
      { ...draft, features: { costsReviewed: true, evidence } },
      completeInput,
    ).state,
    "VALIDATED",
  );
  delete evidence.rent;
  assert.equal(
    analysisReadiness(
      { ...draft, features: { costsReviewed: true, evidence } },
      completeInput,
    ).state,
    "ESTIMATED",
  );
});
