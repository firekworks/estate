"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Database,
  Filter,
  GitCompareArrows,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
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

export function ExploreView({ deals, onNew, onOpen }: { deals: SavedDeal[]; onNew: () => void; onOpen: (deal: SavedDeal) => void }) {
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(200000);
  const [minYield, setMinYield] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "yield" | "price">("score");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeDeals(deals)
      .filter((deal) => {
        const input = dealInput(deal);
        const out = dealOutput(deal);
        if (!input || !out) return false;
        const haystack = `${deal.title} ${deal.municipality ?? ""} ${deal.address ?? ""}`.toLowerCase();
        return (!q || haystack.includes(q)) && input.purchasePrice <= maxPrice && out.netYieldPct >= minYield && out.score >= minScore;
      })
      .sort((a, b) => {
        const aOut = dealOutput(a)!;
        const bOut = dealOutput(b)!;
        if (sort === "yield") return bOut.netYieldPct - aOut.netYieldPct;
        if (sort === "price") return listingPrice(a) - listingPrice(b);
        return bOut.score - aOut.score;
      });
  }, [deals, query, maxPrice, minYield, minScore, sort]);

  const selectedDeals = selected.map((id) => deals.find((deal) => deal.id === id)).filter(Boolean) as SavedDeal[];
  function toggleCompare(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }

  return (
    <div className="view view-explore">
      <SectionHead eyebrow="DEAL DISCOVERY" title="Explora. Filtra. Compara." copy="Aquí se decide qué merece análisis profundo. No es la ficha del inmueble ni el mercado macro: es tu bandeja de oportunidades." action={<button className="primary-button" onClick={onNew}>Añadir anuncio</button>} />

      <div className="explore-toolbar">
        <div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Municipio, calle o nombre…" /></div>
        <div className="sort-switch">
          <ArrowDownUp size={14} />
          {(["score", "yield", "price"] as const).map((option) => <button key={option} className={sort === option ? "active" : ""} onClick={() => setSort(option)}>{option === "score" ? "Score" : option === "yield" ? "Yield" : "Precio"}</button>)}
        </div>
      </div>

      <div className="explore-layout">
        <Panel className="filter-rail">
          <div className="panel-head"><div><span className="eyebrow">FILTROS</span><h3>Tu criterio</h3></div><SlidersHorizontal size={17} /></div>
          <label className="range-field"><span>Precio máximo <strong>{fmtMoney(maxPrice)}</strong></span><input type="range" min="30000" max="400000" step="5000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></label>
          <label className="range-field"><span>Yield mínima <strong>{fmtPct(minYield)}</strong></span><input type="range" min="0" max="15" step="0.5" value={minYield} onChange={(event) => setMinYield(Number(event.target.value))} /></label>
          <label className="range-field"><span>Deal Score mínimo <strong>{minScore}</strong></span><input type="range" min="0" max="90" step="5" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} /></label>
          <div className="filter-summary"><Filter size={14} /><span>{filtered.length} de {activeDeals(deals).length} oportunidades visibles</span></div>
          <div className="source-note"><Database size={14} /><p>Dataset Estate. Las fuentes externas se conectarán por adaptadores autorizados; no se simulan anuncios que no existan.</p></div>
        </Panel>

        <div className="deal-results">
          {!deals.length ? (
            <Panel className="explore-first-run">
              <div className="first-run-graphic"><span /><span /><span /></div>
              <div><span className="eyebrow">FUENTE CERO</span><h2>Construye tu radar con datos reales.</h2><p>Añade URLs manualmente ahora. La arquitectura ya separa Listing, Property y Analysis para incorporar feeds/API licenciadas más adelante sin romper el historial.</p></div>
              <button className="primary-button" onClick={onNew}><Sparkles size={15} /> Añadir primera oportunidad</button>
              <div className="source-lanes"><span>URL manual <b>activo</b></span><span>CSV / feed <b>preparado</b></span><span>API portal <b>requiere proveedor</b></span></div>
            </Panel>
          ) : filtered.length ? (
            <div className="deal-card-grid">
              {filtered.map((deal) => {
                const input = dealInput(deal)!;
                const out = dealOutput(deal)!;
                const checked = selected.includes(deal.id);
                return (
                  <article className="deal-card" key={deal.id}>
                    <button className={`compare-toggle ${checked ? "active" : ""}`} onClick={() => toggleCompare(deal.id)} title="Comparar"><GitCompareArrows size={14} /></button>
                    <button className="deal-card-main" onClick={() => onOpen(deal)}>
                      <div className="deal-card-head"><ScoreDial score={out.score} size="sm" /><div><strong>{deal.title}</strong><span><MapPin size={12} />{deal.municipality || "Ubicación pendiente"}</span></div><StatusPill tone="neutral">{stageLabel(deal.stage)}</StatusPill></div>
                      <div className="deal-price-line"><strong>{fmtMoney(input.purchasePrice)}</strong><span>{deal.built_area_m2 ? `${fmtMoney(input.purchasePrice / deal.built_area_m2)}/m²` : "€/m² pendiente"}</span></div>
                      <div className="deal-kpis"><span><b>{fmtPct(out.netYieldPct)}</b> yield</span><span className={out.netMonthlyCashFlow >= 0 ? "positive" : "negative"}><b>{fmtMoney(out.netMonthlyCashFlow)}</b> /mes</span><span><b>{completenessForDeal(deal)}%</b> datos</span></div>
                      <div className="deal-card-footer"><span>Máx. {fmtMoney(out.maxPurchasePrice)}</span><ArrowRight size={14} /></div>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <Panel className="no-filter-results"><Search size={21} /><div><strong>Ninguna operación pasa estos filtros.</strong><p>Relaja un criterio o añade nuevas oportunidades; los datos no se alteran para forzar resultados.</p></div></Panel>
          )}
        </div>
      </div>

      {selectedDeals.length > 0 && (
        <div className="compare-tray">
          <div className="compare-title"><GitCompareArrows size={16} /><strong>Comparación</strong><span>{selectedDeals.length}/3</span></div>
          <div className="compare-items">
            {selectedDeals.map((deal) => {
              const out = dealOutput(deal)!;
              return <button key={deal.id} onClick={() => onOpen(deal)}><span>{deal.title}</span><b>{fmtPct(out.netYieldPct)}</b><small>Score {Math.round(out.score)}</small></button>;
            })}
          </div>
          <button className="ghost-button" onClick={() => setSelected([])}>Limpiar</button>
        </div>
      )}
    </div>
  );
}

type MarketGroup = {
  municipality: string;
  count: number;
  priceM2: number | null;
  rentM2: number | null;
  yieldPct: number | null;
  days: number | null;
  score: number | null;
};

export function MarketView({ deals, onNew, onOpen }: { deals: SavedDeal[]; onNew: () => void; onOpen: (deal: SavedDeal) => void }) {
  const usable = activeDeals(deals).filter((deal) => dealInput(deal) && dealOutput(deal));
  const groups = useMemo(() => {
    const byCity = new Map<string, SavedDeal[]>();
    for (const deal of usable) {
      const city = deal.municipality?.trim() || "Sin municipio";
      byCity.set(city, [...(byCity.get(city) ?? []), deal]);
    }
    return [...byCity.entries()].map(([municipality, items]): MarketGroup => {
      const priceM2 = items.flatMap((deal) => {
        const price = listingPrice(deal);
        return deal.built_area_m2 && price ? [price / deal.built_area_m2] : [];
      });
      const rentM2 = items.flatMap((deal) => {
        const input = dealInput(deal);
        return deal.built_area_m2 && input?.monthlyRent ? [input.monthlyRent / deal.built_area_m2] : [];
      });
      const yields = items.flatMap((deal) => dealOutput(deal) ? [dealOutput(deal)!.netYieldPct] : []);
      const days = items.flatMap((deal) => typeof dealInput(deal)?.daysOnMarket === "number" ? [dealInput(deal)!.daysOnMarket ?? 0] : []);
      const scores = items.flatMap((deal) => dealOutput(deal) ? [dealOutput(deal)!.score] : []);
      return { municipality, count: items.length, priceM2: median(priceM2), rentM2: median(rentM2), yieldPct: median(yields), days: median(days), score: median(scores) };
    }).sort((a, b) => b.count - a.count || (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
  }, [usable]);

  const plotDeals = usable.filter((deal) => deal.built_area_m2 && listingPrice(deal) > 0 && dealOutput(deal));
  const maxPriceM2 = Math.max(1, ...plotDeals.map((deal) => listingPrice(deal) / (deal.built_area_m2 || 1)));
  const maxYield = Math.max(1, ...plotDeals.map((deal) => dealOutput(deal)?.netYieldPct ?? 0));

  return (
    <div className="view view-market">
      <SectionHead eyebrow="MARKET INTELLIGENCE" title="Mercado: contexto, no anuncios." copy="Explorar responde ‘qué oportunidades tengo’. Mercado responde ‘qué está pasando en cada zona y qué tan fiable es mi muestra’." action={<button className="ghost-button" onClick={onNew}>Añadir muestra</button>} />

      <div className="market-topline">
        <Metric label="Muestra propia" value={usable.length} note="operaciones con análisis" />
        <Metric label="Municipios" value={groups.length} note="con evidencia propia" />
        <Metric label="Precio mediano" value={fmtMoney(median(usable.flatMap((deal) => deal.built_area_m2 ? [listingPrice(deal) / deal.built_area_m2] : [])))} note="€/m² de tu muestra" />
        <Metric label="Yield mediana" value={fmtPct(median(usable.flatMap((deal) => dealOutput(deal) ? [dealOutput(deal)!.netYieldPct] : [])))} note="neta estimada" />
      </div>

      <div className="market-layout">
        <Panel className="market-plane">
          <div className="panel-head"><div><span className="eyebrow">PLANO DE OPORTUNIDAD</span><h3>Precio €/m² × yield neta</h3></div><BarChart3 size={17} /></div>
          <div className="scatter-frame">
            <div className="scatter-axis y">YIELD ↑</div><div className="scatter-axis x">PRECIO €/m² →</div>
            <div className="scatter-grid" />
            {plotDeals.map((deal) => {
              const out = dealOutput(deal)!;
              const priceM2 = listingPrice(deal) / (deal.built_area_m2 || 1);
              const left = Math.min(94, Math.max(4, (priceM2 / maxPriceM2) * 88));
              const bottom = Math.min(90, Math.max(6, (out.netYieldPct / maxYield) * 82));
              return <button key={deal.id} className="scatter-point" style={{ left: `${left}%`, bottom: `${bottom}%`, "--point-score": out.score } as CSSProperties} onClick={() => onOpen(deal)} title={`${deal.title}: ${fmtMoney(priceM2)}/m² · ${fmtPct(out.netYieldPct)}`}><span>{Math.round(out.score)}</span></button>;
            })}
            {!plotDeals.length && <div className="scatter-empty"><CircleDollarSign size={24} /><strong>Aún no hay puntos comparables.</strong><span>Necesitas precio, superficie y análisis guardado.</span></div>}
          </div>
        </Panel>

        <Panel className="market-confidence">
          <div className="panel-head"><div><span className="eyebrow">CALIDAD DE MUESTRA</span><h3>No confundir señal con verdad.</h3></div><Database size={17} /></div>
          <div className="confidence-scale">
            <div className={usable.length >= 10 ? "active" : ""}><b>10+</b><span>muestra útil</span></div>
            <div className={usable.length >= 3 && usable.length < 10 ? "active" : ""}><b>3–9</b><span>orientativa</span></div>
            <div className={usable.length < 3 ? "active" : ""}><b>0–2</b><span>insuficiente</span></div>
          </div>
          <p>Estate conserva el dato y su procedencia. Una mediana con dos anuncios no se muestra como “precio de mercado”.</p>
          <div className="data-source-stack"><span><i className="source-live" />Dataset propio <b>{usable.length}</b></span><span><i />Comparables externos <b>sin conectar</b></span><span><i />Demanda portal <b>sin conectar</b></span></div>
        </Panel>
      </div>

      <Panel className="market-table-panel">
        <div className="panel-head"><div><span className="eyebrow">MICROMERCADOS</span><h3>Lo que ya sabes por municipio</h3></div><MapPin size={17} /></div>
        {groups.length ? (
          <div className="market-table">
            <div className="market-row market-head"><span>Zona</span><span>Muestra</span><span>€/m²</span><span>Alquiler/m²</span><span>Yield</span><span>Días</span><span>Score</span><span>Confianza</span></div>
            {groups.map((group) => <div className="market-row" key={group.municipality}><strong>{group.municipality}</strong><span>{group.count}</span><span>{group.priceM2 ? fmtMoney(group.priceM2) : "—"}</span><span>{group.rentM2 ? `${group.rentM2.toFixed(1)} €/m²` : "—"}</span><span>{fmtPct(group.yieldPct)}</span><span>{group.days === null ? "—" : `${Math.round(group.days)} d`}</span><span>{group.score === null ? "—" : Math.round(group.score)}</span><StatusPill tone={group.count >= 10 ? "good" : group.count >= 3 ? "warn" : "neutral"}>{group.count >= 10 ? "Útil" : group.count >= 3 ? "Orientativa" : "Baja"}</StatusPill></div>)}
          </div>
        ) : (
          <div className="market-onboarding"><div><strong>Tu primera muestra crea el primer micromercado.</strong><p>Después podrás comparar Castalla, Ibi, Onil, Villena, Alicante o cualquier zona sin mezclar tipologías ni calidades.</p></div><button className="primary-button" onClick={onNew}>Crear muestra <ArrowRight size={14} /></button></div>
        )}
      </Panel>
    </div>
  );
}
