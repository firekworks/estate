import type { User } from "@supabase/supabase-js";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import { supabase } from "@/lib/supabase";

export type EstateStage =
  | "watchlist"
  | "analyzing"
  | "visit"
  | "negotiating"
  | "discarded"
  | "purchased"
  | "managed"
  | "sold";

export type PropertyDraft = {
  title: string;
  municipality: string;
  province: string;
  address?: string;
  listingUrl?: string;
  portal?: string;
  bedrooms?: number;
  bathrooms?: number;
  floorLabel?: string;
  hasElevator?: boolean;
  condition?:
    | "new"
    | "renovated"
    | "good"
    | "dated"
    | "light_renovation"
    | "medium_renovation"
    | "full_renovation"
    | "unknown";
};

export type SavedDeal = {
  id: string;
  title: string;
  municipality: string | null;
  province: string | null;
  address: string | null;
  stage: EstateStage;
  built_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_label: string | null;
  has_elevator: boolean | null;
  condition: PropertyDraft["condition"] | null;
  updated_at: string;
  estate_listings?: Array<{
    asking_price: number;
    portal: string;
    url: string | null;
  }>;
  estate_deal_analyses?: Array<{
    score: number | null;
    verdict: string | null;
    inputs: DealInputs;
    outputs: DealAnalysis;
    created_at: string;
  }>;
};

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message ?? "Error de Supabase");
}

export async function saveDeal(
  user: User,
  draft: PropertyDraft,
  input: DealInputs,
  analysis: DealAnalysis,
) {
  const { data: property, error: propertyError } = await supabase
    .from("estate_properties")
    .insert({
      user_id: user.id,
      title: draft.title.trim() || "Operación sin nombre",
      stage: "analyzing",
      property_type: "apartment",
      address: draft.address?.trim() || null,
      municipality: draft.municipality.trim() || null,
      province: draft.province.trim() || null,
      country_code: "ES",
      built_area_m2: input.builtAreaM2 || null,
      bedrooms: draft.bedrooms ?? null,
      bathrooms: draft.bathrooms ?? null,
      floor_label: draft.floorLabel?.trim() || null,
      has_elevator: draft.hasElevator ?? null,
      condition: draft.condition ?? "unknown",
      features: {
        source: "estate_v1",
        data_confidence: input.dataConfidence,
      },
    })
    .select("id")
    .single();

  throwIfError(propertyError);
  if (!property?.id) throw new Error("No se pudo crear la propiedad.");

  const propertyId = property.id as string;

  try {
    const { data: listing, error: listingError } = await supabase
      .from("estate_listings")
      .insert({
        user_id: user.id,
        property_id: propertyId,
        portal: draft.portal || "manual",
        url: draft.listingUrl?.trim() || null,
        asking_price: input.purchasePrice,
        seller_type: null,
        provenance: {
          entry: draft.listingUrl ? "url+manual" : "manual",
          captured_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();
    throwIfError(listingError);

    if (listing?.id) {
      const { error: historyError } = await supabase.from("estate_listing_history").insert({
        user_id: user.id,
        listing_id: listing.id,
        asking_price: input.purchasePrice,
        event_type: "snapshot",
        payload: { source: "estate_v1" },
      });
      throwIfError(historyError);
    }

    const { error: financeError } = await supabase
      .from("estate_financing_scenarios")
      .insert({
        user_id: user.id,
        property_id: propertyId,
        name: "Base V1",
        ltv_pct: input.ltvPct,
        interest_pct: input.interestPct,
        term_years: input.termYears,
        rate_type: "fixed",
        origination_fees: input.financingFees,
        insurance_monthly: input.insuranceAnnual / 12,
        assumptions: { source: "user_input" },
      });
    throwIfError(financeError);

    const { error: analysisError } = await supabase.from("estate_deal_analyses").insert({
      user_id: user.id,
      property_id: propertyId,
      strategy: "traditional_rental",
      model_version: analysis.engineVersion,
      inputs: input,
      outputs: analysis,
      score: analysis.score,
      score_components: analysis.scoreComponents,
      stress_test: {
        status: analysis.stressStatus,
        scenarios: analysis.stress,
      },
      data_confidence: input.dataConfidence,
      verdict: verdictToDb(analysis.verdict),
    });
    throwIfError(analysisError);

    if (input.monthlyRent > 0) {
      const rentSpread = Math.max(25, input.monthlyRent * (1 - input.dataConfidence) * 0.35);
      const { error: estimateError } = await supabase.from("estate_market_estimates").insert({
        user_id: user.id,
        property_id: propertyId,
        estimate_type: "rent",
        value_low: Math.max(0, input.monthlyRent - rentSpread),
        value_mid: input.monthlyRent,
        value_high: input.monthlyRent + rentSpread,
        confidence: input.dataConfidence,
        method: "user_input_v1",
        source_count: 0,
        sources: [],
        model_version: "estate_market_v1_manual",
      });
      throwIfError(estimateError);
    }

    if (input.marketValueEstimate && input.marketValueEstimate > 0) {
      const saleSpread = Math.max(1500, input.marketValueEstimate * (1 - input.dataConfidence) * 0.2);
      const { error: estimateError } = await supabase.from("estate_market_estimates").insert({
        user_id: user.id,
        property_id: propertyId,
        estimate_type: "sale",
        value_low: Math.max(0, input.marketValueEstimate - saleSpread),
        value_mid: input.marketValueEstimate,
        value_high: input.marketValueEstimate + saleSpread,
        confidence: input.dataConfidence,
        method: "user_input_v1",
        source_count: 0,
        sources: [],
        model_version: "estate_market_v1_manual",
      });
      throwIfError(estimateError);
    }

    const { error: auditError } = await supabase.from("estate_audit_events").insert({
      user_id: user.id,
      property_id: propertyId,
      event_type: "analysis_created",
      entity_type: "deal_analysis",
      source: "estate_web_v1",
      model_version: analysis.engineVersion,
      payload: {
        score: analysis.score,
        score_coverage: analysis.scoreCoverage,
        verdict: analysis.verdict,
      },
    });
    throwIfError(auditError);

    return propertyId;
  } catch (error) {
    await supabase
      .from("estate_properties")
      .delete()
      .eq("id", propertyId)
      .eq("user_id", user.id);
    throw error;
  }
}

function verdictToDb(verdict: DealAnalysis["verdict"]) {
  if (verdict === "DESCARTAR") return "discard";
  if (verdict === "MONITORIZAR") return "monitor";
  if (verdict === "ANALIZAR") return "analyze";
  if (verdict === "VISITAR") return "visit";
  return "negotiate";
}

export async function loadSavedDeals(user: User): Promise<SavedDeal[]> {
  const { data, error } = await supabase
    .from("estate_properties")
    .select(
      "id,title,municipality,province,address,stage,built_area_m2,bedrooms,bathrooms,floor_label,has_elevator,condition,updated_at,estate_listings(asking_price,portal,url),estate_deal_analyses(score,verdict,inputs,outputs,created_at)",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  throwIfError(error);

  const deals = (data ?? []) as unknown as SavedDeal[];
  return deals.map((deal) => ({
    ...deal,
    estate_deal_analyses: (deal.estate_deal_analyses ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  }));
}

export async function updateDealStage(
  user: User,
  propertyId: string,
  stage: EstateStage,
) {
  const { error } = await supabase
    .from("estate_properties")
    .update({ stage })
    .eq("id", propertyId)
    .eq("user_id", user.id);
  throwIfError(error);

  const { error: auditError } = await supabase.from("estate_audit_events").insert({
    user_id: user.id,
    property_id: propertyId,
    event_type: "stage_changed",
    entity_type: "property",
    source: "estate_web_v1",
    payload: { stage },
  });
  throwIfError(auditError);
}
