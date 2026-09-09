"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowDownUp,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  GitCompareArrows,
  Globe2,
  Landmark,
  Loader2,
  MapPin,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { analyzeDeal, type DealInputs } from "@/lib/estate-engine";
import type { ResearchCandidate, SourceStatus } from "@/lib/estate-research";
import type { SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import { supabase } from "@/lib/supabase";
import {
  completenessForDeal,
  dealInput,
  dealOutput,
  fmtMoney,
  fmtPct,
  listingPrice,
  median,
  Metric,
  Panel,
  ScoreDial,
  SectionHead,
  stageLabel,
  StatusPill,
} from "@/components/estate-primitives";

function activeDeals(deals: SavedDeal[]) {
  return deals.filter((deal) => deal.stage !== "discarded" && deal.stage !== "sold");
}

const RESEARCH_BASE: DealInputs = {
  purchasePrice: 0,
  marketValueEstimate: 0,
  monthlyRent: 0,
  builtAreaM2: 0,
  purchaseTaxPct: 10,
  ltvPct: 80,
  interestPct: 3.25,
  termYears: 30,
  notaryRegistry: 1100,
  appraisal: 350,
  financingFees: 0,
  renovation: 0,
  furniture: 0,
  reserve: 2500,
  communityMonthly: 0,
  ibiAnnual: 0,
  insuranceAnnual: 240,
  maintenanceMonthly: 35,
  managementPct: 0,
  vacancyPct: 5,
  otherMonthly: 0,
  monthlySavings: 1200,
  nextCapitalTarget: 20000,
  recoverableCapital: 0,
  targetNetYieldPct: 8,
  daysOnMarket: 0,
  priceDrops: 0,
  dataConfidence: 0.4,
};

function candidateAnalysis(candidate: ResearchCandidate) {
  if (!candidate.asking_price || !candidate.monthly_rent_estimate || !candidate.built_area_m2) return null;
  return analyzeDeal({
    ...RESEARCH_BASE,
    purchasePrice: candidate.asking_price,
    marketValueEstimate: candidate.market_value_estimate ?? 0,
    monthlyRent: candidate.monthly_rent_estimate,
    builtAreaM2: candidate.built_area_m2,
    daysOnMarket: candidate.days_on_market ?? 0,
    dataConfidence: Math.max(0.2, Math.min(0.85, candidate.confidence * 0.8)),
  });
}

function parseCsv(text: string): ResearchCandidate[] {
  const rows = text.split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) return [];
  const delimiter = rows[0].includes(";") ? ";" : ",";
  const headers = rows[0].split(delimiter).map((value) => value.trim().toLowerCase());
  const numberAt = (values: string[], keys: string[]) => {
    const index = headers.findIndex((header) => keys.includes(header));
    if (index < 0) return null;
    const value = Number((values[index] ?? "").trim().replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) ? value : null;
  };
  const textAt = (values: string[], keys: string[]) => {
    const index = headers.findIndex((header) => keys.includes(header));
    return index < 0 ? null : (values[index] ?? "").trim() || null;
  };
  return rows.slice(1).map((row, index) => {
    const values = row.split(delimiter);
    const url = textAt(values, ["url", "enlace", "link"]) ?? "";
    return {
      id: `csv-${index}-${Date.now()}`,
      title: textAt(values, ["title", "titulo", "nombre"]) ?? `Importado ${index + 1}`,
      url,
      source: "CSV",
      portal: textAt(values, ["portal", "fuente"]),
      municipality: textAt(values, ["municipality", "municipio", "localidad"]),
      province: textAt(values, ["province", "provincia"]),
      address: textAt(values, ["address", "direccion", "zona"]),
      asking_price: numberAt(values, ["price", "precio", "asking_price"]),
      built_area_m2: numberAt(values, ["area", "m2", "metros", "built_area_m2"]),
      bedrooms: numberAt(values, ["bedrooms", "habitaciones", "dormitorios"]),
      bathrooms: numberAt(values, ["bathrooms", "banos", "baños"]),
      agency_name: textAt(values, ["agency", "agencia", "inmobiliaria"]),
      monthly_rent_estimate: numberAt(values, ["rent", "alquiler", "monthly_rent"]),
      market_value_estimate: numberAt(values, ["market_value", "valor_mercado", "valor"]),
      days_on_market: numberAt(values, ["days", "dias", "dias_mercado"]),
      image_urls: [],
      confidence: 0.55,
      evidence: url ? [{ label: "CSV", url }] : [],
    } satisfies ResearchCandidate;
  }).filter((candidate) => candidate.url || candidate.asking_price);
}

function SourceOrbit({ sources, busy }: { sources: SourceStatus[]; busy: boolean }) {
  const visible = sources.slice(0, 8);
  return (
    <div className="source-orbit" aria-label="Fuentes de Estate">
      <div className={`radar-core ${busy ? "scanning" : ""}`}><Radar size={25} /><strong>RADAR</strong><span>{busy ? "buscando" : `${sources.filter((source) => source.status === "ready").length} activas`}</span></div>
      {visible.map((source, index) => (
        <div className={`source-node source-node-${index + 1} source-${source.status}`} key={source.key} title={source.detail}>
          {source.status === "ready" ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{source.label}</span>
        </div>
      ))}
      <div className="radar-ring r1" /><div className="radar-ring r2" /><div className="radar-ring r3" /><i className="radar-sweep" />
    </div>
  );
}

function CandidateCard({ candidate, onUse }: { candidate: ResearchCandidate; onUse: () => void }) {
  const analysis = candidateAnalysis(candidate);
  const quickYield = candidate.asking_price && candidate.monthly_rent_estimate ? (candidate.monthly_rent_estimate * 12 * 100) / candidate.asking_price : null;
  return (
    <article className="research-card">
      <div className="research-card-top">
        <div className="source-avatar"><Globe2 size={15} /></div>
        <div><strong>{candidate.source || candidate.portal || "Fuente"}</strong><span>{candidate.agency_name || candidate.municipality || "web"}</span></div>
        <span className="confidence-dot" title={`Confianza ${Math.round(candidate.confidence * 100)}%`}>{Math.round(candidate.confidence * 100)}</span>
      </div>
      <div className="candidate-signal">
        <div className="candidate-photo-count"><span>{candidate.image_urls.length}</span><small>fotos</small></div>
        <div className="candidate-score">{analysis ? <ScoreDial score={analysis.score} size="sm" /> : <ScoreDial score={0} size="sm" />}<small>{analysis ? "pre-score" : "faltan datos"}</small></div>
      </div>
      <h3>{candidate.title}</h3>
      <div className="candidate-place"><MapPin size={12} />{[candidate.address, candidate.municipality].filter(Boolean).join(" · ") || "ubicación parcial"}</div>
      <div className="candidate-numbers">
        <div><span>PRECIO</span><strong>{fmtMoney(candidate.asking_price)}</strong></div>
        <div><span>RENTA</span><strong>{candidate.monthly_rent_estimate ? `${fmtMoney(candidate.monthly_rent_estimate)}/m` : "—"}</strong></div>
        <div><span>YIELD BR.</span><strong>{fmtPct(quickYield)}</strong></div>
      </div>
      <div className="candidate-facts"><span>{candidate.built_area_m2 ? `${candidate.built_area_m2} m²` : "— m²"}</span><span>{candidate.bedrooms ?? "—"} hab.</span><span>{candidate.evidence.length} fuentes</span></div>
      <div className="research-card-actions">
        <button className="primary-button" onClick={onUse}>Analizar <ArrowRight size={13} /></button>
        {candidate.url && <a href={candidate.url} target="_blank" rel="noreferrer" aria-label="Abrir anuncio"><ExternalLink size={14} /></a>}
      </div>
    </article>
  );
}

export function ExploreView({ deals, onNew, onOpen, user, onCandidate }: {
  deals: SavedDeal[];
  onNew: () => void;
  onOpen: (deal: SavedDeal) => void;
  user: User | null;
  onCandidate: (candidate: ResearchCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(180000);
  const [minYield, setMinYield] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "yield" | "price">("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState("Castalla, Ibi, Onil, Alcoy, Elda, Villena");
  const [minBedrooms, setMinBedrooms] = useState(2);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchMessage, setResearchMessage] = useState("");
  const [researchResults, setResearchResults] = useState<ResearchCandidate[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([
    { key: "manual", label: "URL / manual", kind: "manual", status: "ready", detail: "Entrada directa" },
  ]);

  useEffect(() => {
    void fetch("/api/sources/status").then((response) => response.ok ? response.json() : null).then((data: { sources?: SourceStatus[] } | null) => {
      if (data?.sources) setSources(data.sources);
    }).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeDeals(deals)
      .filter((deal) => {
        const input = dealInput(deal);
        const out = dealOutput(deal);
        const score = opportunityScore(deal);
        if (!input || !out) return false;
        const haystack = `${deal.title} ${deal.municipality ?? ""} ${deal.address ?? ""}`.toLowerCase();
        return (!q || haystack.includes(q)) && input.purchasePrice <= maxPrice && out.netYieldPct >= minYield && score.score >= minScore;
      })
      .sort((a, b) => {
        const aOut = dealOutput(a)!; const bOut = dealOutput(b)!;
        if (sort === "yield") return bOut.netYieldPct - aOut.netYieldPct;
        if (sort === "price") return listingPrice(a) - listingPrice(b);
        return opportunityScore(b).rankScore - opportunityScore(a).rankScore;
      });
  }, [deals, query, maxPrice, minYield, minScore, sort]);

  async function runResearch() {
    if (!user) { setResearchMessage("Inicia sesión para activar el radar web."); return; }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setResearchMessage("Sesión no disponible."); return; }
    setResearchBusy(true); setResearchMessage("");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ criteria: { municipalities: municipalities.split(",").map((value) => value.trim()).filter(Boolean), province: "Alicante", maxPrice, minBedrooms, strategy: "long_term", maxResults: 16 } }),
      });
      const payload = (await response.json()) as { candidates?: ResearchCandidate[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Radar no disponible.");
      setResearchResults(payload.candidates ?? []);
      setResearchMessage(`${payload.candidates?.length ?? 0} señales encontradas`);
    } catch (error) {
      setResearchMessage(error instanceof Error ? error.message : "No se pudo completar la búsqueda.");
    } finally { setResearchBusy(false); }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = parseCsv(await file.text());
    setResearchResults((current) => [...parsed, ...current].slice(0, 60));
    setResearchMessage(`${parsed.length} filas importadas`);
    event.target.value = "";
  }

  const selectedDeals = selected.map((id) => deals.find((deal) => deal.id === id)).filter(Boolean) as SavedDeal[];
  function toggleCompare(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current); }

  return (
    <div className="view view-explore visual-first">
      <SectionHead eyebrow="DEAL RADAR" title="Radar." action={<button className="primary-button" onClick={onNew}>+ Manual</button>} />

      <div className="radar-layout">
        <Panel className="radar-source-panel"><SourceOrbit sources={sources} busy={researchBusy} /></Panel>
        <Panel className="research-console">
          <div className="visual-panel-head"><span><Sparkles size={15} /> BÚSQUEDA</span><small>{researchMessage}</small></div>
          <div className="research-controls">
            <label className="wide"><span>ZONAS</span><input value={municipalities} onChange={(event) => setMunicipalities(event.target.value)} /></label>
            <label><span>HAB. ≥</span><input type="number" min="0" max="10" value={minBedrooms} onChange={(event) => setMinBedrooms(Number(event.target.value))} /></label>
            <label><span>PRECIO ≤</span><input type="number" min="10000" step="5000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></label>
            <button className="scan-button" onClick={runResearch} disabled={researchBusy}>{researchBusy ? <Loader2 size={16} className="spin" /> : <Radar size={16} />} ESCANEAR</button>
            <label className="csv-button" title="CSV: titulo,url,municipio,precio,m2,habitaciones,alquiler,valor_mercado"><input type="file" accept=".csv,text/csv" onChange={importCsv} /><FileSpreadsheet size={15} /> CSV</label>
          </div>
          <div className="source-status-line">
            {sources.map((source) => <span key={source.key} className={`mini-source ${source.status}`} title={source.detail}><i />{source.label}</span>)}
          </div>
        </Panel>
      </div>

      {researchResults.length > 0 && (
        <section className="research-results-section">
          <div className="results-caption"><span>SEÑALES WEB</span><strong>{researchResults.length}</strong><i /></div>
          <div className="research-candidate-grid">{researchResults.map((candidate, index) => <CandidateCard key={`${candidate.url}-${index}`} candidate={candidate} onUse={() => onCandidate(candidate)} />)}</div>
        </section>
      )}

      <div className="saved-radar-head">
        <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar guardadas…" /></div>
        <div className="quick-filters">
          <label title="Precio máximo"><CircleDollarSign size={13} /><input type="range" min="30000" max="400000" step="5000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><b>{Math.round(maxPrice / 1000)}k</b></label>
          <label title="Yield mínima"><Filter size={13} /><input type="range" min="0" max="15" step="0.5" value={minYield} onChange={(event) => setMinYield(Number(event.target.value))} /><b>{minYield}%</b></label>
          <label title="Estate Score mínimo"><SlidersHorizontal size={13} /><input type="range" min="0" max="90" step="5" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} /><b>{minScore}</b></label>
        </div>
        <div className="sort-switch"><ArrowDownUp size={13} />{(["score", "yield", "price"] as const).map((option) => <button key={option} className={sort === option ? "active" : ""} onClick={() => setSort(option)}>{option === "score" ? "Score" : option === "yield" ? "Yield" : "€"}</button>)}</div>
      </div>

      {!deals.length ? (
        <Panel className="visual-empty-radar"><Radar size={34} /><strong>0 guardadas</strong><span>Radar web → Analizar → Guardar</span><button onClick={runResearch} disabled={researchBusy}>{researchBusy ? "Escaneando…" : "Buscar ahora"}</button></Panel>
      ) : filtered.length ? (
        <div className="deal-card-grid visual-deal-grid">
          {filtered.map((deal) => {
            const input = dealInput(deal)!; const out = dealOutput(deal)!; const score = opportunityScore(deal); const checked = selected.includes(deal.id);
            return (
              <article className="deal-card" key={deal.id}>
                <button className={`compare-toggle ${checked ? "active" : ""}`} onClick={() => toggleCompare(deal.id)} title="Comparar"><GitCompareArrows size={14} /></button>
                <button className="deal-card-main" onClick={() => onOpen(deal)}>
                  <div className="deal-card-head"><ScoreDial score={score.score} size="sm" /><div><strong>{deal.title}</strong><span><MapPin size={12} />{deal.municipality || "—"}</span></div><StatusPill tone="neutral">{stageLabel(deal.stage)}</StatusPill></div>
                  <div className="deal-price-line"><strong>{fmtMoney(input.purchasePrice)}</strong><span>{deal.built_area_m2 ? `${fmtMoney(input.purchasePrice / deal.built_area_m2)}/m²` : "— €/m²"}</span></div>
                  <div className="deal-kpis"><span><b>{fmtPct(out.netYieldPct)}</b> yield</span><span className={out.netMonthlyCashFlow >= 0 ? "positive" : "negative"}><b>{fmtMoney(out.netMonthlyCashFlow)}</b>/m</span><span><b>{score.coverage}%</b> evidencia</span></div>
                  <div className="mini-factor-line">{score.components.map((factor) => <i key={factor.key} style={{ height: `${Math.max(5, (factor.score ?? 0) * .22)}px` }} title={`${factor.label}: ${factor.score ?? "—"}`} />)}</div>
                </button>
              </article>
            );
          })}
        </div>
      ) : <Panel className="visual-empty-radar"><Search size={25} /><strong>0 coincidencias</strong><span>Cambia filtros</span></Panel>}

      {selectedDeals.length > 0 && (
        <div className="compare-tray"><div className="compare-title"><GitCompareArrows size={16} /><strong>{selectedDeals.length}/3</strong></div><div className="compare-items">{selectedDeals.map((deal) => <button key={deal.id} onClick={() => onOpen(deal)}><span>{deal.title}</span><b>{fmtPct(dealOutput(deal)?.netYieldPct)}</b><small>{Math.round(opportunityScore(deal).score)}</small></button>)}</div><button className="ghost-button" onClick={() => setSelected([])}>×</button></div>
      )}
    </div>
  );
}

type MarketGroup = { municipality: string; count: number; priceM2: number | null; rentM2: number | null; yieldPct: number | null; days: number | null; score: number | null };

export function MarketView({ deals, onNew, onOpen }: { deals: SavedDeal[]; onNew: () => void; onOpen: (deal: SavedDeal) => void }) {
  const usable = activeDeals(deals).filter((deal) => dealInput(deal) && dealOutput(deal));
  const groups = useMemo(() => {
    const byCity = new Map<string, SavedDeal[]>();
    for (const deal of usable) { const city = deal.municipality?.trim() || "Sin municipio"; byCity.set(city, [...(byCity.get(city) ?? []), deal]); }
    return [...byCity.entries()].map(([municipality, items]): MarketGroup => {
      const priceM2 = items.flatMap((deal) => deal.built_area_m2 && listingPrice(deal) ? [listingPrice(deal) / deal.built_area_m2] : []);
      const rentM2 = items.flatMap((deal) => deal.built_area_m2 && dealInput(deal)?.monthlyRent ? [dealInput(deal)!.monthlyRent / deal.built_area_m2] : []);
      return { municipality, count: items.length, priceM2: median(priceM2), rentM2: median(rentM2), yieldPct: median(items.map((deal) => dealOutput(deal)!.netYieldPct)), days: median(items.map((deal) => dealInput(deal)?.daysOnMarket ?? 0)), score: median(items.map((deal) => opportunityScore(deal).score)) };
    }).sort((a, b) => b.count - a.count || (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
  }, [usable]);
  const plotDeals = usable.filter((deal) => deal.built_area_m2 && listingPrice(deal) > 0);
  const maxPriceM2 = Math.max(1, ...plotDeals.map((deal) => listingPrice(deal) / (deal.built_area_m2 || 1)));
  const maxYield = Math.max(1, ...plotDeals.map((deal) => dealOutput(deal)?.netYieldPct ?? 0));
  const quality = usable.length >= 10 ? 100 : usable.length >= 3 ? 58 : Math.min(28, usable.length * 12);

  return (
    <div className="view view-market visual-first">
      <SectionHead eyebrow="MARKET INTELLIGENCE" title="Mercado." action={<button className="ghost-button" onClick={onNew}>+ Muestra</button>} />
      <div className="market-visual-top">
        <div className="market-quality-ring" style={{ "--quality": `${quality * 3.6}deg` } as CSSProperties}><strong>{usable.length}</strong><span>muestras</span><small>{usable.length >= 10 ? "útil" : usable.length >= 3 ? "orientativa" : "insuficiente"}</small></div>
        <div className="market-icon-metrics">
          <Metric label="ZONAS" value={groups.length} />
          <Metric label="€/m²" value={fmtMoney(median(usable.flatMap((deal) => deal.built_area_m2 ? [listingPrice(deal) / deal.built_area_m2] : [])))} />
          <Metric label="YIELD" value={fmtPct(median(usable.map((deal) => dealOutput(deal)!.netYieldPct)))} />
          <Metric label="EVIDENCIA" value={`${Math.round(usable.reduce((sum, deal) => sum + opportunityScore(deal).coverage, 0) / Math.max(1, usable.length))}%`} />
        </div>
      </div>

      <div className="market-layout">
        <Panel className="market-plane">
          <div className="visual-panel-head"><span><Landmark size={15} /> €/m² ↔ YIELD</span><small>mejor zona ↖</small></div>
          <div className="scatter-frame"><div className="scatter-axis y">YIELD ↑</div><div className="scatter-axis x">€/m² →</div><div className="scatter-grid" />
            {plotDeals.map((deal) => { const out = dealOutput(deal)!; const priceM2 = listingPrice(deal) / (deal.built_area_m2 || 1); const left = Math.min(94, Math.max(4, (priceM2 / maxPriceM2) * 88)); const bottom = Math.min(90, Math.max(6, (out.netYieldPct / maxYield) * 82)); return <button key={deal.id} className="scatter-point" style={{ left: `${left}%`, bottom: `${bottom}%`, "--point-score": opportunityScore(deal).score } as CSSProperties} onClick={() => onOpen(deal)} title={`${deal.title} · ${fmtMoney(priceM2)}/m² · ${fmtPct(out.netYieldPct)}`}><span>{Math.round(opportunityScore(deal).score)}</span></button>; })}
            {!plotDeals.length && <div className="scatter-empty"><CircleDollarSign size={26} /><strong>Sin comparables</strong><span>Radar → guardar ≥ 3</span></div>}
          </div>
        </Panel>
        <Panel className="market-source-map">
          <div className="visual-panel-head"><span><Database size={15} /> EVIDENCIA</span></div>
          <div className="evidence-ladder"><div className={usable.length >= 10 ? "active" : ""}><b>10+</b><i /><span>ÚTIL</span></div><div className={usable.length >= 3 && usable.length < 10 ? "active" : ""}><b>3–9</b><i /><span>ORIENTA</span></div><div className={usable.length < 3 ? "active" : ""}><b>0–2</b><i /><span>NO CONCLUYE</span></div></div>
          <div className="market-source-icons"><span className="live"><Database size={14} /><b>{usable.length}</b><small>propias</small></span><span><Globe2 size={14} /><b>API</b><small>externas</small></span><span><Building2 size={14} /><b>WEB</b><small>agencias</small></span></div>
        </Panel>
      </div>

      <Panel className="market-table-panel compact-market-table">
        <div className="visual-panel-head"><span><MapPin size={15} /> MICROMERCADOS</span></div>
        {groups.length ? <div className="market-table"><div className="market-row market-head"><span>Zona</span><span>N</span><span>€/m²</span><span>Renta/m²</span><span>Yield</span><span>Score</span></div>{groups.map((group) => <div className="market-row" key={group.municipality}><strong>{group.municipality}</strong><span>{group.count}</span><span>{fmtMoney(group.priceM2)}</span><span>{group.rentM2 === null ? "—" : `${group.rentM2.toFixed(1)} €`}</span><span>{fmtPct(group.yieldPct)}</span><span>{group.score === null ? "—" : Math.round(group.score)}</span></div>)}</div> : <div className="market-empty-strip"><MapPin size={18} /><span>Guarda operaciones para construir el mapa real.</span></div>}
      </Panel>
    </div>
  );
}
