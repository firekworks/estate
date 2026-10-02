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

const closeTo = (actual, expected, tolerance = 0.01) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("mortgage formula matches a known 100k / 3% / 30y annuity", () => {
  closeTo(mortgagePayment(100000, 3, 30), 421.6, 0.1);
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

  closeTo(result.capitalRequired, expected);
});

test("lower rent worsens cash-flow and NOI", () => {
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
    ["base", "rent_10", "rent_20", "vacancy_10", "empty_2", "rate_1", "rate_2", "rehab_15", "rehab_30", "rehab_50", "value_10"],
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

test("cap rate uses asset value while yield on cost includes acquisition and rehab",()=>{
 const r=analyzeDeal(BASE);closeTo(r.capRatePct,r.noiMonthly*12/BASE.marketValueEstimate*100,.01);
 closeTo(r.yieldOnCostPct,r.noiMonthly*12/r.projectCosts*100,.01);assert.notEqual(r.capRatePct,r.yieldOnCostPct);
});
test("zero available capital remains binding",()=>{const r=analyzeDeal({...BASE,availableCapital:0});assert.equal(r.maxPurchasePrice,0);assert.equal(r.limitingCeiling,'available_capital');});
test("maximum price satisfies each applicable ceiling",()=>{const r=analyzeDeal({...BASE,minDscr:1.4,minMonthlyCashFlow:150,availableCapital:25000,financingLoanLimit:50000,appraisalValue:65000,marketComparableCeiling:62000});for(const ceiling of Object.values(r.purchaseCeilings))if(ceiling!==null)assert.ok(r.maxPurchasePrice<=ceiling);});
test("cash financing removes debt service regardless of stale LTV",()=>{const r=analyzeDeal({...BASE,financingMode:'cash'});assert.equal(r.loanAmount,0);assert.equal(r.mortgageMonthly,0);assert.equal(r.dscr,null);});
test("seller amortizing financing uses same explicit loan terms",()=>{const r=analyzeDeal({...BASE,financingMode:'seller',interestPct:0,termYears:10,ltvPct:50});assert.equal(r.mortgageMonthly,300);});
test("combined stress and extra capex reduce cash and increase capital",()=>{const base=analyzeDeal(BASE);const r=analyzeDeal({...BASE,unexpectedCapex:12000,combinedStress:{rentPct:-20,vacancyPp:10,ratePp:2,renovationPct:50,capex:12000}});const stress=r.stress.find(s=>s.key==='combined');assert.ok(stress.monthlyCashFlow<base.netMonthlyCashFlow);assert.ok(stress.capitalRequired>base.capitalRequired);});
test("financing zero is a real ceiling only for financed deals",()=>{assert.equal(analyzeDeal({...BASE,financingLoanLimit:0}).maxPurchasePrice,0);assert.equal(analyzeDeal({...BASE,financingMode:'cash',financingLoanLimit:0}).purchaseCeilings.financing,null);});

 test("full financing with no purchase tax handles fixed capital without Infinity", () => {
  const funded = analyzeDeal({...BASE,ltvPct:100,purchaseTaxPct:0,availableCapital:10000});
  assert.equal(funded.purchaseCeilings.available_capital,null);
  const unfunded = analyzeDeal({...BASE,ltvPct:100,purchaseTaxPct:0,availableCapital:0});
  assert.equal(unfunded.purchaseCeilings.available_capital,0);
 });
 test("lower appraisal replaces debt with equity without treating equity as annual expense", () => {
  const result = analyzeDeal({...BASE,appraisalValue:BASE.purchasePrice});
  const stressed = result.stress.find(s=>s.key==='appraisal_10');
  closeTo(stressed.capitalRequired-result.capitalRequired,result.loanAmount*.1);
  assert.ok(stressed.monthlyCashFlow>result.netMonthlyCashFlow);
  closeTo(stressed.equity,BASE.purchasePrice*.9-result.loanAmount*.9);
 });
