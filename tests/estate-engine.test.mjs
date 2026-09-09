import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDeal, mortgagePayment } from "../src/lib/estate-engine.ts";

const BASE = {
  purchasePrice: 72000,
  marketValueEstimate: 68500,
  monthlyRent: 680,
  builtAreaM2: 78,
  purchaseTaxPct: 10,
  ltvPct: 80,
  interestPct: 3.25,
  termYears: 30,
  notaryRegistry: 1100,
  appraisal: 350,
  financingFees: 250,
  renovation: 4200,
  furniture: 1200,
  reserve: 2500,
  communityMonthly: 45,
  ibiAnnual: 320,
  insuranceAnnual: 240,
  maintenanceMonthly: 35,
  managementPct: 0,
  vacancyPct: 5,
  otherMonthly: 0,
  monthlySavings: 1200,
  nextCapitalTarget: 20000,
  recoverableCapital: 0,
  targetNetYieldPct: 8,
  daysOnMarket: 180,
  priceDrops: 2,
  dataConfidence: 0.72,
};

test("mortgage formula matches a known 100k / 3% / 30y annuity", () => {
  assert.ok(Math.abs(mortgagePayment(100000, 3, 30) - 421.6) < 0.1);
});

test("zero-interest mortgage is principal divided by months", () => {
  assert.equal(mortgagePayment(120000, 0, 10), 1000);
});

test("capital required includes down payment, acquisition costs, renovation, furniture and reserve", () => {
  const result = analyzeDeal(BASE);
  const expected =
    BASE.purchasePrice * (1 - BASE.ltvPct / 100) +
    BASE.purchasePrice * (BASE.purchaseTaxPct / 100) +
    BASE.notaryRegistry +
    BASE.appraisal +
    BASE.financingFees +
    BASE.renovation +
    BASE.furniture +
    BASE.reserve;

  assert.equal(result.capitalRequired, expected);
});

test("lower rent worsens cash-flow and cannot improve the stress outcome", () => {
  const base = analyzeDeal(BASE);
  const lower = analyzeDeal({ ...BASE, monthlyRent: BASE.monthlyRent * 0.8 });

  assert.ok(lower.netMonthlyCashFlow < base.netMonthlyCashFlow);
  assert.ok(lower.noiMonthly < base.noiMonthly);
});

test("higher target yield lowers the maximum purchase price", () => {
  const eight = analyzeDeal({ ...BASE, targetNetYieldPct: 8 });
  const ten = analyzeDeal({ ...BASE, targetNetYieldPct: 10 });

  assert.ok(eight.maxPurchasePrice !== null);
  assert.ok(ten.maxPurchasePrice !== null);
  assert.ok(ten.maxPurchasePrice < eight.maxPurchasePrice);
});

test("higher data confidence increases score coverage", () => {
  const low = analyzeDeal({ ...BASE, dataConfidence: 0.35 });
  const high = analyzeDeal({ ...BASE, dataConfidence: 0.95 });

  assert.ok(high.scoreCoverage > low.scoreCoverage);
});

test("stress scenarios are deterministic and include the defined adverse cases", () => {
  const first = analyzeDeal(BASE);
  const second = analyzeDeal(BASE);

  assert.deepEqual(first.stress, second.stress);
  assert.deepEqual(
    first.stress.map((scenario) => scenario.key),
    ["base", "rent_10", "rent_20", "rate_2", "rehab_30"],
  );
});

test("analysis never emits NaN/Infinity for zero purchase and zero rent", () => {
  const result = analyzeDeal({
    ...BASE,
    purchasePrice: 0,
    monthlyRent: 0,
    builtAreaM2: 0,
    ltvPct: 0,
  });

  for (const value of [
    result.capitalRequired,
    result.pricePerM2,
    result.netMonthlyCashFlow,
    result.grossYieldPct,
    result.netYieldPct,
    result.cashOnCashPct,
    result.score,
  ]) {
    assert.ok(Number.isFinite(value));
  }
});
