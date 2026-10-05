"use client";

import { humanError } from "@/lib/estate-errors";
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

const MODE_META: Array<{
  key: MobilityMode;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "walk", label: "A pie", icon: <Footprints size={15} /> },
  { key: "drive", label: "Coche", icon: <CarFront size={15} /> },
  { key: "bike", label: "Bici", icon: <Bike size={15} /> },
  { key: "mixed", label: "Sin clasificar", icon: <Layers3 size={15} /> },
  { key: "transit", label: "Transporte", icon: <TrainFront size={15} /> },
];

function normalizeMode(raw: string | null | undefined): MobilityMode {
  const value = (raw ?? "").toLowerCase().trim();
  if (
    [
      "walk",
      "walking",
      "pedestrian",
      "foot",
      "peaton",
      "peatón",
      "pie",
    ].includes(value)
  )
    return "walk";
  if (
    [
      "drive",
      "driving",
      "car",
      "vehicle",
      "coche",
      "vehiculo",
      "vehículo",
    ].includes(value)
  )
    return "drive";
  if (
    ["bike", "bicycle", "cycle", "cycling", "bici", "bicicleta"].includes(value)
  )
    return "bike";
  if (
    [
      "transit",
      "public",
      "bus",
      "metro",
      "tram",
      "tren",
      "transporte",
    ].includes(value)
  )
    return "transit";
  return "mixed";
}

function parseMobilityCsv(text: string): MobilityPoint[] {
  return readCsv(text).map((row, index) => {
    const lat = csvNumber(row.lat ?? row.latitude),
      lng = csvNumber(row.lng ?? row.lon ?? row.longitude),
      value = csvNumber(row.value ?? row.count ?? row.imd);
    if (
      lat === null ||
      lng === null ||
      value === null ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      value < 0
    )
      throw new Error(`Fila ${index + 2}: lat, lng o value inválido.`);
    const date = row.timestamp ?? row.observed_at ?? null;
    if (date && !Number.isFinite(Date.parse(date)))
      throw new Error(`Fila ${index + 2}: fecha inválida.`);
    return {
      lat,
      lng,
      value,
      mode: normalizeMode(row.mode),
      label: row.label ?? null,
      observed_at: date,
    };
  });
}

function percentile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined
    ? sorted[base]
    : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export function MobilityView({ user }: { user: User | null }) {
  const [gvaPoints, setGvaPoints] = useState<MobilityPoint[]>([]);
  const [timeIndex, setTimeIndex] = useState(0);
  const [dayFilter, setDayFilter] = useState("all");
  const [hourFilter, setHourFilter] = useState("all");
  const [compareId, setCompareId] = useState("");
  const [gvaLoadedYear, setGvaLoadedYear] = useState(2025);
  const [gvaLoadedArea, setGvaLoadedArea] = useState("");
  const [gvaYear, setGvaYear] = useState(2025);
  const [datasets, setDatasets] = useState<MobilityDataset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mode, setMode] = useState<MobilityMode>("walk");
  const [query, setQuery] = useState("Castalla, Alicante");
  const [center, setCenter] = useState({ lat: 38.596, lng: -0.672 });
  const [placeLabel, setPlaceLabel] = useState("Castalla · Alicante");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  async function refresh() {
    if (!user) {
      setDatasets([]);
      setSelectedId("");
      return;
    }
    try {
      const rows = await loadMobilityDatasets(user);
      setDatasets(rows);
      setSelectedId((current) =>
        current && rows.some((row) => row.id === current)
          ? current
          : (rows[0]?.id ?? ""),
      );
    } catch (error) {
      setMessage(humanError(error, "No se pudieron cargar los datasets."));
    }
  }

  useEffect(() => {
    let active = true;
    if (!user)
      return () => {
        active = false;
      };
    void loadMobilityDatasets(user)
      .then((rows) => {
        if (!active) return;
        setDatasets(rows);
        setSelectedId((current) =>
          current && rows.some((row) => row.id === current)
            ? current
            : (rows[0]?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(humanError(error, "No se pudieron cargar los datasets."));
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    void fetch("/api/mobility/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { sources?: Provider[] } | null) =>
        setProviders(payload?.sources ?? []),
      )
      .catch(() => undefined);
  }, []);

  const selected =
    datasets.find((dataset) => dataset.id === selectedId) ?? null;
  const allPoints = useMemo(
    () =>
      selectedId === "gva-live"
        ? gvaPoints
        : (selected?.estate_mobility_points ?? []),
    [selectedId, gvaPoints, selected],
  );
  const times = useMemo(
    () =>
      [
        ...new Set(
          allPoints
            .filter((p) => p.mode === mode && p.observed_at)
            .map((p) => p.observed_at!),
        ),
      ].sort(),
    [allPoints, mode],
  );
  const annual =
    selectedId === "gva-live" || selected?.source_key === "gva_imd";
  const points = useMemo(
    () =>
      allPoints.filter((p) => {
        if (p.mode !== mode) return false;
        if (annual) return true;
        if (timeIndex > 0 && p.observed_at !== times[timeIndex - 1])
          return false;
        if (dayFilter === "all" && hourFilter === "all") return true;
        if (!p.observed_at) return false;
        const d = new Date(p.observed_at),
          weekday = new Intl.DateTimeFormat("en-US", {
            timeZone: "Europe/Madrid",
            weekday: "short",
          }).format(d),
          hour = Number(
            new Intl.DateTimeFormat("en-GB", {
              timeZone: "Europe/Madrid",
              hour: "2-digit",
              hourCycle: "h23",
            }).format(d),
          );
        if (dayFilter === "weekday" && ["Sat", "Sun"].includes(weekday))
          return false;
        if (dayFilter === "weekend" && !["Sat", "Sun"].includes(weekday))
          return false;
        return hourFilter === "all" || hour === Number(hourFilter);
      }),
    [allPoints, mode, annual, timeIndex, times, dayFilter, hourFilter],
  );
  const compare = datasets.find((d) => d.id === compareId);
  const comparisonPoints =
    compare?.estate_mobility_points?.filter((p) => p.mode === mode) ?? [];
  const sameUnit =
    compare?.unit ===
    (selectedId === "gva-live" ? "vehicles/day" : selected?.unit);

  const values = points.map((point) => point.value);
  const p50 = percentile(values, 0.5);
  const p90 = percentile(values, 0.9);
  const peak = values.length ? Math.max(...values) : 0;
  async function loadGva() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/mobility/gva?lat=${center.lat}&lng=${center.lng}&year=${gvaYear}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGvaPoints(data.points);
      setGvaLoadedYear(data.year);
      setGvaLoadedArea(placeLabel);
      setSelectedId("gva-live");
      setMode("drive");
      setMessage(
        `${data.points.length} tramos · IMD ${data.year}. ${data.note}`,
      );
    } catch (e) {
      setMessage(humanError(e,"GVA no disponible"));
    } finally {
      setBusy(false);
    }
  }
  async function saveGva() {
    if (!user) {
      setMessage("Inicia sesión para conservar esta muestra.");
      return;
    }
    try {
      await saveMobilityDataset(
        user,
        {
          name: `GVA IMD ${gvaLoadedYear} · ${gvaLoadedArea}`,
          sourceKey: "gva_imd",
          mode: "drive",
          unit: "vehicles/day",
          metadata: {
            license: "CC BY — Generalitat Valenciana / ICV",
            year: gvaLoadedYear,
            source: "https://terramapas.icv.gva.es/0902_Aforos",
            retrieved_at: new Date().toISOString(),
          },
        },
        gvaPoints,
      );
      setMessage("Muestra GVA guardada con procedencia.");
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function locate() {
    if (!query.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/mobility/geocode?q=${encodeURIComponent(query.trim())}`,
      );
      const payload = (await response.json()) as GeocodeResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "No se encontró la ubicación.");
      setCenter({ lat: payload.lat, lng: payload.lng });
      setPlaceLabel(payload.label);
    } catch (error) {
      setMessage(humanError(error, "No se pudo localizar."));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) {
      setMessage("Inicia sesión para guardar un dataset de movilidad.");
      event.target.value = "";
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const parsed = parseMobilityCsv(await file.text());
      const inferredMode = parsed.every(
        (point) => point.mode === parsed[0].mode,
      )
        ? parsed[0].mode
        : "mixed";
      await saveMobilityDataset(
        user,
        {
          name: file.name.replace(/\.csv$/i, ""),
          sourceKey: "manual_csv",
          mode: inferredMode,
          areaLabel: query.trim() || placeLabel,
          unit: "index",
          metadata: {
            filename: file.name,
            imported_at: new Date().toISOString(),
            rows: parsed.length,
          },
        },
        parsed,
      );
      setMode(inferredMode === "mixed" ? "walk" : inferredMode);
      setMessage(`${parsed.length.toLocaleString("es-ES")} puntos importados.`);
      await refresh();
    } catch (error) {
      setMessage(humanError(error, "No se pudo importar el CSV."));
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
    } finally {
      setBusy(false);
    }
  }

  const modeProviders = providers.filter(
    (provider) =>
      provider.modes.includes(mode) || provider.modes.includes("mixed"),
  );
  const selectedMode = MODE_META.find((item) => item.key === mode)!;

  return (
    <div className="view view-mobility visual-first v14-view">
      <SectionHead
        eyebrow="LOCATION FLOW"
        title="¿Cómo se mueve la gente alrededor?"
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
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void locate()}
            aria-label="Buscar ubicación"
          />
          <button
            aria-label="Buscar ubicación"
            onClick={locate}
            disabled={busy}
          >
            {busy ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <LocateFixed size={14} />
            )}
          </button>
        </div>
        <div className="flow-mode-switch" aria-label="Modo de movilidad">
          {MODE_META.map((item) => (
            <button
              aria-label={item.label}
              key={item.key}
              className={mode === item.key ? "active" : ""}
              onClick={() => setMode(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="flow-place">
          <MapPinned size={14} />
          <span>{placeLabel}</span>
        </div>
      </div>

      <div className="saved-searches">
        <label>
          Año IMD
          <select
            value={gvaYear}
            onChange={(e) => setGvaYear(Number(e.target.value))}
          >
            {Array.from({ length: 17 }, (_, i) => 2025 - i).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <button className="ghost-button" disabled={busy} onClick={loadGva}>
          Cargar tráfico GVA en esta zona
        </button>
        {gvaPoints.length > 0 && (
          <button className="ghost-button" onClick={saveGva}>
            Guardar muestra GVA
          </button>
        )}
      </div>
      <div className="flow-layout">
        <section className="flow-map-shell">
          <div className="flow-map-topbar">
            <div>
              <span
                className={`flow-live-dot ${points.length ? "" : "no-data"}`}
              />
              <strong>{selectedMode.label}</strong>
              <small>
                {selectedId === "gva-live"
                  ? `GVA IMD ${gvaLoadedYear}`
                  : selected
                    ? selected.name
                    : "sin dataset medido"}
              </small>
            </div>
            <div className="flow-legend">
              <span>
                <i className="low" /> bajo
              </span>
              <span>
                <i className="mid" /> medio
              </span>
              <span>
                <i className="high" /> alto
              </span>
            </div>
          </div>
          <div className="flow-map-stage">
            <PointMap
              center={center}
              points={points}
              comparisonPoints={sameUnit ? comparisonPoints : []}
            />
            <div className="map-floating-toolbar">
              {" "}
              {!annual && (
                <div className="map-time-controls">
                  <label>
                    Momento:{" "}
                    {timeIndex ? (times[timeIndex - 1] ?? "Sin dato") : "Todos"}
                    <input
                      type="range"
                      min="0"
                      max={times.length}
                      value={Math.min(timeIndex, times.length)}
                      onChange={(e) => setTimeIndex(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Día
                    <select
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="weekday">Laborable</option>
                      <option value="weekend">Fin de semana</option>
                    </select>
                  </label>
                  <label>
                    Hora · Europe/Madrid
                    <select
                      value={hourFilter}
                      onChange={(e) => setHourFilter(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <details className="map-compare">
                <summary>Comparación A/B de muestras</summary>
                <label>
                  Muestra B
                  <select
                    value={compareId}
                    onChange={(e) => setCompareId(e.target.value)}
                  >
                    <option value="">Selecciona otra ubicación</option>
                    {datasets
                      .filter((d) => d.id !== selectedId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.area_label}
                        </option>
                      ))}
                  </select>
                </label>
                {compare && (
                  <p>
                    {sameUnit
                      ? `A: N ${points.length} · mediana ${
                          points.length
                            ? percentile(
                                points.map((p) => p.value),
                                0.5,
                              )
                            : "sin datos"
                        }. B: N ${comparisonPoints.length} · mediana ${
                          comparisonPoints.length
                            ? percentile(
                                comparisonPoints.map((p) => p.value),
                                0.5,
                              )
                            : "sin datos"
                        }. Unidad: ${compare.unit}. Verifica que periodo, resolución y metodología sean comparables; B muestra todos sus registros del modo seleccionado.`
                      : "Unidades distintas: comparación numérica no disponible."}
                  </p>
                )}
              </details>
            </div>
          </div>
          <div className="flow-map-footer">
            <span>
              {!points.length && "Sin aforos · "}Base © OpenStreetMap
              {annual && (
                <> · IMD © Generalitat Valenciana / ICV · CC BY · anual</>
              )}
            </span>
            <span>
              Los puntos representan datos agregados · nunca trayectorias
              individuales
            </span>
          </div>
        </section>

        <aside className="flow-lens">
          <div className="flow-lens-head">
            <div>
              <span>LENTE</span>
              <strong>{selectedMode.label}</strong>
            </div>
            <Navigation size={18} />
          </div>

          <div className="flow-signal">
            <div
              className="flow-signal-orb"
              style={
                {
                  "--flow": `${points.length ? Math.min(360, (p90 / Math.max(1, peak)) * 360) : 0}deg`,
                } as CSSProperties
              }
            >
              <strong>
                {points.length ? Math.round(p90).toLocaleString("es-ES") : "—"}
              </strong>
              <span>P90</span>
            </div>
            <div className="flow-signal-stats">
              <div>
                <span>PUNTOS</span>
                <b>{points.length.toLocaleString("es-ES")}</b>
              </div>
              <div>
                <span>MEDIANA</span>
                <b>
                  {points.length
                    ? Math.round(p50).toLocaleString("es-ES")
                    : "—"}
                </b>
              </div>
              <div>
                <span>PICO</span>
                <b>
                  {points.length
                    ? Math.round(peak).toLocaleString("es-ES")
                    : "—"}
                </b>
              </div>
            </div>
          </div>

          <div className="flow-dataset-control">
            <label>
              <span>DATASET</span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                <option value="">Sin dataset</option>
                {gvaPoints.length > 0 && (
                  <option value="gva-live">GVA · consulta actual</option>
                )}
                {datasets.map((dataset) => (
                  <option value={dataset.id} key={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <button onClick={removeSelected} aria-label="Eliminar dataset">
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <details className="flow-provider-disclosure"><summary>Fuentes disponibles</summary><div className="flow-provider-list">
            {modeProviders.map((provider) => (
              <div
                key={provider.key}
                className={
                  provider.status === "ready" ||
                  provider.status === "key_available"
                    ? "ready"
                    : ""
                }
              >
                <i />
                <span>
                  <strong>{provider.label}</strong>
                  <small>{provider.resolution || provider.access}</small>
                </span>
                <b>
                  {provider.status === "ready"
                    ? "ON"
                    : provider.status === "key_available"
                      ? "KEY"
                      : provider.access === "commercial" ||
                          provider.access === "enterprise" ||
                          provider.access === "premium"
                        ? "PRO"
                        : "—"}
                </b>
              </div>
            ))}
          </div>
</details>
          <div className="flow-source-note">
            <Gauge size={14} />
            <span>
              {mode === "drive"
                ? "IMD anual · vehículos/día. No peatones ni tiempo real."
                : points.length ? "Muestra de aforo · contrasta fuente y periodo." : "Sin aforo peatonal. Importa una muestra para evaluar."}
            </span>
          </div>
        </aside>
      </div>

      <div className="flow-source-dock">
        <a
          href="https://dadesobertes.gva.es/dataset/intensidad-media-diaria-anual-imd-de-trafico-por-tramos-red-autonomica-de-carreteras-2009-2025"
          target="_blank"
          rel="noreferrer"
        >
          <Database size={15} />
          <span>GVA IMD</span>
          <b>abierto</b>
        </a>
        <div>
          <Footprints size={15} />
          <span>MyTraffic</span>
          <b>footfall</b>
        </div>
        <div>
          <Layers3 size={15} />
          <span>CARTO · Vodafone</span>
          <b>250 m</b>
        </div>
        <div>
          <Waves size={15} />
          <span>Kido</span>
          <b>flow</b>
        </div>
        <div>
          <RefreshCw size={15} />
          <span>Nommon</span>
          <b>OD</b>
        </div>
      </div>

      {message && (
        <button className="flow-message" onClick={() => setMessage("")}>
          {message}
        </button>
      )}
    </div>
  );
}
