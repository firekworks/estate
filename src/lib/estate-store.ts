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

export type EvidenceKind = "fact" | "estimate" | "assumption";

export type ZoneAssessment = {
  mobility?: number | null;
  amenities?: number | null;
  safety?: number | null;
  noise?: number | null;
  light?: number | null;
  rentalDemand?: number | null;
  liquidity?: number | null;
  nearby?: string[];
  notes?: string;
};

export type PropertyFeatures = {
  exterior?: boolean | null;
  furnished?: boolean | null;
  heating?: string;
  cooling?: string;
  hotWater?: string;
  electricity?: string;
  plumbing?: string;
  gas?: boolean | null;
  internet?: string;
  buildingCondition?: string;
  communityCondition?: string;
  rentalStrategy?: string;
  tenantProfile?: string;
  tenantChannels?: string[];
  zone?: ZoneAssessment;
  evidence?: Record<string, { kind: EvidenceKind; source?: string; observedAt?: string }>;
  source?: string;
  data_confidence?: number;
};

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
  builtAreaM2?: number;
  usableAreaM2?: number;
  hasElevator?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasGarage?: boolean;
  hasStorage?: boolean;
  hasPool?: boolean;
  orientation?: string;
  yearBuilt?: number;
  energyRating?: string;
  latitude?: number;
  longitude?: number;
  features?: PropertyFeatures;
  notes?: string;
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

export type EstateListing = {
  id: string;
  asking_price: number;
  portal: string;
  url: string | null;
  description: string | null;
  agency_name: string | null;
  seller_type: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};

export type EstateMarketEstimate = {
  id: string;
  estimate_type: string;
  value_low: number | null;
  value_mid: number;
  value_high: number | null;
  confidence: number;
  method: string;
  source_count: number;
  observed_at: string;
};

export type PropertyImage = {
  id: string;
  source_url: string | null;
  storage_path: string | null;
  room_type: string | null;
  condition_score: number | null;
  analysis: Record<string, unknown>;
  confidence: number | null;
  created_at: string;
  updated_at?: string;
  preview_url?: string | null;
};

export type RenovationItem = {
  id: string;
  category: string;
  description: string | null;
  mode: "pro" | "diy" | "hybrid";
  pro_cost: number;
  diy_material_cost: number;
  hybrid_cost: number;
  diy_hours: number;
  difficulty: number;
  professional_required: boolean;
  estimated_rent_uplift_monthly: number;
  estimated_value_uplift: number;
  confidence: number;
  created_at: string;
  updated_at?: string;
};

export type EstateRisk = {
  id: string;
  category: string;
  severity: number;
  confidence: number;
  title: string;
  description: string | null;
  source: string | null;
  is_kill_switch: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string;
};

export type SavedDeal = {
  id: string;
  title: string;
  municipality: string | null;
  province: string | null;
  address: string | null;
  stage: EstateStage;
  latitude: number | null;
  longitude: number | null;
  built_area_m2: number | null;
  usable_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_label: string | null;
  has_elevator: boolean | null;
  has_terrace: boolean | null;
  has_balcony: boolean | null;
  has_garage: boolean | null;
  has_storage: boolean | null;
  has_pool: boolean | null;
  orientation: string | null;
  year_built: number | null;
  energy_rating: string | null;
  condition: PropertyDraft["condition"] | null;
  features: PropertyFeatures;
  notes: string | null;
  updated_at: string;
  estate_listings?: EstateListing[];
  estate_market_estimates?: EstateMarketEstimate[];
  estate_property_images?: PropertyImage[];
  estate_renovation_items?: RenovationItem[];
  estate_risks?: EstateRisk[];
  estate_deal_analyses?: Array<{
    score: number | null;
    verdict: string | null;
    inputs: DealInputs;
    outputs: DealAnalysis;
    data_confidence: number;
    created_at: string;
  }>;
};

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message ?? "Error de Supabase");
}

function propertyPayload(user: User, draft: PropertyDraft, input: DealInputs) {
  return {
    user_id: user.id,
    title: draft.title.trim() || "Operación sin nombre",
    property_type: "apartment",
    address: draft.address?.trim() || null,
    municipality: draft.municipality.trim() || null,
    province: draft.province.trim() || null,
    country_code: "ES",
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    built_area_m2: input.builtAreaM2 || draft.builtAreaM2 || null,
    usable_area_m2: draft.usableAreaM2 || null,
    bedrooms: draft.bedrooms ?? null,
    bathrooms: draft.bathrooms ?? null,
    floor_label: draft.floorLabel?.trim() || null,
    has_elevator: draft.hasElevator ?? null,
    has_terrace: draft.hasTerrace ?? null,
    has_balcony: draft.hasBalcony ?? null,
    has_garage: draft.hasGarage ?? null,
    has_storage: draft.hasStorage ?? null,
    has_pool: draft.hasPool ?? null,
    orientation: draft.orientation?.trim() || null,
    year_built: draft.yearBuilt || null,
    condition: draft.condition ?? "unknown",
    energy_rating: draft.energyRating?.trim() || null,
    features: {
      ...(draft.features ?? {}),
      source: draft.features?.source ?? "estate_workspace",
      data_confidence: input.dataConfidence,
    },
    notes: draft.notes?.trim() || null,
  };
}

async function writeListingSnapshot(
  user: User,
  propertyId: string,
  draft: PropertyDraft,
  input: DealInputs,
) {
  const { data: existing, error: existingError } = await supabase
    .from("estate_listings")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(existingError);

  let listingId: string;
  if (existing?.id) {
    listingId = existing.id as string;
    const { error } = await supabase
      .from("estate_listings")
      .update({
        portal: draft.portal || "manual",
        url: draft.listingUrl?.trim() || null,
        asking_price: input.purchasePrice,
        last_seen_at: new Date().toISOString(),
        provenance: {
          entry: draft.listingUrl ? "url+manual" : "manual",
          captured_at: new Date().toISOString(),
        },
      })
      .eq("id", listingId)
      .eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { data, error } = await supabase
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
    throwIfError(error);
    if (!data?.id) throw new Error("No se pudo crear el anuncio.");
    listingId = data.id as string;
  }

  const { error: historyError } = await supabase.from("estate_listing_history").insert({
    user_id: user.id,
    listing_id: listingId,
    asking_price: input.purchasePrice,
    event_type: "snapshot",
    payload: { source: "estate_workspace" },
  });
  throwIfError(historyError);

  return listingId;
}

async function writeAnalysisSnapshot(
  user: User,
  propertyId: string,
  input: DealInputs,
  analysis: DealAnalysis,
) {
  const { error: financeError } = await supabase.from("estate_financing_scenarios").insert({
    user_id: user.id,
    property_id: propertyId,
    name: `Base · ${new Date().toLocaleDateString("es-ES")}`,
    ltv_pct: input.ltvPct,
    interest_pct: input.interestPct,
    term_years: input.termYears,
    rate_type: "fixed",
    origination_fees: input.financingFees,
    insurance_monthly: input.insuranceAnnual / 12,
    assumptions: { source: "estate_workspace" },
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
    stress_test: { status: analysis.stressStatus, scenarios: analysis.stress },
    data_confidence: input.dataConfidence,
    verdict: verdictToDb(analysis.verdict),
  });
  throwIfError(analysisError);

  if (input.monthlyRent > 0) {
    const rentSpread = Math.max(25, input.monthlyRent * (1 - input.dataConfidence) * 0.35);
    const { error } = await supabase.from("estate_market_estimates").insert({
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
    throwIfError(error);
  }

  if (input.marketValueEstimate && input.marketValueEstimate > 0) {
    const saleSpread = Math.max(1500, input.marketValueEstimate * (1 - input.dataConfidence) * 0.2);
    const { error } = await supabase.from("estate_market_estimates").insert({
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
    throwIfError(error);
  }
}

export async function saveDeal(
  user: User,
  draft: PropertyDraft,
  input: DealInputs,
  analysis: DealAnalysis,
  existingPropertyId?: string | null,
) {
  let propertyId = existingPropertyId ?? null;
  let created = false;

  if (propertyId) {
    const { error } = await supabase
      .from("estate_properties")
      .update(propertyPayload(user, draft, input))
      .eq("id", propertyId)
      .eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { data: property, error } = await supabase
      .from("estate_properties")
      .insert({ ...propertyPayload(user, draft, input), stage: "analyzing" })
      .select("id")
      .single();
    throwIfError(error);
    if (!property?.id) throw new Error("No se pudo crear la propiedad.");
    propertyId = property.id as string;
    created = true;
  }

  try {
    await writeListingSnapshot(user, propertyId, draft, input);
    await writeAnalysisSnapshot(user, propertyId, input, analysis);

    const { error: auditError } = await supabase.from("estate_audit_events").insert({
      user_id: user.id,
      property_id: propertyId,
      event_type: created ? "analysis_created" : "analysis_version_created",
      entity_type: "deal_analysis",
      source: "estate_web_v1_2",
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
    if (created) {
      await supabase
        .from("estate_properties")
        .delete()
        .eq("id", propertyId)
        .eq("user_id", user.id);
    }
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
      "id,title,municipality,province,address,stage,latitude,longitude,built_area_m2,usable_area_m2,bedrooms,bathrooms,floor_label,has_elevator,has_terrace,has_balcony,has_garage,has_storage,has_pool,orientation,year_built,energy_rating,condition,features,notes,updated_at,estate_listings(id,asking_price,portal,url,description,agency_name,seller_type,first_seen_at,last_seen_at,is_active),estate_market_estimates(id,estimate_type,value_low,value_mid,value_high,confidence,method,source_count,observed_at),estate_property_images(id,source_url,storage_path,room_type,condition_score,analysis,confidence,created_at,updated_at),estate_renovation_items(id,category,description,mode,pro_cost,diy_material_cost,hybrid_cost,diy_hours,difficulty,professional_required,estimated_rent_uplift_monthly,estimated_value_uplift,confidence,created_at,updated_at),estate_risks(id,category,severity,confidence,title,description,source,is_kill_switch,resolved_at,created_at,updated_at),estate_deal_analyses(score,verdict,inputs,outputs,data_confidence,created_at)",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(150);

  throwIfError(error);

  const deals = (data ?? []) as unknown as SavedDeal[];
  const paths = deals.flatMap((deal) =>
    (deal.estate_property_images ?? [])
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path)),
  );

  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const uniquePaths = [...new Set(paths)];
    const { data: signed } = await supabase.storage
      .from("estate-property-images")
      .createSignedUrls(uniquePaths, 60 * 60);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    }
  }

  return deals.map((deal) => ({
    ...deal,
    features: deal.features ?? {},
    estate_deal_analyses: (deal.estate_deal_analyses ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    estate_market_estimates: (deal.estate_market_estimates ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at)),
    estate_property_images: (deal.estate_property_images ?? []).map((image) => ({
      ...image,
      preview_url: image.storage_path ? signedByPath.get(image.storage_path) ?? null : image.source_url,
    })),
  }));
}

export async function updateDealStage(user: User, propertyId: string, stage: EstateStage) {
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
    source: "estate_web_v1_2",
    payload: { stage },
  });
  throwIfError(auditError);
}

export async function updatePropertyWorkspace(
  user: User,
  propertyId: string,
  patch: Partial<{
    title: string;
    municipality: string | null;
    province: string | null;
    address: string | null;
    usable_area_m2: number | null;
    bathrooms: number | null;
    floor_label: string | null;
    has_elevator: boolean | null;
    has_terrace: boolean | null;
    has_balcony: boolean | null;
    has_garage: boolean | null;
    has_storage: boolean | null;
    has_pool: boolean | null;
    orientation: string | null;
    year_built: number | null;
    energy_rating: string | null;
    condition: PropertyDraft["condition"] | null;
    features: PropertyFeatures;
    notes: string | null;
  }>,
) {
  const { error } = await supabase
    .from("estate_properties")
    .update(patch)
    .eq("id", propertyId)
    .eq("user_id", user.id);
  throwIfError(error);
}

export async function uploadPropertyImage(user: User, propertyId: string, file: File) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
  const path = `${user.id}/${propertyId}/${crypto.randomUUID()}-${safeName || "photo.jpg"}`;
  const { error: uploadError } = await supabase.storage
    .from("estate-property-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  throwIfError(uploadError);

  const { error: rowError } = await supabase.from("estate_property_images").insert({
    user_id: user.id,
    property_id: propertyId,
    storage_path: path,
    room_type: "unknown",
    analysis: { source: "manual_upload", status: "pending_review" },
    confidence: 1,
  });

  if (rowError) {
    await supabase.storage.from("estate-property-images").remove([path]);
    throwIfError(rowError);
  }
}

export async function updatePropertyImageAssessment(
  user: User,
  imageId: string,
  patch: Partial<Pick<PropertyImage, "room_type" | "condition_score" | "analysis" | "confidence">>,
) {
  const { error } = await supabase
    .from("estate_property_images")
    .update(patch)
    .eq("id", imageId)
    .eq("user_id", user.id);
  throwIfError(error);
}

export async function deletePropertyImage(user: User, image: PropertyImage) {
  if (image.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("estate-property-images")
      .remove([image.storage_path]);
    throwIfError(storageError);
  }
  const { error } = await supabase
    .from("estate_property_images")
    .delete()
    .eq("id", image.id)
    .eq("user_id", user.id);
  throwIfError(error);
}

export async function saveRenovationItem(
  user: User,
  propertyId: string,
  item: Partial<RenovationItem> & Pick<RenovationItem, "category">,
) {
  const payload = {
    user_id: user.id,
    property_id: propertyId,
    category: item.category,
    description: item.description ?? null,
    mode: item.mode ?? "hybrid",
    pro_cost: item.pro_cost ?? 0,
    diy_material_cost: item.diy_material_cost ?? 0,
    hybrid_cost: item.hybrid_cost ?? 0,
    diy_hours: item.diy_hours ?? 0,
    difficulty: item.difficulty ?? 50,
    professional_required: item.professional_required ?? false,
    estimated_rent_uplift_monthly: item.estimated_rent_uplift_monthly ?? 0,
    estimated_value_uplift: item.estimated_value_uplift ?? 0,
    confidence: item.confidence ?? 0.5,
  };

  if (item.id) {
    const { error } = await supabase
      .from("estate_renovation_items")
      .update(payload)
      .eq("id", item.id)
      .eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { error } = await supabase.from("estate_renovation_items").insert(payload);
    throwIfError(error);
  }
}

export async function deleteRenovationItem(user: User, itemId: string) {
  const { error } = await supabase
    .from("estate_renovation_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);
  throwIfError(error);
}

export async function saveRisk(
  user: User,
  propertyId: string,
  risk: Partial<EstateRisk> & Pick<EstateRisk, "title" | "category">,
) {
  const payload = {
    user_id: user.id,
    property_id: propertyId,
    category: risk.category,
    severity: risk.severity ?? 50,
    confidence: risk.confidence ?? 0.5,
    title: risk.title,
    description: risk.description ?? null,
    source: risk.source ?? "manual",
    is_kill_switch: risk.is_kill_switch ?? false,
    resolved_at: risk.resolved_at ?? null,
  };

  if (risk.id) {
    const { error } = await supabase
      .from("estate_risks")
      .update(payload)
      .eq("id", risk.id)
      .eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { error } = await supabase.from("estate_risks").insert(payload);
    throwIfError(error);
  }
}

export async function setRiskResolved(user: User, riskId: string, resolved: boolean) {
  const { error } = await supabase
    .from("estate_risks")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", riskId)
    .eq("user_id", user.id);
  throwIfError(error);
}
