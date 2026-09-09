"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Gauge,
  Home,
  Landmark,
  Layers3,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Radar,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { analyzeDeal, type DealInputs } from "@/lib/estate-engine";
import {
  loadSavedDeals,
  saveDeal,
  type PropertyDraft,
  type SavedDeal,
} from "@/lib/estate-store";
import { supabase } from "@/lib/supabase";

type View = "dashboard" | "analyze" | "watchlist";

const DEFAULT_INPUTS: DealInputs = {
  purchasePrice: 72000,
  marketValueEstimate: 68500,
  monthlyRent: 680,
  builtAreaM2: 78,
  purchaseTaxPct: 10,
  ltvPct: 80,
  interestPct: 3.25,
  termYears: 30,
  notaryRegistry: 1100,
  appraisal: 350,
  financingFees: 250,
  renovation: 4200,
  furniture: 1200,
  reserve: 2500,
  communityMonthly: 45,
  ibiAnnual: 320,
  insuranceAnnual: 240,
  maintenanceMonthly: 35,
  managementPct: 0,
  vacancyPct: 5,
  otherMonthly: 0,
  monthlySavings: 1200,
  nextCapitalTarget: 20000,
  recoverableCapital: 0,
  targetNetYieldPct: 8,
  daysOnMarket: 180,
  priceDrops: 2,
  dataConfidence: 0.72,
};

const DEFAULT_DRAFT: PropertyDraft = {
  title: "Piso 3 hab. · Villena",
  municipality: "Villena",
  province: "Alicante",
  address: "",
  listingUrl: "",
  portal: "manual",
  bedrooms: 3,
  bathrooms: 1,
  floorLabel: "1ª",
  hasElevator: false,
  condition: "light_renovation",
};

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

function fmtMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? currency.format(value) : "—";
}

function fmtPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${decimal.format(value)}%` : "—";
}

function latestAnalysis(deal: SavedDeal) {
  return deal.estate_deal_analyses?.[0];
}

export default function EstatePage() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputs, setInputs] = useState<DealInputs>(DEFAULT_INPUTS);
  const [draft, setDraft] = useState<PropertyDraft>(DEFAULT_DRAFT);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const analysis = useMemo(() => analyzeDeal(inputs), [inputs]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedDeals([]);
      return;
    }
    void refreshDeals(user);
  }, [user]);

  async function refreshDeals(activeUser = user) {
    if (!activeUser) return;
    setLoadingDeals(true);
    try {
      setSavedDeals(await loadSavedDeals(activeUser));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudieron cargar las operaciones.");
    } finally {
      setLoadingDeals(false);
    }
  }

  function updateInput<K extends keyof DealInputs>(key: K, value: DealInputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImportBusy(true);
    setImportMessage("");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = (await response.json()) as {
        error?: string;
        url?: string;
        portal?: string;
        extraction?: { reason?: string };
      };
      if (!response.ok) throw new Error(data.error || "No se pudo leer la URL.");
      setDraft((current) => ({
        ...current,
        listingUrl: data.url ?? importUrl,
        portal: data.portal ?? "other",
      }));
      setImportMessage(
        `${(data.portal ?? "fuente").toUpperCase()} detectado. ${data.extraction?.reason ?? "Completa los datos de la operación."}`,
      );
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo procesar la URL.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleSave() {
    if (!user) {
      setAuthOpen(true);
      setStatusMessage("Inicia sesión para guardar y versionar esta operación.");
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      await saveDeal(user, draft, inputs, analysis);
      setStatusMessage("Operación guardada con inputs, resultados, stress test y trazabilidad.");
      await refreshDeals(user);
      setView("watchlist");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la operación.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;
      setAuthOpen(false);
      setAuthPassword("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignUp() {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;
      setAuthMessage(
        data.session
          ? "Cuenta creada y sesión iniciada."
          : "Cuenta creada. Revisa el correo si Supabase exige confirmación antes de iniciar sesión.",
      );
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setStatusMessage("Sesión cerrada.");
  }

  return (
    <div className="estate-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Building2 size={18} /></div>
          <div>
            <div className="brand-name">ESTATE</div>
            <div className="brand-sub">by Firekworks</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          <NavButton active={view === "dashboard"} icon={<Home size={17} />} label="Dashboard" onClick={() => selectView("dashboard")} />
          <NavButton active={view === "analyze"} icon={<Calculator size={17} />} label="Analizar operación" onClick={() => selectView("analyze")} />
          <NavButton active={view === "watchlist"} icon={<Radar size={17} />} label="Operaciones" count={savedDeals.length || undefined} onClick={() => selectView("watchlist")} />
        </nav>

        <div className="sidebar-section-label">SIGUIENTES MÓDULOS</div>
        <nav className="sidebar-nav muted-nav">
          <div className="nav-item disabled"><Search size={17} /><span>Deal Finder</span><span className="soon">V2</span></div>
          <div className="nav-item disabled"><MapPin size={17} /><span>Mercado</span><span className="soon">V2</span></div>
          <div className="nav-item disabled"><Layers3 size={17} /><span>Reformas</span><span className="soon">V3</span></div>
          <div className="nav-item disabled"><Wallet size={17} /><span>Portfolio</span><span className="soon">V5</span></div>
        </nav>

        <div className="sidebar-spacer" />
        <div className="system-card">
          <div className="system-card-head"><Database size={15} /><span>Sistema V1</span></div>
          <div className="system-line"><span>Motor financiero</span><strong>Activo</strong></div>
          <div className="system-line"><span>Supabase RLS</span><strong>Activo</strong></div>
          <div className="system-line"><span>Scraping</span><strong className="neutral">No usado</strong></div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={19} /></button>
            <div className="breadcrumb"><span>Estate</span><ChevronRight size={14} /><strong>{viewLabel(view)}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="engine-pill"><Activity size={14} /> Motor v1.0</span>
            {authReady && user ? (
              <button className="ghost-button" onClick={handleSignOut}><LogOut size={15} /><span className="desktop-only">Salir</span></button>
            ) : (
              <button className="ghost-button" onClick={() => setAuthOpen(true)}><LogIn size={15} />Iniciar sesión</button>
            )}
            <button className="primary-button compact" onClick={() => setView("analyze")}><Plus size={16} />Nueva operación</button>
          </div>
        </header>

        <main className="content">
          {statusMessage && (
            <div className="status-banner"><CheckCircle2 size={16} /><span>{statusMessage}</span><button onClick={() => setStatusMessage("")} aria-label="Cerrar"><X size={15} /></button></div>
          )}

          {view === "dashboard" && (
            <Dashboard
              analysis={analysis}
              inputs={inputs}
              draft={draft}
              savedDeals={savedDeals}
              loadingDeals={loadingDeals}
              user={user}
              onAnalyze={() => setView("analyze")}
              onWatchlist={() => setView("watchlist")}
            />
          )}

          {view === "analyze" && (
            <Analyzer
              draft={draft}
              setDraft={setDraft}
              inputs={inputs}
              updateInput={updateInput}
              analysis={analysis}
              importUrl={importUrl}
              setImportUrl={setImportUrl}
              importBusy={importBusy}
              importMessage={importMessage}
              handleImport={handleImport}
              handleSave={handleSave}
              saving={saving}
              signedIn={Boolean(user)}
            />
          )}

          {view === "watchlist" && (
            <Watchlist
              user={user}
              deals={savedDeals}
              loading={loadingDeals}
              onLogin={() => setAuthOpen(true)}
              onAnalyze={() => setView("analyze")}
            />
          )}
        </main>
      </div>

      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}

      {authOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}>
          <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Acceso a Estate" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" onClick={() => setAuthOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            <div className="modal-icon"><LockKeyhole size={22} /></div>
            <h2>Acceso interno</h2>
            <p>El cálculo funciona sin cuenta. Inicia sesión para guardar operaciones en Supabase con RLS y mantener su histórico.</p>
            <form onSubmit={handleSignIn} className="auth-form">
              <label>Correo<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="tu@email.com" /></label>
              <label>Contraseña<input type="password" required minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="••••••••" /></label>
              {authMessage && <div className="form-message">{authMessage}</div>}
              <button className="primary-button full" type="submit" disabled={authBusy}>{authBusy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}Entrar</button>
              <button className="secondary-button full" type="button" disabled={authBusy} onClick={handleSignUp}>Crear cuenta interna</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function selectView(next: View) {
    setView(next);
    setSidebarOpen(false);
  }
}

function Dashboard({
  analysis,
  inputs,
  draft,
  savedDeals,
  loadingDeals,
  user,
  onAnalyze,
  onWatchlist,
}: {
  analysis: ReturnType<typeof analyzeDeal>;
  inputs: DealInputs;
  draft: PropertyDraft;
  savedDeals: SavedDeal[];
  loadingDeals: boolean;
  user: User | null;
  onAnalyze: () => void;
  onWatchlist: () => void;
}) {
  const stressLabel = analysis.stressStatus === "green" ? "Resistente" : analysis.stressStatus === "orange" ? "Condicional" : "Frágil";
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">REAL ESTATE INTELLIGENCE OS</span>
          <h1>Decide con números, no con intuición.</h1>
          <p>Estate separa hechos, estimaciones y supuestos para mostrar cuánto capital exige una operación, qué deja al mes y qué ocurre cuando las cosas salen peor de lo previsto.</p>
        </div>
        <button className="primary-button" onClick={onAnalyze}><Calculator size={17} />Analizar operación</button>
      </section>

      <section className="metric-grid">
        <MetricCard icon={<Wallet size={18} />} label="Capital requerido" value={fmtMoney(analysis.capitalRequired)} detail={`${decimal.format(inputs.ltvPct)}% LTV · incluye colchón`} />
        <MetricCard icon={<CircleDollarSign size={18} />} label="Cash-flow neto" value={`${fmtMoney(analysis.netMonthlyCashFlow)}/mes`} detail={`${fmtPct(analysis.cashOnCashPct)} cash-on-cash`} tone={analysis.netMonthlyCashFlow >= 0 ? "positive" : "negative"} />
        <MetricCard icon={<TrendingUp size={18} />} label="Rentabilidad neta" value={fmtPct(analysis.netYieldPct)} detail={`Objetivo ${fmtPct(inputs.targetNetYieldPct)}`} tone={analysis.netYieldPct >= inputs.targetNetYieldPct ? "positive" : "warning"} />
        <MetricCard icon={<Zap size={18} />} label="Capital velocity" value={analysis.capitalVelocityMonths === null ? "—" : `${decimal.format(analysis.capitalVelocityMonths)} meses`} detail={`Siguiente objetivo ${fmtMoney(inputs.nextCapitalTarget)}`} />
      </section>

      <section className="dashboard-grid">
        <div className="panel deal-verdict-panel">
          <div className="panel-head">
            <div><span className="panel-kicker">OPERACIÓN ACTUAL</span><h2>{draft.title || "Operación sin nombre"}</h2></div>
            <div className={`stress-badge ${analysis.stressStatus}`}><ShieldCheck size={14} />{stressLabel}</div>
          </div>
          <div className="verdict-layout">
            <div className="score-ring" style={{ "--score-angle": `${analysis.score * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{decimal.format(analysis.score)}</strong><span>/100</span></div>
            </div>
            <div className="verdict-copy">
              <span className="verdict-label">VEREDICTO</span>
              <div className="verdict-title">{analysis.verdict}</div>
              <p>Confianza efectiva del score: <strong>{Math.round(analysis.scoreCoverage * 100)}%</strong>. El score se pondera por la confianza de cada dato, por lo que no premia información que aún no existe.</p>
              <div className="mini-tags">
                <span><MapPin size={13} />{draft.municipality || "Sin ubicación"}</span>
                <span><Building2 size={13} />{decimal.format(inputs.builtAreaM2)} m²</span>
                <span><Landmark size={13} />{fmtMoney(inputs.purchasePrice)}</span>
              </div>
            </div>
          </div>
          <div className="two-column-list">
            <div>
              <div className="list-title positive-text">Puntos fuertes</div>
              {analysis.strengths.length ? analysis.strengths.map((item) => <div className="finding" key={item}><CheckCircle2 size={14} />{item}</div>) : <div className="finding muted">Aún no hay una fortaleza suficientemente sustentada.</div>}
            </div>
            <div>
              <div className="list-title warning-text">A vigilar</div>
              {analysis.weaknesses.length ? analysis.weaknesses.map((item) => <div className="finding" key={item}><AlertTriangle size={14} />{item}</div>) : <div className="finding muted">Sin alertas financieras principales en los datos actuales.</div>}
            </div>
          </div>
        </div>

        <div className="panel ceiling-panel">
          <div className="panel-head"><div><span className="panel-kicker">DISCIPLINA DE COMPRA</span><h2>Precio máximo</h2></div><Target size={20} /></div>
          <div className="ceiling-number">{fmtMoney(analysis.maxPurchasePrice)}</div>
          <p>Máximo compatible con el <strong>{fmtPct(inputs.targetNetYieldPct)}</strong> neto objetivo usando el NOI y costes introducidos.</p>
          <div className="divider" />
          <div className="ceiling-row"><span>Precio anunciado</span><strong>{fmtMoney(inputs.purchasePrice)}</strong></div>
          <div className="ceiling-row"><span>Oferta inicial orientativa</span><strong className="accent-text">{fmtMoney(analysis.recommendedOpeningOffer)}</strong></div>
          <div className="ceiling-row"><span>Valor mercado introducido</span><strong>{fmtMoney(inputs.marketValueEstimate)}</strong></div>
          <div className="callout"><AlertTriangle size={15} /><span>La oferta no infiere urgencia real del vendedor. Usa días en mercado y bajadas solo como señal, nunca como hecho.</span></div>
        </div>
      </section>

      <section className="dashboard-grid lower-grid">
        <div className="panel">
          <div className="panel-head"><div><span className="panel-kicker">STRESS TEST</span><h2>Intentar romper la operación</h2></div><Gauge size={20} /></div>
          <div className="stress-table">
            <div className="stress-row stress-header"><span>Escenario</span><span>Cash-flow</span><span>CoC</span><span>Estado</span></div>
            {analysis.stress.map((scenario) => (
              <div className="stress-row" key={scenario.key}>
                <span>{scenario.label}</span>
                <strong className={scenario.monthlyCashFlow >= 0 ? "positive-text" : "negative-text"}>{fmtMoney(scenario.monthlyCashFlow)}</strong>
                <span>{fmtPct(scenario.cashOnCashPct)}</span>
                <span className={`scenario-state ${scenario.passes ? "pass" : "fail"}`}>{scenario.passes ? "Pasa" : "Falla"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><span className="panel-kicker">WATCHLIST</span><h2>Operaciones guardadas</h2></div><button className="text-button" onClick={onWatchlist}>Ver todas <ChevronRight size={14} /></button></div>
          {!user ? (
            <div className="empty-compact"><LockKeyhole size={22} /><p>Inicia sesión para sincronizar operaciones con Supabase.</p></div>
          ) : loadingDeals ? (
            <div className="loading-line"><Loader2 size={18} className="spin" />Cargando operaciones…</div>
          ) : savedDeals.length === 0 ? (
            <div className="empty-compact"><Radar size={22} /><p>Todavía no has guardado ninguna operación.</p></div>
          ) : (
            <div className="saved-mini-list">
              {savedDeals.slice(0, 4).map((deal) => {
                const latest = latestAnalysis(deal);
                return (
                  <div className="saved-mini" key={deal.id}>
                    <div><strong>{deal.title}</strong><span>{deal.municipality || "Sin ubicación"}</span></div>
                    <div className="saved-mini-score"><strong>{latest?.score ? decimal.format(latest.score) : "—"}</strong><span>{latest?.verdict || deal.stage}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Analyzer({
  draft,
  setDraft,
  inputs,
  updateInput,
  analysis,
  importUrl,
  setImportUrl,
  importBusy,
  importMessage,
  handleImport,
  handleSave,
  saving,
  signedIn,
}: {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  analysis: ReturnType<typeof analyzeDeal>;
  importUrl: string;
  setImportUrl: (value: string) => void;
  importBusy: boolean;
  importMessage: string;
  handleImport: () => void;
  handleSave: () => void;
  saving: boolean;
  signedIn: boolean;
}) {
  return (
    <>
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">DEAL ANALYZER V1</span><h1>Analiza una operación completa.</h1><p>Todos los números se recalculan al instante. Los campos de mercado que todavía no estén verificados deben reducirse en confianza, no rellenarse con falsa precisión.</p></div>
        <button className="primary-button" onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}{signedIn ? "Guardar análisis" : "Entrar para guardar"}</button>
      </section>

      <div className="import-bar">
        <div className="import-icon"><Search size={18} /></div>
        <input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="Pega URL de Idealista, Fotocasa, Habitaclia, servicer…" onKeyDown={(event) => { if (event.key === "Enter") void handleImport(); }} />
        <button className="secondary-button" onClick={handleImport} disabled={importBusy || !importUrl.trim()}>{importBusy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}Identificar</button>
      </div>
      {importMessage && <div className="import-message"><ShieldCheck size={14} />{importMessage}</div>}

      <section className="analyzer-layout">
        <div className="input-stack">
          <InputSection title="Inmueble" icon={<Building2 size={17} />}>
            <div className="form-grid two">
              <TextField label="Nombre de la operación" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <TextField label="Municipio" value={draft.municipality} onChange={(value) => setDraft((current) => ({ ...current, municipality: value }))} />
              <TextField label="Provincia" value={draft.province} onChange={(value) => setDraft((current) => ({ ...current, province: value }))} />
              <TextField label="Dirección / referencia" value={draft.address ?? ""} onChange={(value) => setDraft((current) => ({ ...current, address: value }))} placeholder="Opcional" />
              <NumberField label="Superficie construida" value={inputs.builtAreaM2} suffix="m²" onChange={(value) => updateInput("builtAreaM2", value)} />
              <NumberField label="Dormitorios" value={draft.bedrooms ?? 0} step={1} onChange={(value) => setDraft((current) => ({ ...current, bedrooms: Math.round(value) }))} />
            </div>
          </InputSection>

          <InputSection title="Compra y mercado" icon={<Landmark size={17} />}>
            <div className="form-grid two">
              <NumberField label="Precio de compra" value={inputs.purchasePrice} suffix="€" onChange={(value) => updateInput("purchasePrice", value)} />
              <NumberField label="Valor de mercado estimado" value={inputs.marketValueEstimate ?? 0} suffix="€" onChange={(value) => updateInput("marketValueEstimate", value || undefined)} hint="Si no está contrastado, baja la confianza." />
              <NumberField label="Alquiler mensual estimado" value={inputs.monthlyRent} suffix="€/mes" onChange={(value) => updateInput("monthlyRent", value)} />
              <NumberField label="ITP / impuesto compra" value={inputs.purchaseTaxPct} suffix="%" step={0.1} onChange={(value) => updateInput("purchaseTaxPct", value)} hint="Configurable. 10% es solo el supuesto inicial del ejemplo valenciano; verifica el tipo real." />
              <NumberField label="Días en mercado" value={inputs.daysOnMarket ?? 0} suffix="días" step={1} onChange={(value) => updateInput("daysOnMarket", Math.round(value))} />
              <NumberField label="Bajadas de precio" value={inputs.priceDrops ?? 0} step={1} onChange={(value) => updateInput("priceDrops", Math.round(value))} />
            </div>
          </InputSection>

          <InputSection title="Financiación" icon={<Wallet size={17} />}>
            <div className="form-grid two">
              <NumberField label="LTV financiado" value={inputs.ltvPct} suffix="%" step={1} onChange={(value) => updateInput("ltvPct", value)} />
              <NumberField label="Interés anual" value={inputs.interestPct} suffix="%" step={0.05} onChange={(value) => updateInput("interestPct", value)} />
              <NumberField label="Plazo" value={inputs.termYears} suffix="años" step={1} onChange={(value) => updateInput("termYears", value)} />
              <NumberField label="Tasación" value={inputs.appraisal} suffix="€" onChange={(value) => updateInput("appraisal", value)} />
              <NumberField label="Notaría + registro" value={inputs.notaryRegistry} suffix="€" onChange={(value) => updateInput("notaryRegistry", value)} />
              <NumberField label="Otros costes financiación" value={inputs.financingFees} suffix="€" onChange={(value) => updateInput("financingFees", value)} />
            </div>
          </InputSection>

          <InputSection title="Reforma y capital" icon={<SlidersHorizontal size={17} />}>
            <div className="form-grid two">
              <NumberField label="Reforma prevista" value={inputs.renovation} suffix="€" onChange={(value) => updateInput("renovation", value)} hint="V1 admite importe agregado. V2/V3 lo divide PRO / DIY / híbrido por partidas." />
              <NumberField label="Mobiliario" value={inputs.furniture} suffix="€" onChange={(value) => updateInput("furniture", value)} />
              <NumberField label="Colchón inicial" value={inputs.reserve} suffix="€" onChange={(value) => updateInput("reserve", value)} />
              <NumberField label="Ahorro externo mensual" value={inputs.monthlySavings} suffix="€/mes" onChange={(value) => updateInput("monthlySavings", value)} />
              <NumberField label="Capital objetivo siguiente compra" value={inputs.nextCapitalTarget} suffix="€" onChange={(value) => updateInput("nextCapitalTarget", value)} />
              <NumberField label="Capital recuperable" value={inputs.recoverableCapital} suffix="€" onChange={(value) => updateInput("recoverableCapital", value)} />
            </div>
          </InputSection>

          <InputSection title="Gastos de explotación" icon={<CircleDollarSign size={17} />}>
            <div className="form-grid two">
              <NumberField label="Comunidad" value={inputs.communityMonthly} suffix="€/mes" onChange={(value) => updateInput("communityMonthly", value)} />
              <NumberField label="IBI" value={inputs.ibiAnnual} suffix="€/año" onChange={(value) => updateInput("ibiAnnual", value)} />
              <NumberField label="Seguro" value={inputs.insuranceAnnual} suffix="€/año" onChange={(value) => updateInput("insuranceAnnual", value)} />
              <NumberField label="Mantenimiento reservado" value={inputs.maintenanceMonthly} suffix="€/mes" onChange={(value) => updateInput("maintenanceMonthly", value)} />
              <NumberField label="Gestión" value={inputs.managementPct} suffix="% renta" step={0.5} onChange={(value) => updateInput("managementPct", value)} />
              <NumberField label="Vacancia" value={inputs.vacancyPct} suffix="%" step={0.5} onChange={(value) => updateInput("vacancyPct", value)} />
              <NumberField label="Otros gastos" value={inputs.otherMonthly} suffix="€/mes" onChange={(value) => updateInput("otherMonthly", value)} />
              <NumberField label="Rentabilidad neta objetivo" value={inputs.targetNetYieldPct} suffix="%" step={0.25} onChange={(value) => updateInput("targetNetYieldPct", value)} />
            </div>
          </InputSection>

          <InputSection title="Confianza de datos" icon={<ShieldCheck size={17} />}>
            <div className="confidence-control">
              <input type="range" min="10" max="100" step="1" value={Math.round(inputs.dataConfidence * 100)} onChange={(event) => updateInput("dataConfidence", Number(event.target.value) / 100)} />
              <strong>{Math.round(inputs.dataConfidence * 100)}%</strong>
            </div>
            <p className="helper-copy">No es una nota estética: reduce el peso de alquiler, valoración y otros inputs todavía no verificados en el Deal Score.</p>
          </InputSection>
        </div>

        <div className="analysis-stack">
          <div className="sticky-analysis">
            <div className={`verdict-card ${analysis.stressStatus}`}>
              <div>
                <span>DEAL SCORE · {Math.round(analysis.scoreCoverage * 100)}% confianza efectiva</span>
                <strong>{decimal.format(analysis.score)}<small>/100</small></strong>
              </div>
              <div className="verdict-card-right"><span>VEREDICTO</span><strong>{analysis.verdict}</strong></div>
            </div>

            <div className="result-grid">
              <ResultTile label="Capital requerido" value={fmtMoney(analysis.capitalRequired)} sub={`Entrada ${fmtMoney(analysis.downPayment)}`} />
              <ResultTile label="Hipoteca" value={`${fmtMoney(analysis.mortgageMonthly)}/mes`} sub={`Deuda ${fmtMoney(analysis.loanAmount)}`} />
              <ResultTile label="Cash-flow neto" value={`${fmtMoney(analysis.netMonthlyCashFlow)}/mes`} sub={`NOI ${fmtMoney(analysis.noiMonthly)}/mes`} tone={analysis.netMonthlyCashFlow >= 0 ? "positive" : "negative"} />
              <ResultTile label="Cash-on-cash" value={fmtPct(analysis.cashOnCashPct)} sub={`Neta ${fmtPct(analysis.netYieldPct)}`} />
              <ResultTile label="DSCR" value={analysis.dscr === null ? "Sin deuda" : `${decimal.format(analysis.dscr)}×`} sub="Cobertura deuda" />
              <ResultTile label="Capital velocity" value={analysis.capitalVelocityMonths === null ? "—" : `${decimal.format(analysis.capitalVelocityMonths)} meses`} sub="Hasta siguiente objetivo" />
            </div>

            <div className="panel result-panel">
              <div className="panel-head"><div><span className="panel-kicker">MAXIMUM PURCHASE PRICE</span><h2>Disciplina de compra</h2></div><Target size={19} /></div>
              <div className="decision-price"><span>No pagar más de</span><strong>{fmtMoney(analysis.maxPurchasePrice)}</strong></div>
              <div className="decision-price secondary"><span>Oferta inicial orientativa</span><strong>{fmtMoney(analysis.recommendedOpeningOffer)}</strong></div>
              <p className="helper-copy">El máximo se deriva del NOI y de tu rentabilidad neta objetivo. La oferta inicial añade solo señales observables de negociación.</p>
            </div>

            <div className="panel result-panel">
              <div className="panel-head"><div><span className="panel-kicker">SCORE EXPLICABLE</span><h2>Por qué puntúa así</h2></div><BarChart3 size={19} /></div>
              <div className="score-list">
                {analysis.scoreComponents.map((component) => (
                  <div className="score-item" key={component.key}>
                    <div className="score-item-top"><span>{component.label}</span><strong>{decimal.format(component.score)}</strong></div>
                    <div className="score-track"><span style={{ width: `${component.score}%` }} /></div>
                    <p>{component.reason} <em>Conf. {Math.round(component.confidence * 100)}%</em></p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel result-panel">
              <div className="panel-head"><div><span className="panel-kicker">STRESS ENGINE</span><h2>Qué pasa si sale peor</h2></div><Gauge size={19} /></div>
              <div className="stress-table compact-stress">
                {analysis.stress.map((scenario) => (
                  <div className="stress-row" key={scenario.key}>
                    <span>{scenario.label}</span><strong>{fmtMoney(scenario.monthlyCashFlow)}</strong><span className={`scenario-state ${scenario.passes ? "pass" : "fail"}`}>{scenario.passes ? "Pasa" : "Falla"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Watchlist({ user, deals, loading, onLogin, onAnalyze }: { user: User | null; deals: SavedDeal[]; loading: boolean; onLogin: () => void; onAnalyze: () => void }) {
  return (
    <>
      <section className="page-heading compact-heading">
        <div><span className="eyebrow">DEAL PIPELINE</span><h1>Operaciones guardadas.</h1><p>Cada guardado mantiene el snapshot de inputs, outputs, versión del motor, confidence y stress test para poder comparar después predicción vs. realidad.</p></div>
        <button className="primary-button" onClick={onAnalyze}><Plus size={16} />Nueva operación</button>
      </section>
      {!user ? (
        <div className="panel empty-state"><LockKeyhole size={30} /><h2>La watchlist está protegida</h2><p>Los datos `estate_*` no son accesibles con la clave pública sin una sesión autenticada.</p><button className="primary-button" onClick={onLogin}><LogIn size={16} />Iniciar sesión</button></div>
      ) : loading ? (
        <div className="panel empty-state"><Loader2 size={28} className="spin" /><p>Cargando operaciones…</p></div>
      ) : deals.length === 0 ? (
        <div className="panel empty-state"><Radar size={30} /><h2>Aún no hay operaciones</h2><p>Analiza la primera vivienda y guárdala para empezar a construir el dataset propio de Estate.</p><button className="primary-button" onClick={onAnalyze}><Calculator size={16} />Analizar primera operación</button></div>
      ) : (
        <div className="deal-table panel">
          <div className="deal-table-head"><span>Operación</span><span>Precio</span><span>Score</span><span>Veredicto</span><span>Estado</span></div>
          {deals.map((deal) => {
            const listing = deal.estate_listings?.[0];
            const latest = latestAnalysis(deal);
            return (
              <div className="deal-table-row" key={deal.id}>
                <div className="deal-name"><div className="deal-avatar"><Building2 size={17} /></div><div><strong>{deal.title}</strong><span>{[deal.municipality, deal.province].filter(Boolean).join(", ") || "Sin ubicación"} · {deal.built_area_m2 ? `${decimal.format(deal.built_area_m2)} m²` : "m² pendiente"}</span></div></div>
                <strong>{listing ? fmtMoney(listing.asking_price) : "—"}</strong>
                <strong className="score-number">{latest?.score ? decimal.format(latest.score) : "—"}</strong>
                <span className="table-pill">{latest?.verdict ?? "analyze"}</span>
                <span className="stage-label">{deal.stage}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}</button>;
}

function MetricCard({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "neutral" | "positive" | "negative" | "warning" }) {
  return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}

function ResultTile({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub: string; tone?: "neutral" | "positive" | "negative" }) {
  return <div className={`result-tile ${tone}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}

function InputSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel input-section"><div className="input-section-title">{icon}<h2>{title}</h2></div>{children}</section>;
}

function NumberField({ label, value, suffix, step = 10, hint, onChange }: { label: string; value: number; suffix?: string; step?: number; hint?: string; onChange: (value: number) => void }) {
  return (
    <label className="field"><span>{label}</span><div className="number-input"><input type="number" inputMode="decimal" value={Number.isFinite(value) ? value : 0} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} />{suffix && <small>{suffix}</small>}</div>{hint && <em>{hint}</em>}</label>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function viewLabel(view: View) {
  if (view === "dashboard") return "Dashboard";
  if (view === "analyze") return "Analizar operación";
  return "Operaciones";
}
