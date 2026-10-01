export const ESTATE_ENGINE_VERSION = "estate_financial_v2.0.0";

export type DealInputs = {
  purchasePrice: number;
  financingMode?: "cash" | "mortgage" | "seller";
  minMonthlyCashFlow?: number;
  minDscr?: number;
  marketComparableCeiling?: number;
  financingLoanLimit?: number;
  availableCapital?: number;
  appraisalValue?: number;
  unexpectedCapex?: number;
  combinedStress?: { rentPct: number; vacancyPp: number; ratePp: number; renovationPct: number; capex: number };
  marketValueEstimate?: number;
  monthlyRent: number;
  builtAreaM2: number;
  purchaseTaxPct: number;
  ltvPct: number;
  interestPct: number;
  termYears: number;
  notaryRegistry: number;
  appraisal: number;
  financingFees: number;
  renovation: number;
  furniture: number;
  reserve: number;
  communityMonthly: number;
  ibiAnnual: number;
  insuranceAnnual: number;
  maintenanceMonthly: number;
  managementPct: number;
  vacancyPct: number;
  otherMonthly: number;
  monthlySavings: number;
  nextCapitalTarget: number;
  recoverableCapital: number;
  targetNetYieldPct: number;
  daysOnMarket?: number;
  priceDrops?: number;
  dataConfidence: number;
};

export type StressScenario = {
  key: string;
  label: string;
  monthlyCashFlow: number;
  cashOnCashPct: number;
  dscr: number | null;
  capitalRequired: number;
  passes: boolean;
  equity: number | null;
  valuation: number | null;
};

export type ScoreComponent = {
  key: string;
  label: string;
  score: number;
  confidence: number;
  weight: number;
  reason: string;
};

export type DealAnalysis = {
  engineVersion: string;
  loanAmount: number;
  downPayment: number;
  mortgageMonthly: number;
  purchaseTax: number;
  acquisitionCosts: number;
  projectCosts: number;
  capitalRequired: number;
  pricePerM2: number;
  effectiveRentMonthly: number;
  operatingExpensesMonthly: number;
  noiMonthly: number;
  netMonthlyCashFlow: number;
  grossYieldPct: number;
  netYieldPct: number;
  cashOnCashPct: number;
  capRatePct: number;
  capRateBasis: "market_value" | "purchase_price";
  yieldOnCostPct: number;
  purchaseCeilings: Record<string, number | null>;
  limitingCeiling: string | null;
  dscr: number | null;
  maxPurchasePrice: number | null;
  recommendedOpeningOffer: number | null;
  capitalVelocityMonths: number | null;
  score: number;
  scoreCoverage: number;
  scoreComponents: ScoreComponent[];
  stress: StressScenario[];
  stressStatus: "green" | "orange" | "red";
  verdict: "DESCARTAR" | "MONITORIZAR" | "ANALIZAR" | "VISITAR" | "NEGOCIAR";
  strengths: string[];
  weaknesses: string[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const pct = (value: number) => clamp(value, 0, 100) / 100;

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function mortgagePayment(
  principal: number,
  annualRatePct: number,
  years: number,
) {
  if (principal <= 0 || years <= 0) return 0;
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = Math.max(0, annualRatePct) / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return principal * ((monthlyRate * growth) / (growth - 1));
}

function operationsAt(
  input: DealInputs,
  rentFactor = 1,
  rateDeltaPct = 0,
  renovationFactor = 1,
) {
  const purchasePrice = Math.max(0, input.purchasePrice);
  const loanAmount = input.financingMode === "cash" ? 0 : purchasePrice * pct(input.ltvPct);
  const downPayment = purchasePrice - loanAmount;
  const purchaseTax = purchasePrice * pct(input.purchaseTaxPct);
  const acquisitionFixed =
    Math.max(0, input.notaryRegistry) +
    Math.max(0, input.appraisal) +
    Math.max(0, input.financingFees);
  const renovation = Math.max(0, input.renovation) * renovationFactor;
  const projectCosts =
    purchasePrice +
    purchaseTax +
    acquisitionFixed +
    renovation +
    Math.max(0, input.furniture);
  const capitalRequired =
    downPayment +
    purchaseTax +
    acquisitionFixed +
    renovation +
    Math.max(0, input.furniture) +
    Math.max(0, input.reserve);
  const scheduledRentMonthly = Math.max(0, input.monthlyRent) * rentFactor;
  const effectiveRentMonthly = scheduledRentMonthly * (1 - pct(input.vacancyPct));
  const managementMonthly = effectiveRentMonthly * pct(input.managementPct);
  const operatingExpensesMonthly =
    Math.max(0, input.communityMonthly) +
    Math.max(0, input.ibiAnnual) / 12 +
    Math.max(0, input.insuranceAnnual) / 12 +
    Math.max(0, input.maintenanceMonthly) +
    managementMonthly +
    Math.max(0, input.otherMonthly);
  const noiMonthly = effectiveRentMonthly - operatingExpensesMonthly;
  const mortgageMonthly = mortgagePayment(
    loanAmount,
    Math.max(0, input.interestPct + rateDeltaPct),
    input.termYears,
  );
  const netMonthlyCashFlow = noiMonthly - mortgageMonthly;
  const annualDebtService = mortgageMonthly * 12;
  const dscr = annualDebtService > 0 ? (noiMonthly * 12) / annualDebtService : null;
  const cashOnCashPct =
    capitalRequired > 0 ? (netMonthlyCashFlow * 12 * 100) / capitalRequired : 0;

  return {
    loanAmount,
    downPayment,
    mortgageMonthly,
    purchaseTax,
    acquisitionFixed,
    projectCosts,
    capitalRequired,
    effectiveRentMonthly,
    operatingExpensesMonthly,
    noiMonthly,
    netMonthlyCashFlow,
    dscr,
    cashOnCashPct,
  };
}

function scoreCashFlow(value: number) {
  if (value <= 0) return clamp(25 + value / 8, 0, 25);
  if (value >= 500) return 100;
  return clamp(35 + value / 7.7, 0, 100);
}

function scoreYield(netYieldPct: number, targetPct: number) {
  if (targetPct <= 0) return clamp(netYieldPct * 10, 0, 100);
  const ratio = netYieldPct / targetPct;
  return clamp(30 + ratio * 55, 0, 100);
}

function scoreDscr(value: number | null) {
  if (value === null) return 85;
  if (value <= 0.9) return 15;
  if (value >= 1.6) return 100;
  return clamp(15 + ((value - 0.9) / 0.7) * 85, 0, 100);
}

function scoreVelocity(months: number | null) {
  if (months === null) return 25;
  if (months <= 12) return 100;
  if (months <= 18) return 90;
  if (months <= 24) return 78;
  if (months <= 36) return 60;
  if (months <= 48) return 45;
  if (months <= 60) return 30;
  return 15;
}

function scoreNegotiation(days?: number, drops?: number) {
  if (days === undefined && drops === undefined) return null;
  let result = 35;
  const d = Math.max(0, days ?? 0);
  const p = Math.max(0, drops ?? 0);
  if (d >= 60) result += 10;
  if (d >= 120) result += 12;
  if (d >= 240) result += 13;
  if (d >= 365) result += 8;
  result += Math.min(22, p * 7);
  return clamp(result, 0, 100);
}

export function analyzeDeal(raw: DealInputs): DealAnalysis {
  const input: DealInputs = {
    ...raw,
    purchasePrice: Math.max(0, raw.purchasePrice),
    monthlyRent: Math.max(0, raw.monthlyRent),
    builtAreaM2: Math.max(0, raw.builtAreaM2),
    dataConfidence: clamp(raw.dataConfidence, 0, 1),
  };

  const base = operationsAt(input);
  const grossYieldPct =
    input.purchasePrice > 0 ? (input.monthlyRent * 12 * 100) / input.purchasePrice : 0;
  const netYieldPct =
    base.projectCosts > 0 ? (base.noiMonthly * 12 * 100) / base.projectCosts : 0;
  const capRateValue = input.marketValueEstimate && input.marketValueEstimate > 0 ? input.marketValueEstimate : input.purchasePrice;
  const capRatePct = capRateValue > 0 ? base.noiMonthly * 12 * 100 / capRateValue : 0;
  const pricePerM2 = input.builtAreaM2 > 0 ? input.purchasePrice / input.builtAreaM2 : 0;

  const targetYield = input.targetNetYieldPct / 100;
  const nonPriceCosts =
    base.acquisitionFixed + Math.max(0, input.renovation) + Math.max(0, input.furniture);
  const yieldCeiling =
    targetYield > 0 && base.noiMonthly > 0
      ? Math.max(
          0,
          ((base.noiMonthly * 12) / targetYield - nonPriceCosts) /
            (1 + pct(input.purchaseTaxPct)),
        )
      : null;

  // Each ceiling is nullable when the investor has not supplied the constraint.
  // Zero is an applicable limit, never silently filtered out.
  const leverage = input.financingMode === "cash" ? 0 : pct(input.ltvPct);
  const debtPerEuro = mortgagePayment(leverage, input.interestPct, input.termYears);
  const validLimit = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const purchaseCeilings: Record<string, number | null> = {
    yield: yieldCeiling,
    cashflow: validLimit(input.minMonthlyCashFlow) && debtPerEuro > 0 ? Math.max(0, (base.noiMonthly - input.minMonthlyCashFlow!) / debtPerEuro) : validLimit(input.minMonthlyCashFlow) && base.noiMonthly < input.minMonthlyCashFlow! ? 0 : null,
    dscr: input.minDscr && input.minDscr > 0 && debtPerEuro > 0 ? Math.max(0, base.noiMonthly / (input.minDscr * debtPerEuro)) : null,
    market_comps: validLimit(input.marketComparableCeiling) ? input.marketComparableCeiling! : null,
    financing: validLimit(input.financingLoanLimit) && leverage > 0 ? input.financingLoanLimit! / leverage : null,
    available_capital: validLimit(input.availableCapital) ? Math.max(0, (input.availableCapital! - nonPriceCosts - Math.max(0, input.reserve)) / (1 - leverage + pct(input.purchaseTaxPct))) : null,
    appraisal: validLimit(input.appraisalValue) && leverage > 0 ? input.appraisalValue! : null,
  };
  const applicable = Object.entries(purchaseCeilings).filter((entry): entry is [string, number] => entry[1] !== null && Number.isFinite(entry[1]));
  const limiting = applicable.sort((a, b) => a[1] - b[1])[0];
  const maxPurchasePrice = limiting?.[1] ?? null;
  const negotiationSignal = scoreNegotiation(input.daysOnMarket, input.priceDrops);
  // Opening offer is an explicit strategy assumption, not a seller-motivation inference.
  const recommendedOpeningOffer = maxPurchasePrice === null ? null : Math.min(input.purchasePrice, maxPurchasePrice) * 0.95;

  const monthlyCapitalGeneration =
    Math.max(0, input.monthlySavings) + Math.max(0, base.netMonthlyCashFlow);
  const capitalGap = Math.max(
    0,
    Math.max(0, input.nextCapitalTarget) - Math.max(0, input.recoverableCapital),
  );
  const capitalVelocityMonths =
    capitalGap === 0
      ? 0
      : monthlyCapitalGeneration > 0
        ? capitalGap / monthlyCapitalGeneration
        : null;

  const combined = input.combinedStress;
  const stressDefinitions: Array<{key:string; label:string; rent?:number; rate?:number; renovation?:number; vacancy?:number; capex?:number; valueFactor?:number}> = [
    { key: "base", label: "Base" },
    { key: "rent_10", label: "Alquiler −10%", rent: .9 },
    { key: "rent_20", label: "Alquiler −20%", rent: .8 },
    { key: "vacancy_10", label: "Vacancia +10 pp", vacancy: 10 },
    { key: "empty_2", label: "2 meses adicionales sin renta", vacancy: 100 / 6 },
    { key: "rate_1", label: "Interés +1 pp", rate: 1 },
    { key: "rate_2", label: "Interés +2 pp", rate: 2 },
    { key: "rehab_15", label: "Reforma +15%", renovation: 1.15 },
    { key: "rehab_30", label: "Reforma +30%", renovation: 1.3 },
    { key: "rehab_50", label: "Reforma +50%", renovation: 1.5 },
    ...(input.unexpectedCapex === undefined ? [] : [{ key: "capex", label: "CAPEX imprevisto", capex: input.unexpectedCapex }]),
    ...(input.marketValueEstimate ? [{ key: "value_10", label: "Valor de mercado −10%", valueFactor: .9 }] : []),
    ...(input.appraisalValue ? [{ key: "appraisal_10", label: "Tasación −10%", capex: input.appraisalValue * .1 * leverage, valueFactor: .9 }] : []),
    ...(combined ? [{key: "combined", label: "Escenario combinado", rent: Math.max(0,1 + combined.rentPct / 100), vacancy: combined.vacancyPp, rate: combined.ratePp, renovation: Math.max(0,1 + combined.renovationPct / 100), capex: combined.capex}] : []),
  ];
  const stress: StressScenario[] = stressDefinitions.map((scenario) => {
    const result = operationsAt({...input, vacancyPct: clamp(input.vacancyPct + (scenario.vacancy ?? 0),0,100)}, scenario.rent ?? 1, scenario.rate ?? 0, scenario.renovation ?? 1);
    const capex = Math.max(0, scenario.capex ?? 0);
    const capital = result.capitalRequired + capex;
    const valuationBase = scenario.key === "appraisal_10" ? input.appraisalValue : input.marketValueEstimate;
    const valuation = valuationBase ? valuationBase * (scenario.valueFactor ?? 1) : null;
    const equity = valuation === null ? null : valuation - result.loanAmount;
    const firstYearCash = result.netMonthlyCashFlow * 12 - capex;
    return {
      key: scenario.key, label: scenario.label,
      monthlyCashFlow: round(firstYearCash / 12),
      cashOnCashPct: capital > 0 ? round(firstYearCash * 100 / capital) : 0,
      dscr: result.dscr === null ? null : round(result.dscr, 3),
      capitalRequired: round(capital), valuation, equity,
      passes: firstYearCash >= 0 && (result.dscr === null || result.dscr >= (input.minDscr ?? 1)) && (input.availableCapital === undefined || capital <= input.availableCapital) && (equity === null || equity >= 0),
    };
  });
  const adversePasses = stress.slice(1).filter((s) => s.passes).length;
  const adverseCount = stress.length - 1;
  const stressStatus: DealAnalysis["stressStatus"] = adversePasses === adverseCount ? "green" : adversePasses >= adverseCount / 2 ? "orange" : "red";

  const components: ScoreComponent[] = [
    {
      key: "cashflow",
      label: "Cash-flow",
      score: scoreCashFlow(base.netMonthlyCashFlow),
      confidence: input.dataConfidence,
      weight: 24,
      reason: `${round(base.netMonthlyCashFlow)} €/mes netos tras vacancia, gastos e hipoteca.`,
    },
    {
      key: "yield",
      label: "Rentabilidad neta",
      score: scoreYield(netYieldPct, input.targetNetYieldPct),
      confidence: input.dataConfidence,
      weight: 18,
      reason: `${round(netYieldPct)}% neto antes de financiación frente a objetivo ${round(input.targetNetYieldPct)}%.`,
    },
    {
      key: "dscr",
      label: "Cobertura de deuda",
      score: scoreDscr(base.dscr),
      confidence: 0.95,
      weight: 15,
      reason:
        base.dscr === null
          ? "Sin deuda: no aplica DSCR."
          : `DSCR ${round(base.dscr, 2)}×; por encima de 1× cubre el servicio de deuda.`,
    },
    {
      key: "velocity",
      label: "Capital velocity",
      score: scoreVelocity(capitalVelocityMonths),
      confidence: 0.85,
      weight: 18,
      reason:
        capitalVelocityMonths === null
          ? "Con el ahorro y cash-flow indicados no se alcanza el siguiente objetivo."
          : `${round(capitalVelocityMonths, 1)} meses para el siguiente objetivo de capital bajo los supuestos actuales.`,
    },
    {
      key: "stress",
      label: "Resistencia",
      score: clamp(25 + adversePasses / adverseCount * 75, 0, 100),
      confidence: 0.9,
      weight: 15,
      reason: `${adversePasses}/${adverseCount} escenarios adversos mantienen cash-flow ≥ 0 y DSCR ≥ 1×.`,
    },
    {
      key: "confidence",
      label: "Calidad de datos",
      score: input.dataConfidence * 100,
      confidence: 1,
      weight: 10,
      reason: `${round(input.dataConfidence * 100)}% de confianza declarada para los datos de mercado usados.`,
    },
  ];

  if (negotiationSignal !== null) {
    components.push({
      key: "negotiation",
      label: "Negociación",
      score: negotiationSignal,
      confidence: 0.6,
      weight: 8,
      reason: `${Math.max(0, input.daysOnMarket ?? 0)} días en mercado y ${Math.max(0, input.priceDrops ?? 0)} bajadas registradas; señal orientativa, no prueba de urgencia del vendedor.`,
    });
  }

  if (input.marketValueEstimate && input.marketValueEstimate > 0) {
    const discount =
      ((input.marketValueEstimate - input.purchasePrice) / input.marketValueEstimate) * 100;
    components.push({
      key: "value",
      label: "Precio vs. valor",
      score: clamp(50 + discount * 3, 0, 100),
      confidence: input.dataConfidence,
      weight: 10,
      reason: `${round(discount)}% ${discount >= 0 ? "por debajo" : "por encima"} del valor de mercado introducido.`,
    });
  }

  const weighted = components.reduce(
    (acc, item) => {
      const effectiveWeight = item.weight * item.confidence;
      acc.total += item.score * effectiveWeight;
      acc.weight += effectiveWeight;
      acc.nominalWeight += item.weight;
      return acc;
    },
    { total: 0, weight: 0, nominalWeight: 0 },
  );
  const score = weighted.weight > 0 ? weighted.total / weighted.weight : 0;
  const nominalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const scoreCoverage =
    nominalWeight > 0
      ? components.reduce((sum, item) => sum + item.weight * item.confidence, 0) / nominalWeight
      : 0;

  let verdict: DealAnalysis["verdict"];
  if (score < 45 || stressStatus === "red") verdict = "DESCARTAR";
  else if (score < 58) verdict = "MONITORIZAR";
  else if (score < 70) verdict = "ANALIZAR";
  else if (score < 82) verdict = "VISITAR";
  else verdict = "NEGOCIAR";

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (base.netMonthlyCashFlow >= 250)
    strengths.push(`Cash-flow estimado de ${round(base.netMonthlyCashFlow)} €/mes.`);
  else if (base.netMonthlyCashFlow < 0)
    weaknesses.push(`Cash-flow negativo de ${round(base.netMonthlyCashFlow)} €/mes.`);
  if (netYieldPct >= input.targetNetYieldPct)
    strengths.push(`Rentabilidad neta supera el objetivo de ${round(input.targetNetYieldPct)}%.`);
  else
    weaknesses.push(`Rentabilidad neta por debajo del objetivo de ${round(input.targetNetYieldPct)}%.`);
  if (base.dscr !== null && base.dscr >= 1.25)
    strengths.push(`Cobertura de deuda sólida: DSCR ${round(base.dscr, 2)}×.`);
  if (base.dscr !== null && base.dscr < 1)
    weaknesses.push(`El NOI no cubre completamente la deuda: DSCR ${round(base.dscr, 2)}×.`);
  if (stressStatus === "green") strengths.push("Supera todos los stress tests definidos.");
  if (stressStatus === "red") weaknesses.push("Falla la mayoría de escenarios adversos.");
  if (input.dataConfidence < 0.6)
    weaknesses.push("Confianza de datos baja: verificar alquiler, gastos y comparables antes de decidir.");

  return {
    engineVersion: ESTATE_ENGINE_VERSION,
    loanAmount: round(base.loanAmount),
    downPayment: round(base.downPayment),
    mortgageMonthly: round(base.mortgageMonthly),
    purchaseTax: round(base.purchaseTax),
    acquisitionCosts: round(base.purchaseTax + base.acquisitionFixed),
    projectCosts: round(base.projectCosts),
    capitalRequired: round(base.capitalRequired),
    pricePerM2: round(pricePerM2),
    effectiveRentMonthly: round(base.effectiveRentMonthly),
    operatingExpensesMonthly: round(base.operatingExpensesMonthly),
    noiMonthly: round(base.noiMonthly),
    netMonthlyCashFlow: round(base.netMonthlyCashFlow),
    grossYieldPct: round(grossYieldPct),
    netYieldPct: round(netYieldPct),
    cashOnCashPct: round(base.cashOnCashPct),
    capRatePct: round(capRatePct),
    capRateBasis: input.marketValueEstimate && input.marketValueEstimate > 0 ? "market_value" : "purchase_price",
    yieldOnCostPct: round(netYieldPct),
    purchaseCeilings: Object.fromEntries(Object.entries(purchaseCeilings).map(([key,value]) => [key,value === null ? null : round(value)])),
    limitingCeiling: limiting?.[0] ?? null,
    dscr: base.dscr === null ? null : round(base.dscr, 3),
    maxPurchasePrice: maxPurchasePrice === null ? null : round(maxPurchasePrice),
    recommendedOpeningOffer:
      recommendedOpeningOffer === null ? null : round(recommendedOpeningOffer, 0),
    capitalVelocityMonths:
      capitalVelocityMonths === null ? null : round(capitalVelocityMonths, 1),
    score: round(score, 1),
    scoreCoverage: round(scoreCoverage, 3),
    scoreComponents: components.map((item) => ({
      ...item,
      score: round(item.score, 1),
      confidence: round(item.confidence, 3),
    })),
    stress,
    stressStatus,
    verdict,
    strengths,
    weaknesses,
  };
}
