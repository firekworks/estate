export type ResearchCriteria = {
  municipalities: string[];
  province?: string;
  maxPrice?: number;
  minBedrooms?: number;
  minAreaM2?: number;
  strategy?: "long_term" | "rooms" | "student";
  maxResults?: number;
};

export type ResearchEvidence = {
  label: string;
  url: string;
};

export type ResearchCandidate = {
  id?: string;
  title: string;
  url: string;
  source: string;
  portal: string | null;
  municipality: string | null;
  province: string | null;
  address: string | null;
  asking_price: number | null;
  built_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  agency_name: string | null;
  monthly_rent_estimate: number | null;
  market_value_estimate: number | null;
  days_on_market: number | null;
  image_urls: string[];
  confidence: number;
  evidence: ResearchEvidence[];
};

export type SourceStatus = {
  key: string;
  label: string;
  kind: "manual" | "agent" | "api" | "feed" | "geo";
  status: "ready" | "needs_key" | "available_on_request";
  detail: string;
};
