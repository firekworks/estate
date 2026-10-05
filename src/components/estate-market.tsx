"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Upload, ChartNoAxesCombined, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { humanError } from "@/lib/estate-errors";
import { marketDistribution } from "@/lib/estate-market";
import { readCsv, csvNumber, canonicalListingUrl } from "@/lib/estate-csv";
import { Panel, SectionHead, Metric, fmtMoney } from "./estate-primitives";
import { DataLoading } from "./estate-access";
type Comp = {
  id: string;
  municipality: string;
  property_type: string;
  transaction_type: string;
  price: number;
  area_m2: number;
  observed_at: string;
  similarity: number | null;
  url: string;
  source: string;
};
const labels: Record<string, string> = {
  apartment: "Piso",
  house: "Casa",
  studio: "Estudio",
  commercial: "Local",
  office: "Oficina",
  building: "Edificio",
  garage: "Garaje",
  land: "Suelo",
};
export function MarketIntelligence({ user }: { user: User | null }) {
  const [rows, setRows] = useState<Comp[]>([]),
    [city, setCity] = useState(""),
    [type, setType] = useState("apartment"),
    [transaction, setTransaction] = useState("rent"),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0),
    [minimum, setMinimum] = useState(3),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [unit, setUnit] = useState("total");
  useEffect(() => {
    let active = true;
    if (!user) return;
    supabase
      .from("estate_comparables")
      .select("*")
      .order("observed_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (active) {
          setLoading(false);
          setFailed(Boolean(error));
          if (error)
            setMessage(
              humanError(error, "No se pudo cargar tu muestra de mercado."),
            );
          else {
            setRows(data ?? []);
            setMessage("");
          }
        }
      });
    return () => {
      active = false;
    };
  }, [user, revision]);
  const [now] = useState(() => Date.now());
  const filtered = rows.filter(
    (r) =>
      (!city || r.municipality.toLowerCase().includes(city.toLowerCase())) &&
      r.property_type === type &&
      r.transaction_type === transaction,
  );
  const unique = new Map<string, Comp>();
  for (const r of filtered)
    if (
      Date.parse(r.observed_at) <= now &&
      now - Date.parse(r.observed_at) <= 180 * 86400000 &&
      !unique.has(r.url)
    )
      unique.set(r.url, r);
  const sample = [...unique.values()];
  const dist = marketDistribution(
    sample.map((r) => ({
      ...r,
      price: unit === "m2" ? r.price / r.area_m2 : r.price,
    })),
    new Date(),
    minimum,
    Math.max(10, minimum),
  );
  async function importCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user)
        throw new Error("Inicia sesión para importar comparables.");
      const parsed = readCsv(await file.text());
      const pending = parsed.map((r, i) => {
        const price = csvNumber(r.price),
          area = csvNumber(r.area_m2);
        if (
          !r.municipality ||
          !r.property_type ||
          !["rent", "sale"].includes(r.transaction_type) ||
          !price ||
          price <= 0 ||
          !area ||
          area <= 0 ||
          !r.source ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.observed_at) ||
          !Number.isFinite(Date.parse(r.observed_at))
        )
          throw new Error(
            `Fila ${i + 2}: faltan datos o hay valores inválidos.`,
          );
        return {
          user_id: data.user!.id,
          municipality: r.municipality,
          property_type: r.property_type,
          transaction_type: r.transaction_type,
          price,
          area_m2: area,
          source: r.source,
          url: canonicalListingUrl(r.url),
          observed_at: r.observed_at,
          similarity: null,
        };
      });
      const unique = [
        ...new Map(
          pending.map((r) => [`${r.url}|${r.observed_at}`, r]),
        ).values(),
      ];
      const { error } = await supabase
        .from("estate_comparables")
        .upsert(unique, { onConflict: "user_id,url,observed_at" });
      if (error) throw error;
      setRevision((x) => x + 1);
      setMessage(
        `${unique.length} comparables guardados; los duplicados se actualizan.`,
      );
    } catch (error) {
      setMessage(
        humanError(
          error,
          "No se pudo importar. Revisa las columnas y los valores del CSV.",
        ),
      );
    } finally {
      e.target.value = "";
    }
  }
  const values = sample.map((r) =>
      unit === "m2" ? r.price / r.area_m2 : r.price,
    ),
    max = Math.max(1, ...values),
    min = Math.min(...values),
    span = max - min || 1;
  const bins = Array.from({ length: 12 }, () => 0);
  for (const v of values)
    bins[Math.min(11, Math.floor(((v - min) / span) * 12))]++;
  const sources = [...new Set(sample.map((r) => r.source))];
  if (!user) return null;
  return (
    <div className="view market-intelligence">
      <SectionHead
        eyebrow="03 / CONTRASTAR"
        title="¿Cuánto vale y alquila realmente?"
        action={
          <label className="upload-button">
            <Upload size={15} /> Importar CSV
            <input type="file" accept=".csv" onChange={importCsv} />
          </label>
        }
      />
      <div className="market-controls command-surface">
        <label>
          Municipio
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Todos los municipios"
          />
        </label>
        <label>
          Activo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Operación
          <select
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
          >
            <option value="rent">Alquiler</option>
            <option value="sale">Venta</option>
          </select>
        </label>
        <label>
          Muestra mínima
          <input
            type="number"
            min="3"
            max="100"
            value={minimum}
            onChange={(e) =>
              setMinimum(Math.min(100, Math.max(3, Number(e.target.value))))
            }
          />
        </label>
      </div>
      {loading ? (
        <DataLoading />
      ) : failed ? (
        <div className="data-error" role="alert">
          <h2>Muestra no disponible</h2>
          <p>{message}</p>
          <button
            className="ghost-button"
            onClick={() => {
              setLoading(true);
              setRevision((x) => x + 1);
            }}
          >
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      ) : (
        <>
          {message && <p role="status">{message}</p>}
          <div className="market-stat-strip">
            <Metric label="P25 · prudente" value={fmtMoney(dist.p25)} />
            <Metric label="P50 · mediana" value={fmtMoney(dist.p50)} />
            <Metric label="P75 · superior" value={fmtMoney(dist.p75)} />
            <Metric label="N · recientes únicos" value={dist.n} />
            <Metric
              label="Confianza de muestra"
              value={
                dist.status === "insufficient"
                  ? "Insuficiente"
                  : dist.status === "indicative"
                    ? "Orientativa"
                    : "Útil"
              }
            />
          </div>
          <div className="market-workspace">
            <Panel className="distribution-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">DISTRIBUCIÓN</span>
                  <h2>
                    {transaction === "rent"
                      ? "Rentas anunciadas"
                      : "Precios anunciados"}
                  </h2>
                </div>
                <div className="segmented">
                  <button
                    className={unit === "total" ? "active" : ""}
                    onClick={() => setUnit("total")}
                  >
                    Importe
                  </button>
                  <button
                    className={unit === "m2" ? "active" : ""}
                    onClick={() => setUnit("m2")}
                  >
                    €/m²
                  </button>
                </div>
              </div>
              {sample.length ? (
                <>
                  <svg
                    viewBox="0 0 720 230"
                    role="img"
                    aria-label="Histograma de la muestra reciente"
                    className="distribution-chart"
                  >
                    <line
                      x1="20"
                      x2="700"
                      y1="196"
                      y2="196"
                      stroke="var(--line-strong)"
                    />
                    {bins.map((n, i) => (
                      <g key={i}>
                        <rect
                          x={22 + i * 56}
                          y={196 - (n / Math.max(...bins, 1)) * 155}
                          width="42"
                          height={(n / Math.max(...bins, 1)) * 155}
                          rx="4"
                          fill="var(--accent)"
                          opacity={0.35 + i * 0.05}
                        />
                        {n > 0 && (
                          <text
                            x={43 + i * 56}
                            y={186 - (n / Math.max(...bins, 1)) * 155}
                            textAnchor="middle"
                            fill="var(--muted)"
                            fontSize="13"
                          >
                            {n}
                          </text>
                        )}
                      </g>
                    ))}
                    <text x="20" y="222" fill="var(--muted)" fontSize="13">
                      {fmtMoney(min)}
                    </text>
                    <text
                      x="680"
                      y="222"
                      textAnchor="end"
                      fill="var(--muted)"
                      fontSize="13"
                    >
                      {fmtMoney(max)} {unit === "m2" ? "/m²" : ""}
                    </text>
                  </svg>
                  <div className="chart-footnote">
                    {sample.length} anuncios · últimos 180 días · no son
                    transacciones cerradas
                  </div>
                </>
              ) : (
                <div className="chart-empty">
                  <ChartNoAxesCombined size={36} />
                  <h3>Construye tu muestra de mercado</h3>
                  <p>Importa comparables de la misma zona y tipología.</p>
                  <div className="empty-axis">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </Panel>
            <details className="sample-quality">
              <summary>Calidad y fuentes · {sample.length} testigos</summary>
              <div>
                <span>Recientes / filtrados</span>
                <strong>
                  {sample.length} / {filtered.length}
                </strong>
              </div>
              <div>
                <span>Dispersión IQR / P50</span>
                <strong>
                  {dist.dispersion === null
                    ? "Sin datos"
                    : `${Math.round(dist.dispersion * 100)}%`}
                </strong>
              </div>
              <div>
                <span>Similitud evaluada</span>
                <strong>
                  {dist.similarity === null
                    ? "Sin evaluar"
                    : `${Math.round(dist.similarity * 100)}%`}
                </strong>
              </div>
              <div>
                <span>Última observación</span>
                <strong>
                  {sample[0]?.observed_at?.slice(0, 10) ?? "Sin datos"}
                </strong>
              </div>
              <div>
                <span>Fuentes</span>
                <strong>{sources.length}</strong>
              </div>
              <div className="source-tags">
                {sources.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </details>
          </div>
          <details className="panel comparable-ledger"><summary>Ver comparables ({sample.length})</summary>
            <div className="panel-head">
              <h2>Comparables</h2>
              <span>{sample.length} testigos</span>
            </div>
            {sample.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Zona / fuente</th>
                      <th>Precio</th>
                      <th>m²</th>
                      <th>€/m²</th>
                      <th>Distancia</th>
                      <th>Fecha</th>
                      <th>Similitud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.municipality} ↗
                          </a>
                          <small>{r.source}</small>
                        </td>
                        <td>{fmtMoney(r.price)}</td>
                        <td>{r.area_m2}</td>
                        <td>{fmtMoney(r.price / r.area_m2)}</td>
                        <td>Sin coordenadas</td>
                        <td>{r.observed_at.slice(0, 10)}</td>
                        <td>
                          {r.similarity === null
                            ? "Sin evaluar"
                            : `${Math.round(r.similarity * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="compact-empty">
                Sin comparables para estos filtros.
              </p>
            )}
          </details>
        </>
      )}
      <details className="panel">
        <summary>Formato de importación y procedencia</summary>
        <p>
          CSV:
          municipality,property_type,transaction_type,price,area_m2,source,url,observed_at.
          Fecha AAAA-MM-DD; rent o sale. No se infiere similitud ni distancia.
        </p>
        <p>Los feeds comerciales requieren contrato e integración validada.</p>
      </details>
    </div>
  );
}
