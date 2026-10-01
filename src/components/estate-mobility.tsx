"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Bike,
  CarFront,
  Database,
  Footprints,
  Gauge,
  Layers3,
  Loader2,
  LocateFixed,
  MapPinned,
  Navigation,
  RefreshCw,
  Search,
  TrainFront,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import {
  deleteMobilityDataset,
  loadMobilityDatasets,
  saveMobilityDataset,
  type MobilityDataset,
  type MobilityMode,
  type MobilityPoint,
} from "@/lib/estate-mobility-store";
import { readCsv, csvNumber } from "@/lib/estate-csv";
import { PointMap } from "./estate-point-map";
import { SectionHead } from "@/components/estate-primitives";

type Provider = {
  key: string;
  label: string;
  modes: MobilityMode[];
  status: string;
  access: string;
  resolution?: string;
  freshness?: string;
  note?: string;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  provider: string;
};

const MODE_META: Array<{ key: MobilityMode; label: string; icon: React.ReactNode }> = [
  { key: "walk", label: "A pie", icon: <Footprints size={15} /> },
  { key: "drive", label: "Coche", icon: <CarFront size={15} /> },
  { key: "bike", label: "Bici", icon: <Bike size={15} /> },
  { key: "mixed", label: "Sin clasificar", icon: <Layers3 size={15} /> },
  { key: "transit", label: "Transporte", icon: <TrainFront size={15} /> },
];

function normalizeMode(raw: string | null | undefined): MobilityMode {
  const value = (raw ?? "").toLowerCase().trim();
  if (["walk", "walking", "pedestrian", "foot", "peaton", "peatón", "pie"].includes(value)) return "walk";
  if (["drive", "driving", "car", "vehicle", "coche", "vehiculo", "vehículo"].includes(value)) return "drive";
  if (["bike", "bicycle", "cycle", "cycling", "bici", "bicicleta"].includes(value)) return "bike";
  if (["transit", "public", "bus", "metro", "tram", "tren", "transporte"].includes(value)) return "transit";
  return "mixed";
}

function parseMobilityCsv(text: string): MobilityPoint[] {
 return readCsv(text).map((row,index)=>{
 const lat=csvNumber(row.lat??row.latitude),lng=csvNumber(row.lng??row.lon??row.longitude),value=csvNumber(row.value??row.count??row.imd);
 if(lat===null||lng===null||value===null||Math.abs(lat)>90||Math.abs(lng)>180||value<0)throw new Error(`Fila ${index+2}: lat, lng o value inválido.`);
 const date=row.timestamp??row.observed_at??null;
 if(date && !Number.isFinite(Date.parse(date)))throw new Error(`Fila ${index+2}: fecha inválida.`);
 return {lat,lng,value,mode:normalizeMode(row.mode),label:row.label??null,observed_at:date};
 });
}

function percentile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export function MobilityView({ user }: { user: User | null }) {
  const [datasets, setDatasets] = useState<MobilityDataset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mode, setMode] = useState<MobilityMode>("walk");
  const [query, setQuery] = useState("Castalla, Alicante");
  const [center, setCenter] = useState({ lat: 38.596, lng: -0.672 });
  const [placeLabel, setPlaceLabel] = useState("Castalla · Alicante");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!user) { setDatasets([]); setSelectedId(""); return; }
    try {
      const rows = await loadMobilityDatasets(user);
      setDatasets(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los datasets.");
    }
  }

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void loadMobilityDatasets(user)
      .then((rows) => {
        if (!active) return;
        setDatasets(rows);
        setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "No se pudieron cargar los datasets.");
      });
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    void fetch("/api/mobility/status")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { sources?: Provider[] } | null) => setProviders(payload?.sources ?? []))
      .catch(() => undefined);
  }, []);

  const selected = datasets.find((dataset) => dataset.id === selectedId) ?? null;
  const points = useMemo(() => {
    const all = selected?.estate_mobility_points ?? [];
    return all.filter((point) => point.mode === mode);
  }, [selected, mode]);

  const values = points.map((point) => point.value);
  const p50 = percentile(values, .5);
  const p90 = percentile(values, .9);
  const peak = values.length ? Math.max(...values) : 0;
  async function locate() {
    if (!query.trim()) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/mobility/geocode?q=${encodeURIComponent(query.trim())}`);
      const payload = (await response.json()) as GeocodeResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se encontró la ubicación.");
      setCenter({ lat: payload.lat, lng: payload.lng });
      setPlaceLabel(payload.label);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo localizar.");
    } finally { setBusy(false); }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) {
      setMessage("Inicia sesión para guardar un dataset de movilidad.");
      event.target.value = "";
      return;
    }
    setBusy(true); setMessage("");
    try {
      const parsed = parseMobilityCsv(await file.text());
      const inferredMode = parsed.every((point) => point.mode === parsed[0].mode) ? parsed[0].mode : "mixed";
      await saveMobilityDataset(user, {
        name: file.name.replace(/\.csv$/i, ""),
        sourceKey: "manual_csv",
        mode: inferredMode,
        areaLabel: query.trim() || placeLabel,
        unit: "index",
        metadata: { filename: file.name, imported_at: new Date().toISOString(), rows: parsed.length },
      }, parsed);
      setMode(inferredMode === "mixed" ? "walk" : inferredMode);
      setMessage(`${parsed.length.toLocaleString("es-ES")} puntos importados.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar el CSV.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function removeSelected() {
    if (!user || !selected) return;
    setBusy(true);
    try {
      await deleteMobilityDataset(user, selected.id);
      setMessage("Dataset eliminado.");
      await refresh();
    } finally { setBusy(false); }
  }

  const modeProviders = providers.filter((provider) => provider.modes.includes(mode) || provider.modes.includes("mixed"));
  const selectedMode = MODE_META.find((item) => item.key === mode)!;

  return (
    <div className="view view-mobility visual-first v14-view">
      <SectionHead
        eyebrow="LOCATION FLOW"
        title="Flujo."
        action={
          <label className="flow-import-button">
            <input type="file" accept=".csv,text/csv" onChange={importCsv} />
            <Upload size={14} /> Importar aforo
          </label>
        }
      />

      <div className="flow-toolbar">
        <div className="flow-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void locate()} aria-label="Buscar ubicación" />
          <button onClick={locate} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <LocateFixed size={14} />}</button>
        </div>
        <div className="flow-mode-switch" aria-label="Modo de movilidad">
          {MODE_META.map((item) => <button key={item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}>{item.icon}<span>{item.label}</span></button>)}
        </div>
        <div className="flow-place"><MapPinned size={14} /><span>{placeLabel}</span></div>
      </div>

      <div className="flow-layout">
        <section className="flow-map-shell">
          <div className="flow-map-topbar">
            <div><span className="flow-live-dot" /><strong>{selectedMode.label}</strong><small>{selected ? selected.name : "sin dataset medido"}</small></div>
            <div className="flow-legend"><span><i className="low" /> bajo</span><span><i className="mid" /> medio</span><span><i className="high" /> alto</span></div>
          </div>
          <div className="flow-map-stage">
            <PointMap center={center} points={points}/>
            {!points.length && (
              <div className="flow-map-empty">
                <Waves size={26} />
                <strong>Mapa listo.</strong>
                <span>Importa aforos o conecta una fuente para dibujar intensidad real.</span>
              </div>
            )}
          </div>
          <div className="flow-map-footer">
            <span>Base © OpenStreetMap</span>
            <span>Los puntos representan datos agregados · nunca trayectorias individuales</span>
          </div>
        </section>

        <aside className="flow-lens">
          <div className="flow-lens-head">
            <div><span>LENTE</span><strong>{selectedMode.label}</strong></div>
            <Navigation size={18} />
          </div>

          <div className="flow-signal">
            <div className="flow-signal-orb" style={{ "--flow": `${points.length ? Math.min(360, (p90 / Math.max(1, peak)) * 360) : 0}deg` } as CSSProperties}>
              <strong>{points.length ? Math.round(p90).toLocaleString("es-ES") : "—"}</strong>
              <span>P90</span>
            </div>
            <div className="flow-signal-stats">
              <div><span>PUNTOS</span><b>{points.length.toLocaleString("es-ES")}</b></div>
              <div><span>MEDIANA</span><b>{points.length ? Math.round(p50).toLocaleString("es-ES") : "—"}</b></div>
              <div><span>PICO</span><b>{points.length ? Math.round(peak).toLocaleString("es-ES") : "—"}</b></div>
            </div>
          </div>

          <div className="flow-dataset-control">
            <label><span>DATASET</span>
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                <option value="">Sin dataset</option>
                {datasets.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}
              </select>
            </label>
            {selected && <button onClick={removeSelected} aria-label="Eliminar dataset"><Trash2 size={13} /></button>}
          </div>

          <div className="flow-provider-list">
            {modeProviders.map((provider) => (
              <div key={provider.key} className={provider.status === "ready" || provider.status === "key_available" ? "ready" : ""}>
                <i />
                <span><strong>{provider.label}</strong><small>{provider.resolution || provider.access}</small></span>
                <b>{provider.status === "ready" ? "ON" : provider.status === "key_available" ? "KEY" : provider.access === "commercial" || provider.access === "enterprise" || provider.access === "premium" ? "PRO" : "—"}</b>
              </div>
            ))}
          </div>

          <div className="flow-source-note">
            <Gauge size={14} />
            <span>{mode === "drive" ? "GVA IMD sirve para volumen anual por carretera; Google sirve para congestión/ETA, no para contar peatones." : "Para afluencia peatonal real hace falta aforo propio o dataset de movilidad licenciado."}</span>
          </div>
        </aside>
      </div>

      <div className="flow-source-dock">
        <a href="https://dadesobertes.gva.es/dataset/intensidad-media-diaria-anual-imd-de-trafico-por-tramos-red-autonomica-de-carreteras-2009-2025" target="_blank" rel="noreferrer"><Database size={15} /><span>GVA IMD</span><b>abierto</b></a>
        <div><Footprints size={15} /><span>MyTraffic</span><b>footfall</b></div>
        <div><Layers3 size={15} /><span>CARTO · Vodafone</span><b>250 m</b></div>
        <div><Waves size={15} /><span>Kido</span><b>flow</b></div>
        <div><RefreshCw size={15} /><span>Nommon</span><b>OD</b></div>
      </div>

      {message && <button className="flow-message" onClick={() => setMessage("")}>{message}</button>}
    </div>
  );
}
