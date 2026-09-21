import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type MobilityMode = "walk" | "drive" | "bike" | "transit" | "mixed";

export type MobilityPoint = {
  id?: string;
  dataset_id?: string;
  user_id?: string;
  lat: number;
  lng: number;
  value: number;
  mode: MobilityMode;
  label?: string | null;
  observed_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type MobilityDataset = {
  id: string;
  user_id: string;
  name: string;
  source_key: string;
  mode: MobilityMode;
  area_label: string | null;
  observed_from: string | null;
  observed_to: string | null;
  resolution_m: number | null;
  unit: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  estate_mobility_points?: MobilityPoint[];
};

export type MobilityDatasetDraft = {
  name: string;
  sourceKey?: string;
  mode?: MobilityMode;
  areaLabel?: string;
  observedFrom?: string | null;
  observedTo?: string | null;
  resolutionM?: number | null;
  unit?: string;
  metadata?: Record<string, unknown>;
};

export async function loadMobilityDatasets(user: User): Promise<MobilityDataset[]> {
  const { data, error } = await supabase
    .from("estate_mobility_datasets")
    .select("*, estate_mobility_points(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MobilityDataset[];
}

export async function saveMobilityDataset(
  user: User,
  draft: MobilityDatasetDraft,
  points: MobilityPoint[],
): Promise<string> {
  const { data: dataset, error: datasetError } = await supabase
    .from("estate_mobility_datasets")
    .insert({
      user_id: user.id,
      name: draft.name,
      source_key: draft.sourceKey ?? "manual_csv",
      mode: draft.mode ?? "mixed",
      area_label: draft.areaLabel ?? null,
      observed_from: draft.observedFrom ?? null,
      observed_to: draft.observedTo ?? null,
      resolution_m: draft.resolutionM ?? null,
      unit: draft.unit ?? "index",
      metadata: draft.metadata ?? {},
    })
    .select("id")
    .single();
  if (datasetError) throw datasetError;

  if (points.length) {
    const rows = points.map((point) => ({
      dataset_id: dataset.id,
      user_id: user.id,
      lat: point.lat,
      lng: point.lng,
      value: point.value,
      mode: point.mode,
      label: point.label ?? null,
      observed_at: point.observed_at ?? null,
      metadata: point.metadata ?? {},
    }));
    const { error: pointsError } = await supabase.from("estate_mobility_points").insert(rows);
    if (pointsError) {
      await supabase.from("estate_mobility_datasets").delete().eq("id", dataset.id).eq("user_id", user.id);
      throw pointsError;
    }
  }

  return dataset.id as string;
}

export async function deleteMobilityDataset(user: User, datasetId: string) {
  const { error } = await supabase
    .from("estate_mobility_datasets")
    .delete()
    .eq("id", datasetId)
    .eq("user_id", user.id);
  if (error) throw error;
}
