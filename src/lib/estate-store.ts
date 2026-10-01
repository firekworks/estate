import type { User } from "@supabase/supabase-js";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import { canonicalListingUrl } from "@/lib/estate-csv";
import { supabase } from "@/lib/supabase";

export type EstateStage =
  | "watchlist"
  | "analyzing"
  | "visit"
  | "negotiating"
  | "financing"
  | "deposit"
  | "rehab"
  | "marketing"
  | "discarded"
  | "purchased"
  | "managed"
  | "sold";

export type EvidenceKind = "fact" | "estimate" | "assumption";
export type EstatePropertyType = "apartment" | "house" | "studio" | "commercial" | "office" | "land" | "building" | "garage" | "other";

export type ZoneEvidence = { label: string; url: string };

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
  confidence?: number;
  evidence?: ZoneEvidence[];
  researchedAt?: string;
  tenantProfiles?: string[];
};

export type PropertyFeatures = {
  commercial?: { frontage?: number; visibility?: string; parking?: string; access?: string; licensing?: string; power?: string; emergencyExit?: string; ventilation?: string; anchors?: string; flowScore?: number; flowConfidence?: number };
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
  sourceImageUrls?: string[];
  data_confidence?: number;
};

export type PropertyDraft = {
  title: string;
  propertyType?: EstatePropertyType;
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
  quantity?:number;unit_cost?:number|null;materials?:number|null;labor?:number|null;contingency_pct?:number;supplier_quote_url?:string|null;risk_reduction?:number|null;
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
  owner_label?:string|null;due_at?:string|null;
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
  estate_investor_cashflows?:Array<{id:string;occurred_at:string;direction:"contribution"|"distribution";amount:number;source:string}>;
  id: string;
  title: string;
  property_type: EstatePropertyType;
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
  stage_entered_at?: string;
  estate_tasks?: Array<{id:string;title:string;status:string;due_at:string|null}>;
  estate_actual_performance?: Array<{id:string;period:string;rent_received:number;operating_expenses:number;debt_payment:number;capex:number;debt_balance:number|null;valuation:number|null;occupied_days:number|null;forecast:Record<string,unknown>}>;
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

async function bearerToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function propertyPayload(user: User, draft: PropertyDraft, input: DealInputs) {
  return {
    user_id: user.id,
    title: draft.title.trim() || "Operación sin nombre",
    property_type: draft.propertyType ?? "apartment",
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

async function syncRemoteImages(user: User, propertyId: string, urls: string[]) {
  const clean = [...new Set(urls.filter((url) => /^https?:\/\//i.test(url)))].slice(0, 12);
  if (!clean.length) return;
  const { data: existing, error } = await supabase
    .from("estate_property_images")
    .select("source_url")
    .eq("user_id", user.id)
    .eq("property_id", propertyId);
  throwIfError(error);
  const known = new Set((existing ?? []).map((row) => row.source_url).filter(Boolean));
  const pending = clean.filter((url) => !known.has(url));
  if (!pending.length) return;
  const { error: insertError } = await supabase.from("estate_property_images").insert(
    pending.map((url) => ({
      user_id: user.id,
      property_id: propertyId,
      source_url: url,
      room_type: "unknown",
      analysis: { source: "listing_research", status: "pending_ai_review" },
      confidence: null,
    })),
  );
  throwIfError(insertError);
}

export async function saveDeal(user: User, draft: PropertyDraft, input: DealInputs, analysis: DealAnalysis, existingPropertyId?: string | null) {
  const {data,error}=await supabase.rpc("estate_save_analysis",{
    p_property:propertyPayload(user,draft,input),p_inputs:input,p_outputs:analysis,
    p_listing:{url:draft.listingUrl?.trim()?canonicalListingUrl(draft.listingUrl):null,portal:draft.portal||"manual"},p_property_id:existingPropertyId??null,
  });
  throwIfError(error);
  if(typeof data!=="string") throw new Error("No se confirmó la propiedad guardada.");
  await syncRemoteImages(user,data,draft.features?.sourceImageUrls??[]);
  return data;
}

export async function loadSavedDeals(user: User): Promise<SavedDeal[]> {
  const { data, error } = await supabase
    .from("estate_properties")
    .select("estate_investor_cashflows(id,occurred_at,direction,amount,source),stage_entered_at,estate_tasks(id,title,status,due_at),estate_actual_performance(id,period,rent_received,operating_expenses,debt_payment,capex,debt_balance,valuation,occupied_days,forecast),id,title,property_type,municipality,province,address,stage,latitude,longitude,built_area_m2,usable_area_m2,bedrooms,bathrooms,floor_label,has_elevator,has_terrace,has_balcony,has_garage,has_storage,has_pool,orientation,year_built,energy_rating,condition,features,notes,updated_at,estate_listings(id,asking_price,portal,url,description,agency_name,seller_type,first_seen_at,last_seen_at,is_active),estate_market_estimates(id,estimate_type,value_low,value_mid,value_high,confidence,method,source_count,observed_at),estate_property_images(id,source_url,storage_path,room_type,condition_score,analysis,confidence,created_at,updated_at),estate_renovation_items(id,quantity,unit_cost,materials,labor,contingency_pct,supplier_quote_url,risk_reduction,category,description,mode,pro_cost,diy_material_cost,hybrid_cost,diy_hours,difficulty,professional_required,estimated_rent_uplift_monthly,estimated_value_uplift,confidence,created_at,updated_at),estate_risks(id,owner_label,due_at,category,severity,confidence,title,description,source,is_kill_switch,resolved_at,created_at,updated_at),estate_deal_analyses(score,verdict,inputs,outputs,data_confidence,created_at)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(150);
  throwIfError(error);

  const deals = (data ?? []) as unknown as SavedDeal[];
  const paths = deals.flatMap((deal) => (deal.estate_property_images ?? []).map((image) => image.storage_path).filter((path): path is string => Boolean(path)));
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("estate-property-images").createSignedUrls([...new Set(paths)], 60 * 60);
    for (const item of signed ?? []) if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
  }

  return deals.map((deal) => ({
    ...deal,
    features: deal.features ?? {},
    estate_listings: (deal.estate_listings ?? []).slice().sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at)),
    estate_deal_analyses: (deal.estate_deal_analyses ?? []).slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    estate_market_estimates: (deal.estate_market_estimates ?? []).slice().sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at)),
    estate_property_images: (deal.estate_property_images ?? []).map((image) => ({
      ...image,
      preview_url: image.storage_path ? signedByPath.get(image.storage_path) ?? null : image.source_url,
    })),
  }));
}

export async function updateDealStage(user: User, propertyId: string, stage: EstateStage) {
  const { error } = await supabase.from("estate_properties").update({ stage }).eq("id", propertyId).eq("user_id", user.id);
  throwIfError(error);

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
  const { error } = await supabase.from("estate_properties").update(patch).eq("id", propertyId).eq("user_id", user.id);
  throwIfError(error);
}

type VisionAnalysis = {
  room_type?: string;
  condition_score?: number;
  confidence?: number;
  summary?: string;
  positives?: string[];
  issues?: unknown[];
  renovation_signals?: unknown[];
  manual_checks?: string[];
};

export async function uploadPropertyImage(user: User, propertyId: string, file: File) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
  const path = `${user.id}/${propertyId}/${crypto.randomUUID()}-${safeName || "photo.jpg"}`;
  const { error: uploadError } = await supabase.storage.from("estate-property-images").upload(path, file, { cacheControl: "3600", upsert: false });
  throwIfError(uploadError);

  let vision: VisionAnalysis | null = null;
  try {
    const token = await bearerToken();
    const { data: signed } = await supabase.storage.from("estate-property-images").createSignedUrl(path, 10 * 60);
    if (token && signed?.signedUrl) {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: signed.signedUrl }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { analysis?: VisionAnalysis };
        vision = payload.analysis ?? null;
      }
    }
  } catch {
    vision = null;
  }

  const { error: rowError } = await supabase.from("estate_property_images").insert({
    user_id: user.id,
    property_id: propertyId,
    storage_path: path,
    room_type: vision?.room_type ?? "unknown",
    condition_score: typeof vision?.condition_score === "number" ? vision.condition_score : null,
    analysis: vision ? { source: "openai_vision", status: "needs_human_review", ...vision } : { source: "manual_upload", status: "pending_review" },
    confidence: typeof vision?.confidence === "number" ? vision.confidence : null,
  });

  if (rowError) {
    await supabase.storage.from("estate-property-images").remove([path]);
    throwIfError(rowError);
  }
}

export async function analyzeStoredPropertyImage(user: User, image: PropertyImage) {
  const token = await bearerToken();
  if (!token) throw new Error("Sesión requerida.");
  let imageUrl = image.preview_url ?? image.source_url;
  if (!imageUrl && image.storage_path) {
    const { data } = await supabase.storage.from("estate-property-images").createSignedUrl(image.storage_path, 10 * 60);
    imageUrl = data?.signedUrl ?? null;
  }
  if (!imageUrl) throw new Error("La imagen no está disponible para análisis.");
  const response = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ imageUrl }),
  });
  const payload = (await response.json()) as { analysis?: VisionAnalysis; error?: string };
  if (!response.ok || !payload.analysis) throw new Error(payload.error || "No se pudo analizar la imagen.");
  const analysis = payload.analysis;
  await updatePropertyImageAssessment(user, image.id, {
    room_type: analysis.room_type ?? image.room_type,
    condition_score: typeof analysis.condition_score === "number" ? analysis.condition_score : image.condition_score,
    analysis: { source: "openai_vision", status: "needs_human_review", ...analysis },
    confidence: typeof analysis.confidence === "number" ? analysis.confidence : image.confidence,
  });
}

export async function updatePropertyImageAssessment(user: User, imageId: string, patch: Partial<Pick<PropertyImage, "room_type" | "condition_score" | "analysis" | "confidence">>) {
  const { error } = await supabase.from("estate_property_images").update(patch).eq("id", imageId).eq("user_id", user.id);
  throwIfError(error);
}

export async function deletePropertyImage(user: User, image: PropertyImage) {
  if (image.storage_path) {
    const { error: storageError } = await supabase.storage.from("estate-property-images").remove([image.storage_path]);
    throwIfError(storageError);
  }
  const { error } = await supabase.from("estate_property_images").delete().eq("id", image.id).eq("user_id", user.id);
  throwIfError(error);
}

export async function saveRenovationItem(user: User, propertyId: string, item: Partial<RenovationItem> & Pick<RenovationItem, "category">) {
  const payload = {
    user_id: user.id,
    property_id: propertyId,
    quantity:item.quantity??1,unit_cost:item.unit_cost??null,materials:item.materials??null,labor:item.labor??null,contingency_pct:item.contingency_pct??0,supplier_quote_url:item.supplier_quote_url??null,risk_reduction:item.risk_reduction??null,
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
    const { error } = await supabase.from("estate_renovation_items").update(payload).eq("id", item.id).eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { error } = await supabase.from("estate_renovation_items").insert(payload);
    throwIfError(error);
  }
}

export async function deleteRenovationItem(user: User, itemId: string) {
  const { error } = await supabase.from("estate_renovation_items").delete().eq("id", itemId).eq("user_id", user.id);
  throwIfError(error);
}

export async function saveRisk(user: User, propertyId: string, risk: Partial<EstateRisk> & Pick<EstateRisk, "title" | "category">) {
  const payload = {
    user_id: user.id,
    property_id: propertyId,
    owner_label:risk.owner_label??null,due_at:risk.due_at??null,
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
    const { error } = await supabase.from("estate_risks").update(payload).eq("id", risk.id).eq("user_id", user.id);
    throwIfError(error);
  } else {
    const { error } = await supabase.from("estate_risks").insert(payload);
    throwIfError(error);
  }
}

export async function setRiskResolved(user: User, riskId: string, resolved: boolean) {
  const { error } = await supabase.from("estate_risks").update({ resolved_at: resolved ? new Date().toISOString() : null }).eq("id", riskId).eq("user_id", user.id);
  throwIfError(error);
}
