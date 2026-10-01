"use client";

import { ProviderControl } from "./estate-provider-control";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowDownUp,
  ArrowRight,
  CircleDollarSign,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  GitCompareArrows,
  Globe2,
  Loader2,
  MapPin,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { readCsv, csvNumber, canonicalListingUrl } from "@/lib/estate-csv";
import { analyzeDeal, type DealInputs } from "@/lib/estate-engine";
import type { ResearchCandidate, SourceStatus } from "@/lib/estate-research";
import type { SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import { supabase } from "@/lib/supabase";
import {
  dealInput,
  dealOutput,
  fmtMoney,
  fmtPct,
  listingPrice,
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
  const rows = readCsv(text);
  const textAt = (row: Record<string,string>, keys: string[]) => keys.map(key=>row[key]).find(value=>value?.trim())?.trim() ?? null;
  const numberAt = (row: Record<string,string>, keys: string[]) => csvNumber(textAt(row, keys) ?? undefined);
  const seen = new Set<string>();
  return rows.map((values, index) => {
    const rawUrl = textAt(values, ["url", "enlace", "link"]);
    const url = rawUrl ? canonicalListingUrl(rawUrl) : "";
    return {
      id: `csv-${index}-${Date.now()}`,
      title: textAt(values, ["title", "titulo", "nombre"]) ?? `Importado ${index + 1}`,
      property_type: (() => {
        const raw = (textAt(values, ["property_type", "tipo", "tipologia"]) ?? "").toLowerCase();
        if (raw.includes("local") || raw.includes("comercial")) return "commercial";
        if (raw.includes("oficina")) return "office";
        if (raw.includes("casa") || raw.includes("chalet")) return "house";
        if (raw.includes("estudio")) return "studio";
        if (raw.includes("edificio")) return "building";
        return raw ? "other" : null;
      })(),
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
  }).filter((candidate) => {
    if (!(candidate.url || candidate.asking_price)) return false;
    if (!candidate.url) return true;
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url); return true;
  });
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
      <div className="candidate-facts"><span>{candidate.built_area_m2 ? `${candidate.built_area_m2} m²` : "— m²"}</span><span>{candidate.property_type === "commercial" ? "local" : candidate.property_type === "office" ? "oficina" : `${candidate.bedrooms ?? "—"} hab.`}</span><span>{candidate.evidence.length} fuentes</span></div>
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
  const [searchName,setSearchName]=useState("");
  const [savedSearches,setSavedSearches]=useState<Array<{id:string;name:string;criteria:{query:string;maxPrice:number;minYield:number;minScore:number;municipalities:string;minBedrooms:number;assetClass:"residential"|"commercial"}}>>([]);
  const [searchRevision,setSearchRevision]=useState(0);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(180000);
  const [minYield, setMinYield] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "yield" | "price">("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState("Castalla, Ibi, Onil, Alcoy, Elda, Villena");
  const [minBedrooms, setMinBedrooms] = useState(2);
  const [assetClass, setAssetClass] = useState<"residential" | "commercial">("residential");
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchMessage, setResearchMessage] = useState("");
  const [researchResults, setResearchResults] = useState<ResearchCandidate[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([
    { key: "manual", label: "URL / manual", kind: "manual", status: "ready", detail: "Entrada directa" },
  ]);

  useEffect(()=>{let active=true;if(user)supabase.from('estate_saved_searches').select('*').order('created_at',{ascending:false}).limit(50).then(({data,error})=>{if(active){if(error)setResearchMessage(error.message);else setSavedSearches(data??[]);}});return()=>{active=false;};},[user,searchRevision]);
  async function saveSearch(){if(!user){setResearchMessage('Inicia sesión para guardar búsquedas.');return;}if(!searchName.trim())return;const {error}=await supabase.from('estate_saved_searches').insert({user_id:user.id,name:searchName.trim(),criteria:{query,maxPrice,minYield,minScore,municipalities,minBedrooms,assetClass}});if(error)setResearchMessage(error.message);else{setSearchName('');setSearchRevision(r=>r+1);}}

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
        body: JSON.stringify({ criteria: { municipalities: municipalities.split(",").map((value) => value.trim()).filter(Boolean), province: "Alicante", maxPrice, minBedrooms: assetClass === "residential" ? minBedrooms : 0, strategy: "long_term", assetClass, maxResults: 16 } }),
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
    try {
      const parsed = parseCsv(await file.text());
      setResearchResults((current) => [...parsed, ...current.filter(item=>!parsed.some(row=>row.url && row.url === item.url))]);
      setResearchMessage(`${parsed.length} filas importadas. Revisa y guarda las oportunidades.`);
    } catch(error) { setResearchMessage(error instanceof Error ? error.message : "CSV no válido."); }
    event.target.value = "";
  }

  const selectedDeals = selected.map((id) => deals.find((deal) => deal.id === id)).filter(Boolean) as SavedDeal[];
  function toggleCompare(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current); }

  return (
    <div className="view view-explore visual-first">
      <SectionHead eyebrow="DEAL RADAR" title="Radar." action={<button className="primary-button" onClick={onNew}>+ Manual</button>} />

      <div className="saved-searches"><label>Nombre de búsqueda<input value={searchName} onChange={e=>setSearchName(e.target.value)} maxLength={120}/></label><button className="ghost-button" onClick={saveSearch}>Guardar filtros</button>{savedSearches.map(search=><button className="ghost-button" key={search.id} onClick={()=>{const c=search.criteria;setQuery(c.query);setMaxPrice(c.maxPrice);setMinYield(c.minYield);setMinScore(c.minScore);setMunicipalities(c.municipalities);setMinBedrooms(c.minBedrooms);setAssetClass(c.assetClass);}}>{search.name}</button>)}</div>
      <ProviderControl />
      <div className="radar-layout">
        <Panel className="radar-source-panel"><SourceOrbit sources={sources} busy={researchBusy} /></Panel>
        <Panel className="research-console">
          <div className="visual-panel-head"><span><Sparkles size={15} /> BÚSQUEDA</span><small>{researchMessage}</small></div>
          <div className="research-asset-switch">
            <button className={assetClass === "residential" ? "active" : ""} onClick={() => setAssetClass("residential")}>Vivienda</button>
            <button className={assetClass === "commercial" ? "active" : ""} onClick={() => setAssetClass("commercial")}>Local / oficina</button>
          </div>
          <div className="research-controls">
            <label className="wide"><span>ZONAS</span><input value={municipalities} onChange={(event) => setMunicipalities(event.target.value)} /></label>
            {assetClass === "residential" ? <label><span>HAB. ≥</span><input type="number" min="0" max="10" value={minBedrooms} onChange={(event) => setMinBedrooms(Number(event.target.value))} /></label> : <label><span>TIPO</span><input value="Comercial" readOnly /></label>}
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

      {selectedDeals.length>1 && <Panel><h3>Comparar con los mismos criterios</h3><div className="comparison-table"><table><thead><tr><th>Métrica</th>{selectedDeals.map(d=><th key={d.id}>{d.title}</th>)}</tr></thead><tbody>{(['Precio','Capital necesario','Cash-flow / mes','Yield sobre coste','DSCR','Máximo compatible','Confianza','Riesgos bloqueantes'] as const).map((label,index)=><tr key={label}><th>{label}</th>{selectedDeals.map(d=>{const o=dealOutput(d);const values=[fmtMoney(dealInput(d)?.purchasePrice),fmtMoney(o?.capitalRequired),fmtMoney(o?.netMonthlyCashFlow),fmtPct(o?.netYieldPct),o?.dscr?.toFixed(2)??'Sin deuda',fmtMoney(o?.maxPurchasePrice),`${Math.round(opportunityScore(d).coverage)}%`,(d.estate_risks??[]).filter(r=>r.is_kill_switch&&!r.resolved_at).length];return <td key={d.id}>{values[index]}</td>;})}</tr>)}</tbody></table></div></Panel>}
      {selectedDeals.length > 0 && (
        <div className="compare-tray"><div className="compare-title"><GitCompareArrows size={16} /><strong>{selectedDeals.length}/3</strong></div><div className="compare-items">{selectedDeals.map((deal) => <button key={deal.id} onClick={() => onOpen(deal)}><span>{deal.title}</span><b>{fmtPct(dealOutput(deal)?.netYieldPct)}</b><small>{Math.round(opportunityScore(deal).score)}</small></button>)}</div><button className="ghost-button" onClick={() => setSelected([])}>×</button></div>
      )}
    </div>
  );
}
