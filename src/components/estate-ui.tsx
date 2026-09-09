"use client";

import type { CSSProperties, Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Database,
  Gauge,
  Home,
  Layers3,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  PanelTop,
  Plus,
  Radar,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type { DealAnalysis, DealInputs, ScoreComponent, StressScenario } from "@/lib/estate-engine";
import type { EstateStage, PropertyDraft, SavedDeal } from "@/lib/estate-store";

export type View =
  | "dashboard"
  | "analyze"
  | "watchlist"
  | "finder"
  | "market"
  | "renovation"
  | "portfolio";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export function fmtMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? currency.format(value) : "—";
}

export function fmtPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${decimal.format(value)}%` : "—";
}

function fmtCompact(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? compactNumber.format(value) : "—";
}

function latestAnalysis(deal: SavedDeal) {
  return deal.estate_deal_analyses?.[0];
}

function savedOutput(deal: SavedDeal): DealAnalysis | null {
  const output = latestAnalysis(deal)?.outputs;
  if (!output || typeof output !== "object") return null;
  return output as unknown as DealAnalysis;
}

function savedInput(deal: SavedDeal): DealInputs | null {
  const input = latestAnalysis(deal)?.inputs;
  if (!input || typeof input !== "object") return null;
  return input as DealInputs;
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    watchlist: "Radar",
    analyzing: "Análisis",
    visit: "Visita",
    negotiating: "Negociación",
    discarded: "Descartada",
    purchased: "Comprada",
    managed: "En cartera",
    sold: "Vendida",
  };
  return labels[stage] ?? stage;
}

const NAV: Array<{ key: View; label: string; icon: ReactNode }> = [
  { key: "dashboard", label: "Inicio", icon: <Home size={18} /> },
  { key: "analyze", label: "Analizar", icon: <Calculator size={18} /> },
  { key: "watchlist", label: "Operaciones", icon: <Radar size={18} /> },
  { key: "finder", label: "Finder", icon: <Search size={18} /> },
  { key: "market", label: "Mercado", icon: <MapPin size={18} /> },
  { key: "renovation", label: "Reformas", icon: <Layers3 size={18} /> },
  { key: "portfolio", label: "Portfolio", icon: <Wallet size={18} /> },
];

export function AppSidebar({
  view,
  open,
  savedCount,
  onSelect,
  onClose,
}: {
  view: View;
  open: boolean;
  savedCount: number;
  onSelect: (view: View) => void;
  onClose: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand-row">
        <div className="brand-mark"><Building2 size={18} /></div>
        <div className="brand-copy">
          <strong>Estate</strong>
          <span>Firekworks</span>
        </div>
        <button className="icon-button sidebar-close" onClick={onClose} aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>

      <nav className="nav-stack" aria-label="Navegación principal">
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${view === item.key ? "active" : ""}`}
            onClick={() => onSelect(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "watchlist" && savedCount > 0 && (
              <span className="nav-count">{savedCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="system-status">
          <span className="live-dot" />
          <span>Estate OS</span>
          <small>online</small>
        </div>
      </div>
    </aside>
  );
}

function viewName(view: View) {
  const names: Record<View, string> = {
    dashboard: "Inicio",
    analyze: "Analizar",
    watchlist: "Operaciones",
    finder: "Finder",
    market: "Mercado",
    renovation: "Reformas",
    portfolio: "Portfolio",
  };
  return names[view];
}

export function Topbar({
  view,
  authReady,
  signedIn,
  onMenu,
  onLogin,
  onLogout,
  onNew,
}: {
  view: View;
  authReady: boolean;
  signedIn: boolean;
  onMenu: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onNew: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Abrir menú">
          <Menu size={19} />
        </button>
        <span className="topbar-title">{viewName(view)}</span>
      </div>
      <div className="topbar-actions">
        <span className="engine-pill"><Activity size={13} /> v1.0</span>
        {authReady && (
          signedIn ? (
            <button className="icon-button" onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={17} />
            </button>
          ) : (
            <button className="ghost-button" onClick={onLogin}>
              <LogIn size={15} />
              <span>Entrar</span>
            </button>
          )
        )}
        <button className="primary-button compact" onClick={onNew}>
          <Plus size={16} />
          <span>Nueva</span>
        </button>
      </div>
    </header>
  );
}

function ScoreOrb({
  score,
  verdict,
  coverage,
  compact = false,
}: {
  score: number;
  verdict?: string;
  coverage?: number;
  compact?: boolean;
}) {
  const normalized = Math.max(0, Math.min(100, score));
  return (
    <div
      className={`score-orb ${compact ? "compact" : ""}`}
      style={{ "--score": `${normalized * 3.6}deg` } as CSSProperties}
      aria-label={`Deal Score ${decimal.format(score)} sobre 100`}
    >
      <div className="score-orb-glow" />
      <div className="score-orb-ring">
        <div className="score-orb-core">
          <strong>{decimal.format(score)}</strong>
          <small>/100</small>
        </div>
      </div>
      {verdict && <span className="score-verdict">{verdict}</span>}
      {coverage !== undefined && (
        <span className="score-confidence">{Math.round(coverage * 100)}% datos</span>
      )}
    </div>
  );
}

function TinySpark({ values }: { values: number[] }) {
  const safe = values.length > 1 ? values : [0, values[0] ?? 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const span = Math.max(1, max - min);
  const points = safe
    .map((value, index) => {
      const x = (index / (safe.length - 1)) * 100;
      const y = 28 - ((value - min) / span) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="tiny-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function MetricTile({
  label,
  value,
  note,
  values,
  positive,
}: {
  label: string;
  value: string;
  note?: string;
  values?: number[];
  positive?: boolean;
}) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong className={positive ? "positive" : ""}>{value}</strong>
      {values && <TinySpark values={values} />}
      {note && <small>{note}</small>}
    </div>
  );
}

function PriceGauge({
  asking,
  ceiling,
  market,
  compact = false,
}: {
  asking: number;
  ceiling: number | null;
  market?: number;
  compact?: boolean;
}) {
  const values = [asking, ceiling ?? 0, market ?? 0].filter((value) => value > 0);
  const max = Math.max(...values, 1) * 1.08;
  const askPct = Math.min(100, (asking / max) * 100);
  const ceilingPct = ceiling ? Math.min(100, (ceiling / max) * 100) : 0;
  const marketPct = market ? Math.min(100, (market / max) * 100) : 0;
  const gap = ceiling ? asking - ceiling : null;

  return (
    <div className={`price-gauge ${compact ? "compact" : ""}`}>
      <div className="gauge-head">
        <span>Precio</span>
        {gap !== null && (
          <strong className={gap <= 0 ? "positive" : "warning"}>
            {gap <= 0 ? `${fmtMoney(Math.abs(gap))} margen` : `${fmtMoney(gap)} por encima`}
          </strong>
        )}
      </div>
      <div className="gauge-track">
        <div className="gauge-safe" style={{ width: `${ceilingPct}%` }} />
        {marketPct > 0 && (
          <span className="gauge-marker market" style={{ left: `${marketPct}%` }}>
            <i />
          </span>
        )}
        {ceilingPct > 0 && (
          <span className="gauge-marker ceiling" style={{ left: `${ceilingPct}%` }}>
            <i />
          </span>
        )}
        <span className="gauge-marker asking" style={{ left: `${askPct}%` }}>
          <i />
        </span>
      </div>
      <div className="gauge-legend">
        <span><i className="legend-dot safe" />máx. {fmtMoney(ceiling)}</span>
        {market ? <span><i className="legend-dot market" />mercado {fmtMoney(market)}</span> : <span />}
        <span><i className="legend-dot ask" />pide {fmtMoney(asking)}</span>
      </div>
    </div>
  );
}

function StressRail({ scenarios, compact = false }: { scenarios: StressScenario[]; compact?: boolean }) {
  const adverse = scenarios.filter((scenario) => scenario.key !== "base");
  return (
    <div className={`stress-rail ${compact ? "compact" : ""}`}>
      {adverse.map((scenario) => (
        <div className="stress-node" key={scenario.key} title={`${scenario.label}: ${fmtMoney(scenario.monthlyCashFlow)}/mes`}>
          <span className={`stress-dot ${scenario.passes ? "pass" : "fail"}`} />
          <small>{scenario.label.replace("Alquiler ", "").replace("Reforma ", "")}</small>
        </div>
      ))}
      <div className="stress-line" />
    </div>
  );
}

function PipelineStrip({ deals }: { deals: SavedDeal[] }) {
  const stages: Array<{ key: EstateStage; label: string }> = [
    { key: "watchlist", label: "Radar" },
    { key: "analyzing", label: "Análisis" },
    { key: "visit", label: "Visita" },
    { key: "negotiating", label: "Negocia" },
    { key: "purchased", label: "Compra" },
    { key: "managed", label: "Cartera" },
  ];

  return (
    <div className="pipeline-strip">
      {stages.map((stage) => {
        const count = deals.filter((deal) => deal.stage === stage.key).length;
        return (
          <div className={`pipeline-step ${count ? "has-items" : ""}`} key={stage.key}>
            <span>{count}</span>
            <small>{stage.label}</small>
          </div>
        );
      })}
      <div className="pipeline-line" />
    </div>
  );
}

export function DashboardView({
  analysis,
  inputs,
  draft,
  deals,
  loading,
  onAnalyze,
  onOperations,
  onOpenDeal,
}: {
  analysis: DealAnalysis;
  inputs: DealInputs;
  draft: PropertyDraft;
  deals: SavedDeal[];
  loading: boolean;
  onAnalyze: () => void;
  onOperations: () => void;
  onOpenDeal: (deal: SavedDeal) => void;
}) {
  const recent = deals.slice(0, 3);
  const cashHistory = recent
    .map((deal) => savedOutput(deal)?.netMonthlyCashFlow ?? 0)
    .reverse()
    .concat(analysis.netMonthlyCashFlow);
  const savedTop = deals
    .map((deal) => ({ deal, out: savedOutput(deal) }))
    .filter((item): item is { deal: SavedDeal; out: DealAnalysis } => Boolean(item.out))
    .sort((a, b) => b.out.score - a.out.score)[0];

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">REAL ESTATE INTELLIGENCE</span>
          <h1>Decide en segundos.</h1>
        </div>
        <button className="primary-button" onClick={onAnalyze}>
          <Sparkles size={16} /> Analizar
        </button>
      </div>

      <div className="dashboard-focus">
        <article className="glass-card deal-focus-card">
          <div className="focus-score">
            <ScoreOrb
              score={analysis.score}
              verdict={analysis.verdict}
              coverage={analysis.scoreCoverage}
            />
          </div>
          <div className="focus-copy">
            <span className="micro-label">SIMULACIÓN ACTUAL</span>
            <h2>{draft.title || "Nueva operación"}</h2>
            <div className="property-pills">
              {draft.municipality && <span><MapPin size={13} />{draft.municipality}</span>}
              {inputs.builtAreaM2 > 0 && <span>{decimal.format(inputs.builtAreaM2)} m²</span>}
              {draft.bedrooms !== undefined && <span>{draft.bedrooms} hab.</span>}
            </div>
            <StressRail scenarios={analysis.stress} compact />
          </div>
          <button className="round-action" onClick={onAnalyze} aria-label="Abrir análisis">
            <ArrowRight size={19} />
          </button>
        </article>

        <div className="metric-grid">
          <MetricTile
            label="Capital"
            value={fmtMoney(analysis.capitalRequired)}
            note={`${fmtPct(analysis.cashOnCashPct)} CoC`}
          />
          <MetricTile
            label="Cash-flow"
            value={`${fmtMoney(analysis.netMonthlyCashFlow)}/mes`}
            positive={analysis.netMonthlyCashFlow >= 0}
            values={cashHistory}
          />
          <MetricTile
            label="Máximo"
            value={fmtMoney(analysis.maxPurchasePrice)}
            note={`objetivo ${fmtPct(inputs.targetNetYieldPct)}`}
          />
        </div>
      </div>

      <div className="dashboard-secondary">
        <article className="glass-card visual-card price-card">
          <div className="card-title-row">
            <div>
              <span className="micro-label">DISCIPLINA DE COMPRA</span>
              <h3>No cruzar la línea.</h3>
            </div>
            <Target size={19} />
          </div>
          <PriceGauge
            asking={inputs.purchasePrice}
            ceiling={analysis.maxPurchasePrice}
            market={inputs.marketValueEstimate}
          />
        </article>

        <article className="glass-card visual-card pipeline-card">
          <div className="card-title-row">
            <div>
              <span className="micro-label">PIPELINE</span>
              <h3>{deals.length ? `${deals.length} operaciones` : "Empieza tu radar"}</h3>
            </div>
            <button className="text-action" onClick={onOperations}>Ver <ChevronRight size={14} /></button>
          </div>
          {loading ? <SkeletonBars /> : <PipelineStrip deals={deals} />}
        </article>
      </div>

      <div className="dashboard-secondary">
        <article className="glass-card visual-card stress-card">
          <div className="card-title-row">
            <div>
              <span className="micro-label">STRESS</span>
              <h3>{analysis.stressStatus === "green" ? "Resiste." : analysis.stressStatus === "orange" ? "Va justo." : "Se rompe."}</h3>
            </div>
            <Gauge size={19} />
          </div>
          <StressRail scenarios={analysis.stress} />
          <div className="stress-cash-row">
            {analysis.stress.slice(1).map((scenario) => (
              <span key={scenario.key} className={scenario.passes ? "positive" : "negative"}>
                {fmtMoney(scenario.monthlyCashFlow)}
              </span>
            ))}
          </div>
        </article>

        <article className="glass-card visual-card recent-card">
          <div className="card-title-row">
            <div>
              <span className="micro-label">RADAR</span>
              <h3>{savedTop ? "Mejor señal guardada" : "Sin señales todavía"}</h3>
            </div>
            <Radar size={19} />
          </div>
          {savedTop ? (
            <button className="top-signal" onClick={() => onOpenDeal(savedTop.deal)}>
              <div>
                <strong>{savedTop.deal.title}</strong>
                <span>{savedTop.deal.municipality ?? "Sin ubicación"} · {fmtPct(savedTop.out.netYieldPct)}</span>
              </div>
              <div className="signal-score">{decimal.format(savedTop.out.score)}</div>
            </button>
          ) : (
            <button className="empty-inline" onClick={onAnalyze}>
              <span className="radar-mini"><i /><i /><i /></span>
              <span>Pega tu primer anuncio</span>
              <ArrowRight size={16} />
            </button>
          )}
          {recent.length > 0 && (
            <div className="recent-dots" aria-label={`${recent.length} operaciones recientes`}>
              {recent.map((deal) => <span key={deal.id} />)}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

const ANALYZER_STEPS = [
  { label: "Inmueble", icon: <Building2 size={16} /> },
  { label: "Compra", icon: <CircleDollarSign size={16} /> },
  { label: "Financia", icon: <PanelTop size={16} /> },
  { label: "Opera", icon: <Layers3 size={16} /> },
  { label: "Objetivo", icon: <Target size={16} /> },
];

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-shell">
        <input
          type="number"
          value={value ?? ""}
          min={min}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-shell">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AnalyzerStepContent({
  step,
  draft,
  setDraft,
  inputs,
  updateInput,
  importUrl,
  setImportUrl,
  importBusy,
  importMessage,
  onImport,
}: {
  step: number;
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  importUrl: string;
  setImportUrl: (value: string) => void;
  importBusy: boolean;
  importMessage: string;
  onImport: () => void;
}) {
  if (step === 0) {
    return (
      <div className="step-panel">
        <div className="url-capture">
          <Search size={18} />
          <input
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            placeholder="Pega un anuncio"
          />
          <button onClick={onImport} disabled={importBusy || !importUrl.trim()}>
            {importBusy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
          </button>
        </div>
        {importMessage && <div className="source-chip"><Check size={13} />{importMessage}</div>}

        <div className="field-grid">
          <TextField
            label="Nombre"
            value={draft.title}
            onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
            placeholder="Piso centro"
          />
          <TextField
            label="Municipio"
            value={draft.municipality}
            onChange={(value) => setDraft((current) => ({ ...current, municipality: value }))}
          />
          <TextField
            label="Provincia"
            value={draft.province}
            onChange={(value) => setDraft((current) => ({ ...current, province: value }))}
          />
          <TextField
            label="Referencia"
            value={draft.address ?? ""}
            onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
            placeholder="Calle / zona"
          />
          <NumberField
            label="Superficie"
            value={inputs.builtAreaM2}
            suffix="m²"
            onChange={(value) => updateInput("builtAreaM2", value)}
          />
          <NumberField
            label="Dormitorios"
            value={draft.bedrooms}
            onChange={(value) => setDraft((current) => ({ ...current, bedrooms: value }))}
          />
        </div>

        <div className="toggle-row">
          <span>Ascensor</span>
          <button
            className={`switch ${draft.hasElevator ? "on" : ""}`}
            type="button"
            onClick={() => setDraft((current) => ({ ...current, hasElevator: !current.hasElevator }))}
            aria-pressed={Boolean(draft.hasElevator)}
          >
            <i />
          </button>
        </div>
        <Segmented
          value={draft.condition ?? "unknown"}
          onChange={(value) => setDraft((current) => ({
            ...current,
            condition: value as PropertyDraft["condition"],
          }))}
          options={[
            { value: "good", label: "Bien" },
            { value: "dated", label: "Antiguo" },
            { value: "light_renovation", label: "Reforma ligera" },
            { value: "full_renovation", label: "Integral" },
          ]}
        />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="step-panel">
        <div className="field-grid">
          <NumberField label="Precio" value={inputs.purchasePrice} suffix="€" onChange={(value) => updateInput("purchasePrice", value)} />
          <NumberField label="Valor mercado" value={inputs.marketValueEstimate} suffix="€" onChange={(value) => updateInput("marketValueEstimate", value)} />
          <NumberField label="Alquiler" value={inputs.monthlyRent} suffix="€/mes" onChange={(value) => updateInput("monthlyRent", value)} />
          <NumberField label="ITP" value={inputs.purchaseTaxPct} suffix="%" step={0.1} onChange={(value) => updateInput("purchaseTaxPct", value)} />
        </div>
        <details className="advanced-drawer">
          <summary>Señales de negociación <ChevronRight size={15} /></summary>
          <div className="field-grid">
            <NumberField label="Días publicado" value={inputs.daysOnMarket} suffix="días" onChange={(value) => updateInput("daysOnMarket", value)} />
            <NumberField label="Bajadas" value={inputs.priceDrops} onChange={(value) => updateInput("priceDrops", value)} />
          </div>
        </details>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="step-panel">
        <div className="field-grid">
          <NumberField label="LTV" value={inputs.ltvPct} suffix="%" step={0.5} onChange={(value) => updateInput("ltvPct", value)} />
          <NumberField label="Interés" value={inputs.interestPct} suffix="%" step={0.05} onChange={(value) => updateInput("interestPct", value)} />
          <NumberField label="Plazo" value={inputs.termYears} suffix="años" onChange={(value) => updateInput("termYears", value)} />
        </div>
        <div className="finance-visual">
          <div className="finance-ring" style={{ "--ltv": `${Math.min(100, inputs.ltvPct) * 3.6}deg` } as CSSProperties}>
            <div><strong>{Math.round(inputs.ltvPct)}%</strong><span>banco</span></div>
          </div>
          <div className="finance-split">
            <span><i />Préstamo</span>
            <strong>{fmtMoney(inputs.purchasePrice * inputs.ltvPct / 100)}</strong>
            <span><i />Entrada</span>
            <strong>{fmtMoney(inputs.purchasePrice * (1 - inputs.ltvPct / 100))}</strong>
          </div>
        </div>
        <details className="advanced-drawer">
          <summary>Costes de financiación <ChevronRight size={15} /></summary>
          <div className="field-grid">
            <NumberField label="Tasación" value={inputs.appraisal} suffix="€" onChange={(value) => updateInput("appraisal", value)} />
            <NumberField label="Notaría + registro" value={inputs.notaryRegistry} suffix="€" onChange={(value) => updateInput("notaryRegistry", value)} />
            <NumberField label="Otros" value={inputs.financingFees} suffix="€" onChange={(value) => updateInput("financingFees", value)} />
          </div>
        </details>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="step-panel">
        <div className="field-grid">
          <NumberField label="Reforma" value={inputs.renovation} suffix="€" onChange={(value) => updateInput("renovation", value)} />
          <NumberField label="Mobiliario" value={inputs.furniture} suffix="€" onChange={(value) => updateInput("furniture", value)} />
          <NumberField label="Colchón" value={inputs.reserve} suffix="€" onChange={(value) => updateInput("reserve", value)} />
          <NumberField label="Comunidad" value={inputs.communityMonthly} suffix="€/mes" onChange={(value) => updateInput("communityMonthly", value)} />
          <NumberField label="IBI" value={inputs.ibiAnnual} suffix="€/año" onChange={(value) => updateInput("ibiAnnual", value)} />
          <NumberField label="Seguro" value={inputs.insuranceAnnual} suffix="€/año" onChange={(value) => updateInput("insuranceAnnual", value)} />
        </div>
        <details className="advanced-drawer">
          <summary>Explotación <ChevronRight size={15} /></summary>
          <div className="field-grid">
            <NumberField label="Mantenimiento" value={inputs.maintenanceMonthly} suffix="€/mes" onChange={(value) => updateInput("maintenanceMonthly", value)} />
            <NumberField label="Gestión" value={inputs.managementPct} suffix="%" step={0.5} onChange={(value) => updateInput("managementPct", value)} />
            <NumberField label="Vacancia" value={inputs.vacancyPct} suffix="%" step={0.5} onChange={(value) => updateInput("vacancyPct", value)} />
            <NumberField label="Otros" value={inputs.otherMonthly} suffix="€/mes" onChange={(value) => updateInput("otherMonthly", value)} />
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="step-panel">
      <div className="field-grid">
        <NumberField label="Objetivo neto" value={inputs.targetNetYieldPct} suffix="%" step={0.25} onChange={(value) => updateInput("targetNetYieldPct", value)} />
        <NumberField label="Ahorro mensual" value={inputs.monthlySavings} suffix="€/mes" onChange={(value) => updateInput("monthlySavings", value)} />
        <NumberField label="Próximo capital" value={inputs.nextCapitalTarget} suffix="€" onChange={(value) => updateInput("nextCapitalTarget", value)} />
        <NumberField label="Capital recuperable" value={inputs.recoverableCapital} suffix="€" onChange={(value) => updateInput("recoverableCapital", value)} />
      </div>
      <div className="confidence-control">
        <div>
          <span>Confianza de datos</span>
          <strong>{Math.round(inputs.dataConfidence * 100)}%</strong>
        </div>
        <input
          type="range"
          min="0.2"
          max="1"
          step="0.01"
          value={inputs.dataConfidence}
          onChange={(event) => updateInput("dataConfidence", Number(event.target.value))}
        />
        <div className="confidence-scale"><span>Supuestos</span><span>Verificado</span></div>
      </div>
    </div>
  );
}

function ScoreBars({ components }: { components: ScoreComponent[] }) {
  return (
    <div className="score-bars">
      {components
        .slice()
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map((component) => (
          <div className="score-bar" key={component.key}>
            <div><span>{component.label}</span><strong>{Math.round(component.score)}</strong></div>
            <div className="bar-track"><i style={{ width: `${component.score}%` }} /></div>
          </div>
        ))}
    </div>
  );
}

export function AnalyzerView({
  draft,
  setDraft,
  inputs,
  updateInput,
  analysis,
  importUrl,
  setImportUrl,
  importBusy,
  importMessage,
  onImport,
  onSave,
  saving,
  signedIn,
  step,
  setStep,
}: {
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  analysis: DealAnalysis;
  importUrl: string;
  setImportUrl: (value: string) => void;
  importBusy: boolean;
  importMessage: string;
  onImport: () => void;
  onSave: () => void;
  saving: boolean;
  signedIn: boolean;
  step: number;
  setStep: (step: number) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <section className="view enter-view">
      <div className="hero analyzer-hero">
        <div>
          <span className="eyebrow">DEAL ANALYZER</span>
          <h1>Una decisión. Cinco pasos.</h1>
        </div>
        <button className="ghost-button desktop-save" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {signedIn ? "Guardar" : "Guardar al entrar"}
        </button>
      </div>

      <div className="analyzer-layout">
        <div className="wizard-column">
          <div className="stepper">
            {ANALYZER_STEPS.map((item, index) => (
              <button
                key={item.label}
                className={`${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
                onClick={() => setStep(index)}
              >
                <span>{index < step ? <Check size={15} /> : item.icon}</span>
                <small>{item.label}</small>
              </button>
            ))}
            <div className="stepper-line" />
          </div>

          <article className="glass-card wizard-card">
            <div className="wizard-heading">
              <span>{String(step + 1).padStart(2, "0")}</span>
              <h2>{ANALYZER_STEPS[step].label}</h2>
            </div>
            <AnalyzerStepContent
              step={step}
              draft={draft}
              setDraft={setDraft}
              inputs={inputs}
              updateInput={updateInput}
              importUrl={importUrl}
              setImportUrl={setImportUrl}
              importBusy={importBusy}
              importMessage={importMessage}
              onImport={onImport}
            />
            <div className="wizard-actions">
              <button
                className="secondary-button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
              >
                <ChevronLeft size={16} /> Atrás
              </button>
              {step < ANALYZER_STEPS.length - 1 ? (
                <button className="primary-button" onClick={() => setStep(step + 1)}>
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button className="primary-button" onClick={onSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  Guardar
                </button>
              )}
            </div>
          </article>
        </div>

        <aside className="live-dock">
          <article className="glass-card live-score-card">
            <div className="live-score-head">
              <ScoreOrb
                compact
                score={analysis.score}
                verdict={analysis.verdict}
                coverage={analysis.scoreCoverage}
              />
              <div className="live-signal">
                <span className={`signal-light ${analysis.stressStatus}`} />
                <small>{analysis.stressStatus === "green" ? "Resistente" : analysis.stressStatus === "orange" ? "Ajustada" : "Frágil"}</small>
              </div>
            </div>

            <div className="live-metrics">
              <div><span>Capital</span><strong>{fmtMoney(analysis.capitalRequired)}</strong></div>
              <div><span>Cash-flow</span><strong className={analysis.netMonthlyCashFlow >= 0 ? "positive" : "negative"}>{fmtMoney(analysis.netMonthlyCashFlow)}</strong></div>
              <div><span>Yield</span><strong>{fmtPct(analysis.netYieldPct)}</strong></div>
            </div>

            <PriceGauge
              asking={inputs.purchasePrice}
              ceiling={analysis.maxPurchasePrice}
              market={inputs.marketValueEstimate}
              compact
            />

            <button className="detail-toggle" onClick={() => setDetailOpen((open) => !open)}>
              <BarChart3 size={15} />
              {detailOpen ? "Ocultar detalle" : "Ver por qué"}
              <ChevronRight size={14} className={detailOpen ? "rotate-90" : ""} />
            </button>

            {detailOpen && (
              <div className="live-detail">
                <ScoreBars components={analysis.scoreComponents} />
                <StressRail scenarios={analysis.stress} compact />
              </div>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}

const FILTER_STAGES: Array<{ value: "all" | EstateStage; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "watchlist", label: "Radar" },
  { value: "analyzing", label: "Análisis" },
  { value: "visit", label: "Visita" },
  { value: "negotiating", label: "Negocia" },
  { value: "purchased", label: "Compra" },
  { value: "managed", label: "Cartera" },
];

const STAGE_OPTIONS: Array<{ value: EstateStage; label: string }> = [
  { value: "watchlist", label: "Radar" },
  { value: "analyzing", label: "Análisis" },
  { value: "visit", label: "Visita" },
  { value: "negotiating", label: "Negociación" },
  { value: "discarded", label: "Descartada" },
  { value: "purchased", label: "Comprada" },
  { value: "managed", label: "En cartera" },
  { value: "sold", label: "Vendida" },
];

function PropertyVisualCard({
  deal,
  onOpen,
  onStageChange,
}: {
  deal: SavedDeal;
  onOpen: () => void;
  onStageChange?: (stage: EstateStage) => void;
}) {
  const out = savedOutput(deal);
  const input = savedInput(deal);
  return (
    <article className="property-card">
      <button className="property-card-main" onClick={onOpen}>
        <div className="property-thumbnail">
          <Building2 size={24} />
          <span>{deal.municipality?.slice(0, 2).toUpperCase() || "ES"}</span>
        </div>
        <div className="property-copy">
          <div className="property-topline">
            <span>{stageLabel(deal.stage)}</span>
            <strong>{out ? decimal.format(out.score) : "—"}</strong>
          </div>
          <h3>{deal.title}</h3>
          <div className="property-meta">
            {deal.municipality && <span><MapPin size={12} />{deal.municipality}</span>}
            {input && <span>{fmtMoney(input.purchasePrice)}</span>}
          </div>
        </div>
        <ArrowRight size={17} className="property-arrow" />
      </button>
      {onStageChange && (
        <select
          className="stage-select"
          value={deal.stage}
          onChange={(event) => onStageChange(event.target.value as EstateStage)}
          aria-label={`Estado de ${deal.title}`}
        >
          {STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}
    </article>
  );
}

function EmptyRadar({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <div className="empty-state">
      <div className="radar-visual" aria-hidden="true">
        <i className="ring r1" />
        <i className="ring r2" />
        <i className="ring r3" />
        <i className="sweep" />
        <i className="blip b1" />
        <i className="blip b2" />
      </div>
      <h2>{label}</h2>
      <button className="primary-button" onClick={onClick}>{action}<ArrowRight size={16} /></button>
    </div>
  );
}

export function OperationsView({
  user,
  deals,
  loading,
  onLogin,
  onNew,
  onOpen,
  onStageChange,
}: {
  user: User | null;
  deals: SavedDeal[];
  loading: boolean;
  onLogin: () => void;
  onNew: () => void;
  onOpen: (deal: SavedDeal) => void;
  onStageChange: (deal: SavedDeal, stage: EstateStage) => void;
}) {
  const [filter, setFilter] = useState<"all" | EstateStage>("all");
  const visible = filter === "all" ? deals : deals.filter((deal) => deal.stage === filter);

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">DEAL PIPELINE</span>
          <h1>Operaciones.</h1>
        </div>
        <button className="primary-button" onClick={onNew}><Plus size={16} />Nueva</button>
      </div>

      <div className="filter-strip" role="tablist">
        {FILTER_STAGES.map((item) => (
          <button
            key={item.value}
            className={filter === item.value ? "active" : ""}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            {item.value !== "all" && (
              <small>{deals.filter((deal) => deal.stage === item.value).length}</small>
            )}
          </button>
        ))}
      </div>

      {!user ? (
        <EmptyRadar label="Tu radar vive detrás del acceso." action="Entrar" onClick={onLogin} />
      ) : loading ? (
        <div className="property-grid"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : visible.length ? (
        <div className="property-grid">
          {visible.map((deal) => (
            <PropertyVisualCard
              key={deal.id}
              deal={deal}
              onOpen={() => onOpen(deal)}
              onStageChange={(stage) => onStageChange(deal, stage)}
            />
          ))}
        </div>
      ) : (
        <EmptyRadar
          label={filter === "all" ? "Todavía no hay operaciones." : "No hay operaciones aquí."}
          action="Analizar primera"
          onClick={onNew}
        />
      )}
    </section>
  );
}

type FinderFilters = {
  maxPrice: number;
  minYield: number;
  maxCapital: number;
};

function FinderRadar({
  deals,
  onSelect,
}: {
  deals: SavedDeal[];
  onSelect: (deal: SavedDeal) => void;
}) {
  return (
    <div className="finder-radar">
      <svg viewBox="0 0 420 300" role="img" aria-label="Radar abstracto de oportunidades guardadas">
        <defs>
          <radialGradient id="radarGlow">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="210" cy="150" r="132" className="radar-fill" />
        <circle cx="210" cy="150" r="44" className="radar-ring-svg" />
        <circle cx="210" cy="150" r="88" className="radar-ring-svg" />
        <circle cx="210" cy="150" r="132" className="radar-ring-svg" />
        <line x1="210" y1="18" x2="210" y2="282" className="radar-axis" />
        <line x1="78" y1="150" x2="342" y2="150" className="radar-axis" />
        <path d="M210 150 L210 18 A132 132 0 0 1 324 84 Z" className="radar-sweep-svg" />
        {deals.slice(0, 18).map((deal, index) => {
          const out = savedOutput(deal);
          const score = out?.score ?? 50;
          const angle = (index * 137.5 * Math.PI) / 180;
          const radius = 22 + (100 - score) * 1.05;
          const x = 210 + Math.cos(angle) * radius;
          const y = 150 + Math.sin(angle) * radius;
          return (
            <g key={deal.id} className="radar-point" onClick={() => onSelect(deal)}>
              <circle cx={x} cy={y} r={5 + Math.max(0, score - 50) / 16} />
              <circle cx={x} cy={y} r={13} className="radar-point-pulse" />
            </g>
          );
        })}
      </svg>
      <div className="radar-center-label">
        <span>más cerca</span>
        <strong>mejor score</strong>
      </div>
    </div>
  );
}

export function FinderView({
  deals,
  onOpen,
  onAnalyze,
}: {
  deals: SavedDeal[];
  onOpen: (deal: SavedDeal) => void;
  onAnalyze: () => void;
}) {
  const [filters, setFilters] = useState<FinderFilters>({
    maxPrice: 180000,
    minYield: 0,
    maxCapital: 100000,
  });

  const candidates = useMemo(() => deals.filter((deal) => {
    const input = savedInput(deal);
    const out = savedOutput(deal);
    if (!input || !out) return false;
    return (
      input.purchasePrice <= filters.maxPrice &&
      out.netYieldPct >= filters.minYield &&
      out.capitalRequired <= filters.maxCapital &&
      deal.stage !== "discarded" &&
      deal.stage !== "sold"
    );
  }).sort((a, b) => (savedOutput(b)?.score ?? 0) - (savedOutput(a)?.score ?? 0)), [deals, filters]);

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">DEAL FINDER</span>
          <h1>Radar de oportunidades.</h1>
        </div>
        <span className="dataset-pill"><Database size={13} />Dataset Estate</span>
      </div>

      <div className="finder-layout">
        <article className="glass-card finder-visual-card">
          {candidates.length ? (
            <FinderRadar deals={candidates} onSelect={onOpen} />
          ) : (
            <EmptyRadar label="Aún no hay señales con estos filtros." action="Añadir anuncio" onClick={onAnalyze} />
          )}
        </article>

        <aside className="glass-card finder-controls">
          <div className="card-title-row">
            <div><span className="micro-label">FILTROS</span><h3>{candidates.length} señales</h3></div>
            <SlidersHorizontal size={18} />
          </div>

          <label className="visual-slider">
            <div><span>Precio máximo</span><strong>{fmtMoney(filters.maxPrice)}</strong></div>
            <input type="range" min="30000" max="500000" step="5000" value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))} />
          </label>
          <label className="visual-slider">
            <div><span>Yield mínimo</span><strong>{fmtPct(filters.minYield)}</strong></div>
            <input type="range" min="0" max="15" step=".25" value={filters.minYield} onChange={(event) => setFilters((current) => ({ ...current, minYield: Number(event.target.value) }))} />
          </label>
          <label className="visual-slider">
            <div><span>Capital máximo</span><strong>{fmtMoney(filters.maxCapital)}</strong></div>
            <input type="range" min="10000" max="200000" step="5000" value={filters.maxCapital} onChange={(event) => setFilters((current) => ({ ...current, maxCapital: Number(event.target.value) }))} />
          </label>

          <div className="candidate-mini-list">
            {candidates.slice(0, 4).map((deal) => {
              const out = savedOutput(deal);
              return (
                <button key={deal.id} onClick={() => onOpen(deal)}>
                  <span><i className="signal-dot" />{deal.title}</span>
                  <strong>{out ? decimal.format(out.score) : "—"}</strong>
                </button>
              );
            })}
          </div>
          <p className="micro-note">Solo operaciones guardadas. Sin datos de portal inventados.</p>
        </aside>
      </div>
    </section>
  );
}

type MarketBucket = {
  municipality: string;
  count: number;
  avgPriceM2: number;
  avgYield: number;
  avgScore: number;
};

function buildMarketBuckets(deals: SavedDeal[]): MarketBucket[] {
  const grouped = new Map<string, { priceM2: number[]; yields: number[]; scores: number[] }>();
  for (const deal of deals) {
    const out = savedOutput(deal);
    if (!out) continue;
    const municipality = deal.municipality?.trim() || "Sin municipio";
    const bucket = grouped.get(municipality) ?? { priceM2: [], yields: [], scores: [] };
    if (out.pricePerM2 > 0) bucket.priceM2.push(out.pricePerM2);
    bucket.yields.push(out.netYieldPct);
    bucket.scores.push(out.score);
    grouped.set(municipality, bucket);
  }
  return [...grouped.entries()]
    .map(([municipality, values]) => ({
      municipality,
      count: values.scores.length,
      avgPriceM2: values.priceM2.length ? values.priceM2.reduce((a, b) => a + b, 0) / values.priceM2.length : 0,
      avgYield: values.yields.length ? values.yields.reduce((a, b) => a + b, 0) / values.yields.length : 0,
      avgScore: values.scores.length ? values.scores.reduce((a, b) => a + b, 0) / values.scores.length : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function MarketScatter({ deals }: { deals: SavedDeal[] }) {
  const points = deals
    .map((deal) => ({ deal, out: savedOutput(deal) }))
    .filter((item): item is { deal: SavedDeal; out: DealAnalysis } => Boolean(item.out && item.out.pricePerM2 > 0));
  const maxPrice = Math.max(...points.map((item) => item.out.pricePerM2), 1);

  return (
    <svg className="market-scatter" viewBox="0 0 620 300" role="img" aria-label="Precio por metro cuadrado frente a Deal Score">
      <line x1="44" y1="262" x2="594" y2="262" className="chart-axis" />
      <line x1="44" y1="32" x2="44" y2="262" className="chart-axis" />
      {[25, 50, 75].map((value) => (
        <line key={value} x1="44" y1={262 - value * 2.15} x2="594" y2={262 - value * 2.15} className="chart-grid" />
      ))}
      {points.map(({ deal, out }, index) => {
        const x = 44 + (out.pricePerM2 / maxPrice) * 520;
        const y = 262 - Math.min(100, out.score) * 2.15;
        const radius = 6 + Math.max(0, Math.min(10, out.netYieldPct)) * .45;
        return (
          <g className="market-point" key={deal.id}>
            <circle cx={x} cy={y} r={radius} />
            {index < 6 && <text x={x + 10} y={y - 8}>{deal.municipality?.slice(0, 10) || "?"}</text>}
          </g>
        );
      })}
      <text x="48" y="22" className="chart-caption">score ↑</text>
      <text x="520" y="288" className="chart-caption">€/m² →</text>
    </svg>
  );
}

export function MarketView({ deals, onAnalyze }: { deals: SavedDeal[]; onAnalyze: () => void }) {
  const buckets = useMemo(() => buildMarketBuckets(deals), [deals]);
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">MARKET LENS</span>
          <h1>Tu mercado, sin ruido.</h1>
        </div>
        <span className="dataset-pill"><Database size={13} />{deals.length} muestras propias</span>
      </div>

      {!deals.length ? (
        <EmptyRadar label="Aún no hay mercado propio." action="Crear muestra" onClick={onAnalyze} />
      ) : (
        <div className="market-layout">
          <article className="glass-card market-chart-card">
            <div className="card-title-row">
              <div><span className="micro-label">SEÑAL</span><h3>Precio vs. calidad</h3></div>
              <TrendingUp size={18} />
            </div>
            <MarketScatter deals={deals} />
          </article>
          <article className="glass-card municipality-card">
            <div className="card-title-row">
              <div><span className="micro-label">MUESTRAS</span><h3>Municipios</h3></div>
              <MapPin size={18} />
            </div>
            <div className="municipality-list">
              {buckets.slice(0, 7).map((bucket) => (
                <div key={bucket.municipality}>
                  <div className="municipality-row">
                    <span>{bucket.municipality}</span>
                    <strong>{fmtCompact(bucket.avgPriceM2)} €/m²</strong>
                  </div>
                  <div className="market-bar"><i style={{ width: `${(bucket.count / maxCount) * 100}%` }} /></div>
                  <small>{bucket.count} · {fmtPct(bucket.avgYield)} · score {Math.round(bucket.avgScore)}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
      <p className="data-footnote">Vista basada en tu dataset interno; no sustituye comparables externos.</p>
    </section>
  );
}

const RENOVATION_CATEGORIES = [
  { key: "cocina", label: "Cocina", defaultWeight: 30 },
  { key: "bano", label: "Baño", defaultWeight: 20 },
  { key: "acabados", label: "Acabados", defaultWeight: 20 },
  { key: "instalaciones", label: "Instalaciones", defaultWeight: 20 },
  { key: "reserva", label: "Reserva", defaultWeight: 10 },
] as const;

type RenovationMode = "diy" | "hybrid" | "pro";

export function RenovationView({
  inputs,
  updateInput,
  analysis,
}: {
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  analysis: DealAnalysis;
}) {
  const [mode, setMode] = useState<RenovationMode>("hybrid");
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(RENOVATION_CATEGORIES.map((category) => [category.key, category.defaultWeight])),
  );
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  const normalized = RENOVATION_CATEGORIES.map((category) => ({
    ...category,
    pct: (weights[category.key] / totalWeight) * 100,
  }));
  let cursor = 0;
  const stops = normalized.map((category, index) => {
    const from = cursor;
    cursor += category.pct;
    return `rgba(255,122,50,${0.98 - index * 0.14}) ${from}% ${cursor}%`;
  }).join(", ");

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">RENOVATION LAB</span>
          <h1>Reparte. Ajusta. Decide.</h1>
        </div>
        <Segmented
          value={mode}
          onChange={(value) => setMode(value as RenovationMode)}
          options={[
            { value: "diy", label: "DIY" },
            { value: "hybrid", label: "Híbrido" },
            { value: "pro", label: "PRO" },
          ]}
        />
      </div>

      <div className="renovation-layout">
        <article className="glass-card renovation-orbit-card">
          <div className="renovation-donut" style={{ background: `conic-gradient(${stops})` }}>
            <div>
              <span>Reforma</span>
              <strong>{fmtMoney(inputs.renovation)}</strong>
              <small>{mode.toUpperCase()}</small>
            </div>
          </div>
          <div className="renovation-kpis">
            <div><span>Capital total</span><strong>{fmtMoney(analysis.capitalRequired)}</strong></div>
            <div><span>Cash-flow</span><strong>{fmtMoney(analysis.netMonthlyCashFlow)}</strong></div>
          </div>
        </article>

        <article className="glass-card renovation-controls">
          <label className="renovation-total">
            <span>Presupuesto total</span>
            <div className="input-shell">
              <input type="number" min="0" step="100" value={inputs.renovation} onChange={(event) => updateInput("renovation", Number(event.target.value))} />
              <small>€</small>
            </div>
          </label>

          <div className="allocation-list">
            {normalized.map((category) => (
              <label key={category.key}>
                <div>
                  <span>{category.label}</span>
                  <strong>{fmtMoney(inputs.renovation * category.pct / 100)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={weights[category.key]}
                  onChange={(event) => setWeights((current) => ({
                    ...current,
                    [category.key]: Number(event.target.value),
                  }))}
                />
                <small>{Math.round(category.pct)}%</small>
              </label>
            ))}
          </div>
          <p className="micro-note">Reparto editable, no presupuesto de proveedor. El modo no altera costes automáticamente.</p>
        </article>
      </div>
    </section>
  );
}

function portfolioMetrics(deals: SavedDeal[]) {
  const active = deals.filter((deal) => deal.stage === "purchased" || deal.stage === "managed");
  let value = 0;
  let debt = 0;
  let cashFlow = 0;
  let invested = 0;
  let scoreTotal = 0;
  let scored = 0;

  for (const deal of active) {
    const input = savedInput(deal);
    const out = savedOutput(deal);
    if (!input || !out) continue;
    value += input.marketValueEstimate && input.marketValueEstimate > 0
      ? input.marketValueEstimate
      : input.purchasePrice;
    debt += out.loanAmount;
    cashFlow += out.netMonthlyCashFlow;
    invested += out.capitalRequired;
    scoreTotal += out.score;
    scored += 1;
  }

  return {
    active,
    value,
    debt,
    equity: Math.max(0, value - debt),
    cashFlow,
    invested,
    avgScore: scored ? scoreTotal / scored : 0,
  };
}

export function PortfolioView({
  deals,
  onOperations,
}: {
  deals: SavedDeal[];
  onOperations: () => void;
}) {
  const metrics = useMemo(() => portfolioMetrics(deals), [deals]);
  const debtPct = metrics.value > 0 ? Math.min(100, metrics.debt / metrics.value * 100) : 0;

  return (
    <section className="view enter-view">
      <div className="hero compact-hero">
        <div>
          <span className="eyebrow">PORTFOLIO</span>
          <h1>Patrimonio en movimiento.</h1>
        </div>
        {metrics.active.length > 0 && <span className="dataset-pill"><Wallet size={13} />{metrics.active.length} activos</span>}
      </div>

      {!metrics.active.length ? (
        <EmptyRadar label="Aún no hay activos en cartera." action="Ir a operaciones" onClick={onOperations} />
      ) : (
        <>
          <div className="portfolio-hero-grid">
            <article className="glass-card equity-card">
              <div
                className="equity-orbit"
                style={{ "--debt": `${debtPct * 3.6}deg` } as CSSProperties}
              >
                <div>
                  <span>Equity</span>
                  <strong>{fmtMoney(metrics.equity)}</strong>
                </div>
              </div>
              <div className="equity-legend">
                <span><i className="equity-dot" />Valor {fmtMoney(metrics.value)}</span>
                <span><i className="debt-dot" />Deuda {fmtMoney(metrics.debt)}</span>
              </div>
            </article>
            <div className="portfolio-metrics">
              <MetricTile label="Cash-flow" value={`${fmtMoney(metrics.cashFlow)}/mes`} positive={metrics.cashFlow >= 0} />
              <MetricTile label="Capital" value={fmtMoney(metrics.invested)} />
              <MetricTile label="Score medio" value={decimal.format(metrics.avgScore)} />
            </div>
          </div>

          <div className="portfolio-assets">
            {metrics.active.map((deal) => (
              <PropertyVisualCard key={deal.id} deal={deal} onOpen={onOperations} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SkeletonBars() {
  return (
    <div className="skeleton-bars">
      <i /><i /><i /><i /><i />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="property-card skeleton-card">
      <i /><div><i /><i /><i /></div>
    </div>
  );
}

export function AuthModal({
  email,
  password,
  busy,
  message,
  setEmail,
  setPassword,
  onClose,
  onSignIn,
  onSignUp,
}: {
  email: string;
  password: string;
  busy: boolean;
  message: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onClose: () => void;
  onSignIn: (event: FormEvent) => void;
  onSignUp: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Acceso a Estate" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div className="modal-icon"><LockKeyhole size={21} /></div>
        <h2>Estate privado.</h2>
        <p>Entra para guardar tu dataset.</p>
        <form onSubmit={onSignIn} className="auth-form">
          <label>Correo<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Contraseña<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-button full" type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}Entrar
          </button>
          <button className="secondary-button full" type="button" disabled={busy} onClick={onSignUp}>Crear acceso</button>
        </form>
      </div>
    </div>
  );
}
