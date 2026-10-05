import { analyzeDeal, type DealInputs } from "./estate-engine.ts";
import type { PropertyDraft, SavedDeal } from "./estate-store";

export const MIN_ANALYSIS_COVERAGE = 80;
export const ESSENTIAL_COSTS = [
  "purchaseTaxPct",
  "notaryRegistry",
  "appraisal",
  "financingFees",
  "renovation",
  "furniture",
  "reserve",
  "communityMonthly",
  "ibiAnnual",
  "insuranceAnnual",
  "maintenanceMonthly",
  "managementPct",
  "vacancyPct",
  "otherMonthly",
] as const;
const positive = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n > 0;
const nonnegative = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;
export function analysisReadiness(draft: PropertyDraft, input: DealInputs) {
  const financed = input.financingMode !== "cash" && input.ltvPct > 0;
  const costs =
    ESSENTIAL_COSTS.every((k) => nonnegative(input[k])) &&
    input.purchaseTaxPct <= 100 &&
    input.vacancyPct < 100 &&
    input.managementPct <= 100;
  const financing =
    nonnegative(input.ltvPct) &&
    input.ltvPct <= 100 &&
    (!financed ||
      (positive(input.termYears) && nonnegative(input.interestPct)));
  const checks = [
    { key: "title", label: "Nombre", step: 0, ok: !!draft.title.trim() },
    {
      key: "municipality",
      label: "Municipio",
      step: 0,
      ok: !!draft.municipality.trim(),
    },
    {
      key: "assetType",
      label: "Tipo de activo",
      step: 0,
      ok: !!draft.propertyType,
    },
    {
      key: "area",
      label: "Superficie",
      step: 1,
      ok: positive(input.builtAreaM2),
    },
    {
      key: "price",
      label: "Precio",
      step: 2,
      ok: positive(input.purchasePrice),
    },
    {
      key: "rent",
      label: "Alquiler estimado",
      step: 2,
      ok: positive(input.monthlyRent),
    },
    { key: "financing", label: "Financiación", step: 3, ok: financing },
    {
      key: "costs",
      label: "Revisar costes esenciales",
      step: 4,
      ok: costs && draft.features?.costsReviewed === true,
    },
  ];
  const missing = checks.filter((c) => !c.ok);
  // Defaults never make an untouched operation look partly researched.
  const empty =
    !draft.title.trim() &&
    !draft.municipality.trim() &&
    !positive(input.builtAreaM2) &&
    !positive(input.purchasePrice) &&
    !positive(input.monthlyRent) &&
    !draft.listingUrl;
  const coverage = empty
    ? 0
    : Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const calculable = !missing.length && coverage >= MIN_ANALYSIS_COVERAGE;
  const verified = ["price", "area", "rent", "costs"].every((k) => {
    const e = draft.features?.evidence?.[k];
    return e?.kind === "fact" && !!e.source?.trim() && !!e.observedAt;
  });
  const state: "EMPTY" | "INCOMPLETE" | "ESTIMATED" | "VALIDATED" = empty
    ? "EMPTY"
    : !calculable
      ? "INCOMPLETE"
      : verified
        ? "VALIDATED"
        : "ESTIMATED";
  return {
    state,
    coverage,
    missing,
    calculable,
    confidence: Number.isFinite(input.dataConfidence)
      ? Math.max(0, Math.min(1, input.dataConfidence))
      : 0,
  };
}
export function analyzeReadyDeal(draft: PropertyDraft, input: DealInputs) {
  return analysisReadiness(draft, input).calculable ? analyzeDeal(input) : null;
}
export function draftForReadiness(deal: SavedDeal): PropertyDraft {
  return {
    title: deal.title ?? "",
    municipality: deal.municipality ?? "",
    province: deal.province ?? "",
    propertyType: deal.property_type,
    features: deal.features,
  };
}
export function savedAnalysisReady(deal: SavedDeal) {
  const input = deal.estate_deal_analyses?.[0]?.inputs;
  return (
    !!input && analysisReadiness(draftForReadiness(deal), input).calculable
  );
}
