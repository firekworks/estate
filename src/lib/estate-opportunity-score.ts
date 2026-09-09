import type { SavedDeal } from "@/lib/estate-store";
import { dealInput, dealOutput, latestAnalysis, listingPrice } from "@/components/estate-primitives";

export type OpportunityScoreComponent = {
  key: "finance" | "market" | "tenant" | "property" | "risk";
  label: string;
  score: number | null;
  confidence: number;
  weight: number;
};

export type OpportunityScore = {
  score: number;
  rankScore: number;
  coverage: number;
  components: OpportunityScoreComponent[];
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function conditionScore(condition: SavedDeal["condition"]) {
  const map: Record<string, number> = {
    new: 100,
    renovated: 96,
    good: 82,
    dated: 60,
    light_renovation: 58,
    medium_renovation: 42,
    full_renovation: 22,
  };
  return condition ? map[condition] ?? null : null;
}

function propertyScore(deal: SavedDeal) {
  const values: Array<{ value: number; weight: number }> = [];
  const base = conditionScore(deal.condition);
  if (base !== null) values.push({ value: base, weight: 0.45 });

  const imageScores = (deal.estate_property_images ?? [])
    .map((image) => image.condition_score)
    .filter((value): value is number => typeof value === "number");
  if (imageScores.length) {
    values.push({ value: imageScores.reduce((sum, value) => sum + value, 0) / imageScores.length, weight: 0.35 });
  }

  const factChecks = [
    deal.built_area_m2,
    deal.usable_area_m2,
    deal.bedrooms,
    deal.bathrooms,
    deal.floor_label,
    deal.has_elevator,
    deal.features?.electricity,
    deal.features?.plumbing,
  ];
  const facts = factChecks.filter((value) => value !== null && value !== undefined && value !== "").length / factChecks.length;
  if (facts > 0) values.push({ value: facts * 100, weight: 0.2 });

  if (!values.length) return { score: null, confidence: 0 };
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return {
    score: values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight,
    confidence: clamp(45 + imageScores.length * 8 + facts * 35, 0, 100) / 100,
  };
}

function marketScore(deal: SavedDeal) {
  const input = dealInput(deal);
  const price = listingPrice(deal);
  const estimates = deal.estate_market_estimates ?? [];
  const sale = estimates.find((item) => item.estimate_type === "sale");
  const marketValue = sale?.value_mid ?? input?.marketValueEstimate ?? 0;
  if (!price || !marketValue) return { score: null, confidence: 0 };
  const discountPct = ((marketValue - price) / marketValue) * 100;
  const score = clamp(58 + discountPct * 2.4);
  const confidence = sale?.confidence ?? latestAnalysis(deal)?.data_confidence ?? input?.dataConfidence ?? 0.4;
  return { score, confidence: clamp(confidence, 0, 1) };
}

function tenantScore(deal: SavedDeal) {
  const zone = deal.features?.zone;
  if (!zone) return { score: null, confidence: 0 };
  const metrics = [
    { value: zone.rentalDemand, weight: 0.45 },
    { value: zone.mobility, weight: 0.2 },
    { value: zone.amenities, weight: 0.2 },
    { value: zone.liquidity, weight: 0.15 },
  ].filter((item): item is { value: number; weight: number } => typeof item.value === "number");
  if (!metrics.length) return { score: null, confidence: 0 };
  const total = metrics.reduce((sum, item) => sum + item.weight, 0);
  let score = metrics.reduce((sum, item) => sum + item.value * item.weight, 0) / total;

  const strategy = deal.features?.rentalStrategy;
  if (strategy === "rooms" && (deal.bedrooms ?? 0) >= 3) score += 4;
  if (deal.features?.tenantProfile) score += 2;

  return {
    score: clamp(score),
    confidence: clamp((zone.confidence ?? 0.45) * 100 + metrics.length * 7, 0, 100) / 100,
  };
}

function riskScore(deal: SavedDeal) {
  const risks = deal.estate_risks ?? [];
  if (!risks.length) return { score: null, confidence: 0 };
  const unresolved = risks.filter((risk) => !risk.resolved_at);
  if (unresolved.some((risk) => risk.is_kill_switch)) return { score: 0, confidence: 1 };
  const penalty = unresolved.reduce((sum, risk) => sum + risk.severity * Math.max(0.35, risk.confidence), 0) / Math.max(1, risks.length);
  return { score: clamp(100 - penalty), confidence: clamp(55 + risks.length * 8, 0, 100) / 100 };
}

export function opportunityScore(deal: SavedDeal): OpportunityScore {
  const out = dealOutput(deal);
  const analysis = latestAnalysis(deal);
  const market = marketScore(deal);
  const tenant = tenantScore(deal);
  const property = propertyScore(deal);
  const risk = riskScore(deal);

  const components: OpportunityScoreComponent[] = [
    {
      key: "finance",
      label: "Finanzas",
      score: out?.score ?? null,
      confidence: out ? clamp((analysis?.outputs.scoreCoverage ?? 0.5) * 100, 0, 100) / 100 : 0,
      weight: 40,
    },
    { key: "market", label: "Mercado", score: market.score, confidence: market.confidence, weight: 15 },
    { key: "tenant", label: "Inquilino", score: tenant.score, confidence: tenant.confidence, weight: 15 },
    { key: "property", label: "Inmueble", score: property.score, confidence: property.confidence, weight: 15 },
    { key: "risk", label: "Riesgo", score: risk.score, confidence: risk.confidence, weight: 15 },
  ];

  const available = components.filter((component) => component.score !== null && component.confidence > 0);
  if (!available.length) return { score: 0, rankScore: 0, coverage: 0, components };

  const weightedDenominator = available.reduce((sum, component) => sum + component.weight * component.confidence, 0);
  const score = weightedDenominator > 0
    ? available.reduce((sum, component) => sum + (component.score ?? 0) * component.weight * component.confidence, 0) / weightedDenominator
    : 0;
  const coverage = clamp(available.reduce((sum, component) => sum + component.weight * component.confidence, 0), 0, 100);
  const rankScore = score * (0.65 + (coverage / 100) * 0.35);

  return {
    score: Math.round(score * 10) / 10,
    rankScore: Math.round(rankScore * 10) / 10,
    coverage: Math.round(coverage),
    components,
  };
}
