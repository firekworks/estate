"use client";

import type { User } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LockKeyhole, LogIn, X } from "lucide-react";
import { analyzeDeal, type DealInputs } from "@/lib/estate-engine";
import type { ResearchCandidate } from "@/lib/estate-research";
import {
  loadSavedDeals,
  saveDeal,
  updateDealStage,
  type EstateStage,
  type PropertyDraft,
  type SavedDeal,
} from "@/lib/estate-store";
import { supabase } from "@/lib/supabase";
import { EstateSidebar, EstateTopbar, type View } from "@/components/estate-shell";
import { HomeView } from "@/components/estate-home";
import { ExploreView, MarketView } from "@/components/estate-discovery";
import { OpportunitiesView } from "@/components/estate-opportunities";
import { PortfolioView } from "@/components/estate-portfolio";
import { AnalyzerView } from "@/components/estate-analyzer";
import { PropertyWorkspace } from "@/components/estate-property";

const BASE_INPUTS: DealInputs = {
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
  dataConfidence: 0.5,
};

const EMPTY_DRAFT: PropertyDraft = {
  title: "",
  municipality: "",
  province: "Alicante",
  address: "",
  listingUrl: "",
  portal: "manual",
  bedrooms: undefined,
  bathrooms: undefined,
  floorLabel: "",
  hasElevator: undefined,
  condition: "unknown",
  features: { rentalStrategy: "long_term", evidence: {} },
};

function draftFromDeal(deal: SavedDeal): PropertyDraft {
  const listing = deal.estate_listings?.[0];
  return {
    title: deal.title,
    municipality: deal.municipality ?? "",
    province: deal.province ?? "Alicante",
    address: deal.address ?? "",
    listingUrl: listing?.url ?? "",
    portal: listing?.portal ?? "manual",
    bedrooms: deal.bedrooms ?? undefined,
    bathrooms: deal.bathrooms ?? undefined,
    floorLabel: deal.floor_label ?? "",
    builtAreaM2: deal.built_area_m2 ?? undefined,
    usableAreaM2: deal.usable_area_m2 ?? undefined,
    hasElevator: deal.has_elevator ?? undefined,
    hasTerrace: deal.has_terrace ?? undefined,
    hasBalcony: deal.has_balcony ?? undefined,
    hasGarage: deal.has_garage ?? undefined,
    hasStorage: deal.has_storage ?? undefined,
    hasPool: deal.has_pool ?? undefined,
    orientation: deal.orientation ?? undefined,
    yearBuilt: deal.year_built ?? undefined,
    energyRating: deal.energy_rating ?? undefined,
    latitude: deal.latitude ?? undefined,
    longitude: deal.longitude ?? undefined,
    features: deal.features ?? {},
    notes: deal.notes ?? undefined,
    condition: deal.condition ?? "unknown",
  };
}

function inputFromDeal(deal: SavedDeal): DealInputs {
  const input = deal.estate_deal_analyses?.[0]?.inputs;
  return input ? { ...BASE_INPUTS, ...input } : { ...BASE_INPUTS, builtAreaM2: deal.built_area_m2 ?? 0 };
}

function normalizeCondition(value: unknown): PropertyDraft["condition"] {
  if (typeof value !== "string") return "unknown";
  const direct = ["new", "renovated", "good", "dated", "light_renovation", "medium_renovation", "full_renovation", "unknown"] as const;
  if ((direct as readonly string[]).includes(value)) return value as PropertyDraft["condition"];
  const normalized = value.toLowerCase();
  if (normalized.includes("reformar") || normalized.includes("integral")) return "full_renovation";
  if (normalized.includes("reformado") || normalized.includes("renovado")) return "renovated";
  if (normalized.includes("buen") || normalized.includes("good")) return "good";
  if (normalized.includes("antigu") || normalized.includes("dated")) return "dated";
  return "unknown";
}

const STAGE_ORDER: EstateStage[] = ["watchlist", "analyzing", "visit", "negotiating", "purchased", "managed", "sold"];

type ImportedListing = {
  title: string | null;
  municipality: string | null;
  province: string | null;
  address: string | null;
  asking_price: number | null;
  built_area_m2: number | null;
  usable_area_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_label: string | null;
  has_elevator: boolean | null;
  has_terrace: boolean | null;
  has_garage: boolean | null;
  year_built: number | null;
  condition: string | null;
  agency_name: string | null;
  description: string | null;
  image_urls: string[];
  confidence: number;
  evidence: Array<{ label: string; url: string }>;
};

export default function EstatePage() {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputs, setInputs] = useState<DealInputs>(BASE_INPUTS);
  const [draft, setDraft] = useState<PropertyDraft>(EMPTY_DRAFT);
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
  const [analyzerStep, setAnalyzerStep] = useState(0);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const analysis = useMemo(() => analyzeDeal(inputs), [inputs]);
  const selectedDeal = useMemo(() => savedDeals.find((deal) => deal.id === selectedPropertyId) ?? null, [savedDeals, selectedPropertyId]);

  const refreshDeals = useCallback(async (activeUser: User) => {
    setLoadingDeals(true);
    try { setSavedDeals(await loadSavedDeals(activeUser)); }
    catch (error) { setStatusMessage(error instanceof Error ? error.message : "No se pudieron cargar las operaciones."); }
    finally { setLoadingDeals(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const nextUser = data.user ?? null;
      setUser(nextUser); setAuthReady(true);
      if (nextUser) void refreshDeals(nextUser);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser); setAuthReady(true);
      if (nextUser) void refreshDeals(nextUser); else setSavedDeals([]);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [refreshDeals]);

  function updateInput<K extends keyof DealInputs>(key: K, value: DealInputs[K]) { setInputs((current) => ({ ...current, [key]: value })); }
  function selectView(next: View) { setView(next); setSidebarOpen(false); }

  function startNewDeal() {
    setEditingPropertyId(null); setSelectedPropertyId(null);
    setDraft({ ...EMPTY_DRAFT, features: { ...EMPTY_DRAFT.features } });
    setInputs({ ...BASE_INPUTS }); setImportUrl(""); setImportMessage(""); setAnalyzerStep(0); selectView("analyze");
  }

  function startResearchCandidate(candidate: ResearchCandidate) {
    setEditingPropertyId(null); setSelectedPropertyId(null);
    setDraft({
      ...EMPTY_DRAFT,
      title: candidate.title,
      municipality: candidate.municipality ?? "",
      province: candidate.province ?? "Alicante",
      address: candidate.address ?? "",
      listingUrl: candidate.url,
      portal: candidate.portal ?? candidate.source ?? "web",
      bedrooms: candidate.bedrooms ?? undefined,
      bathrooms: candidate.bathrooms ?? undefined,
      features: {
        rentalStrategy: "long_term",
        source: "web_research",
        sourceImageUrls: candidate.image_urls,
        evidence: { listing: { kind: "fact", source: candidate.url, observedAt: new Date().toISOString() } },
      },
    });
    setInputs({
      ...BASE_INPUTS,
      purchasePrice: candidate.asking_price ?? 0,
      marketValueEstimate: candidate.market_value_estimate ?? 0,
      monthlyRent: candidate.monthly_rent_estimate ?? 0,
      builtAreaM2: candidate.built_area_m2 ?? 0,
      daysOnMarket: candidate.days_on_market ?? 0,
      dataConfidence: Math.max(0.2, Math.min(0.85, candidate.confidence * 0.8)),
    });
    setImportUrl(candidate.url);
    setImportMessage(`${candidate.source.toUpperCase()} · ${candidate.evidence.length} evidencias · revisa antes de guardar`);
    setAnalyzerStep(0); selectView("analyze");
  }

  function openProperty(deal: SavedDeal) { setSelectedPropertyId(deal.id); selectView("property"); }
  function reanalyzeProperty(deal: SavedDeal) {
    setEditingPropertyId(deal.id); setSelectedPropertyId(deal.id); setDraft(draftFromDeal(deal)); setInputs(inputFromDeal(deal));
    setImportUrl(deal.estate_listings?.[0]?.url ?? ""); setImportMessage(""); setAnalyzerStep(0); selectView("analyze");
  }

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImportBusy(true); setImportMessage("");
    try {
      const { data: auth } = await supabase.auth.getSession();
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth.session?.access_token ? { Authorization: `Bearer ${auth.session.access_token}` } : {}) },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = (await response.json()) as { error?: string; url?: string; portal?: string; extraction?: { reason?: string; status?: string }; listing?: ImportedListing | null };
      if (!response.ok) throw new Error(data.error || "No se pudo leer la URL.");
      const listing = data.listing;
      setDraft((current) => ({
        ...current,
        listingUrl: data.url ?? importUrl,
        portal: data.portal ?? "other",
        title: listing?.title || current.title,
        municipality: listing?.municipality || current.municipality,
        province: listing?.province || current.province,
        address: listing?.address || current.address,
        bedrooms: listing?.bedrooms ?? current.bedrooms,
        bathrooms: listing?.bathrooms ?? current.bathrooms,
        floorLabel: listing?.floor_label ?? current.floorLabel,
        usableAreaM2: listing?.usable_area_m2 ?? current.usableAreaM2,
        hasElevator: listing?.has_elevator ?? current.hasElevator,
        hasTerrace: listing?.has_terrace ?? current.hasTerrace,
        hasGarage: listing?.has_garage ?? current.hasGarage,
        yearBuilt: listing?.year_built ?? current.yearBuilt,
        condition: listing?.condition ? normalizeCondition(listing.condition) : current.condition,
        features: {
          ...(current.features ?? {}),
          source: data.portal ?? "other",
          sourceImageUrls: listing?.image_urls ?? current.features?.sourceImageUrls ?? [],
          evidence: {
            ...(current.features?.evidence ?? {}),
            listing: { kind: "fact", source: data.url ?? importUrl, observedAt: new Date().toISOString() },
          },
        },
      }));
      if (listing) {
        setInputs((current) => ({
          ...current,
          purchasePrice: listing.asking_price ?? current.purchasePrice,
          builtAreaM2: listing.built_area_m2 ?? current.builtAreaM2,
          dataConfidence: Math.max(current.dataConfidence, Math.min(0.9, listing.confidence)),
        }));
      }
      setImportMessage(`${(data.portal ?? "fuente").toUpperCase()} · ${data.extraction?.status === "enriched" ? "ficha extraída" : "URL guardada"} · ${data.extraction?.reason ?? "revisa los datos"}`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo procesar la URL.");
    } finally { setImportBusy(false); }
  }

  async function handleSave() {
    if (!user) { setAuthOpen(true); return; }
    setSaving(true); setStatusMessage("");
    const wasEditing = Boolean(editingPropertyId);
    try {
      const propertyId = await saveDeal(user, draft, inputs, analysis, editingPropertyId);
      await refreshDeals(user); setSelectedPropertyId(propertyId); setEditingPropertyId(null);
      setStatusMessage(wasEditing ? "Versión guardada." : "Workspace creado · fotos y microzona se enriquecen cuando hay IA disponible.");
      selectView("property");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la operación."); }
    finally { setSaving(false); }
  }

  async function changeDealStage(deal: SavedDeal, stage: EstateStage) {
    if (!user || deal.stage === stage) return;
    const blockers = (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at);
    const from = STAGE_ORDER.indexOf(deal.stage); const to = STAGE_ORDER.indexOf(stage);
    if (blockers.length && to > from && stage !== "discarded") { setStatusMessage(`Bloqueado · ${blockers.length} riesgo${blockers.length > 1 ? "s" : ""} pendiente${blockers.length > 1 ? "s" : ""}.`); return; }
    try { await updateDealStage(user, deal.id, stage); await refreshDeals(user); }
    catch (error) { setStatusMessage(error instanceof Error ? error.message : "No se pudo cambiar la etapa."); }
  }

  async function refreshCurrentWorkspace() { if (user) await refreshDeals(user); }

  async function handleSignIn(event: FormEvent) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage("");
    try { const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword }); if (error) throw error; setAuthOpen(false); setAuthPassword(""); }
    catch (error) { setAuthMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión."); }
    finally { setAuthBusy(false); }
  }

  async function handleSignUp() {
    setAuthBusy(true); setAuthMessage("");
    try { const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword }); if (error) throw error; setAuthMessage(data.session ? "Cuenta lista." : "Revisa tu correo."); }
    catch (error) { setAuthMessage(error instanceof Error ? error.message : "No se pudo crear la cuenta."); }
    finally { setAuthBusy(false); }
  }

  async function handleSignOut() { await supabase.auth.signOut(); setSavedDeals([]); setSelectedPropertyId(null); setEditingPropertyId(null); selectView("home"); }

  return (
    <div className="estate-shell">
      <EstateSidebar view={view} open={sidebarOpen} dealCount={savedDeals.length} onSelect={selectView} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <EstateTopbar view={view} propertyTitle={selectedDeal?.title} authReady={authReady} signedIn={Boolean(user)} onMenu={() => setSidebarOpen(true)} onLogin={() => setAuthOpen(true)} onLogout={handleSignOut} onNew={startNewDeal} />
        <main className="content">
          {statusMessage && <button className="toast" onClick={() => setStatusMessage("")}><span className="status-dot" />{statusMessage}<X size={13} /></button>}
          {loadingDeals && user && savedDeals.length === 0 ? <div className="global-loading"><Loader2 size={18} className="spin" /> Cargando…</div> : null}
          {view === "home" && <HomeView deals={savedDeals} onNew={startNewDeal} onExplore={() => selectView("explore")} onOpen={openProperty} onOpportunities={() => selectView("opportunities")} />}
          {view === "explore" && <ExploreView deals={savedDeals} onNew={startNewDeal} onOpen={openProperty} user={user} onCandidate={startResearchCandidate} />}
          {view === "market" && <MarketView deals={savedDeals} onNew={startNewDeal} onOpen={openProperty} />}
          {view === "opportunities" && <OpportunitiesView deals={savedDeals} onNew={startNewDeal} onOpen={openProperty} onStageChange={changeDealStage} />}
          {view === "portfolio" && <PortfolioView deals={savedDeals} onOpen={openProperty} onOpportunities={() => selectView("opportunities")} />}
          {view === "analyze" && <AnalyzerView draft={draft} setDraft={setDraft} inputs={inputs} updateInput={updateInput} analysis={analysis} importUrl={importUrl} setImportUrl={setImportUrl} importBusy={importBusy} importMessage={importMessage} onImport={handleImport} onSave={handleSave} saving={saving} signedIn={Boolean(user)} step={analyzerStep} setStep={setAnalyzerStep} editing={Boolean(editingPropertyId)} />}
          {view === "property" && selectedDeal && user && <PropertyWorkspace user={user} deal={selectedDeal} onBack={() => selectView("opportunities")} onReanalyze={() => reanalyzeProperty(selectedDeal)} onStageChange={(stage) => changeDealStage(selectedDeal, stage)} onRefresh={refreshCurrentWorkspace} />}
          {view === "property" && !selectedDeal && <div className="global-loading">Propiedad no disponible. <button className="text-link button-link" onClick={() => selectView("opportunities")}>Volver</button></div>}
        </main>
      </div>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      {authOpen && <div className="modal-backdrop" onMouseDown={() => setAuthOpen(false)}><div className="auth-modal" role="dialog" aria-modal="true" aria-label="Acceso a Estate" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setAuthOpen(false)} aria-label="Cerrar"><X size={17} /></button><div className="modal-icon"><LockKeyhole size={20} /></div><span className="eyebrow">ESTATE ACCESS</span><h2>Dataset privado</h2><form className="auth-form" onSubmit={handleSignIn}><label>Correo<input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label><label>Contraseña<input type="password" required minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} /></label>{authMessage && <div className="form-message">{authMessage}</div>}<button className="primary-button full" type="submit" disabled={authBusy}>{authBusy ? <Loader2 size={14} className="spin" /> : <LogIn size={14} />} Entrar</button><button className="ghost-button full" type="button" disabled={authBusy} onClick={handleSignUp}>Crear cuenta</button></form></div></div>}
    </div>
  );
}
