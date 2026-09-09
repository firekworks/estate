"use client";

import type { User } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeDeal, type DealInputs } from "@/lib/estate-engine";
import {
  loadSavedDeals,
  saveDeal,
  updateDealStage,
  type EstateStage,
  type PropertyDraft,
  type SavedDeal,
} from "@/lib/estate-store";
import { supabase } from "@/lib/supabase";
import {
  AppSidebar,
  AuthModal,
  DashboardView,
  AnalyzerView,
  OperationsView,
  FinderView,
  MarketView,
  RenovationView,
  PortfolioView,
  Topbar,
  type View,
} from "@/components/estate-ui";

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
  title: "Ejemplo · Villena",
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
  const [analyzerStep, setAnalyzerStep] = useState(0);

  const analysis = useMemo(() => analyzeDeal(inputs), [inputs]);

  const refreshDeals = useCallback(async (activeUser: User) => {
    setLoadingDeals(true);
    try {
      const deals = await loadSavedDeals(activeUser);
      setSavedDeals(deals);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudieron cargar las operaciones.",
      );
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const nextUser = data.user ?? null;
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) void refreshDeals(nextUser);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void refreshDeals(nextUser);
      } else {
        setSavedDeals([]);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refreshDeals]);

  function updateInput<K extends keyof DealInputs>(key: K, value: DealInputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function startNewDeal() {
    setDraft({
      ...DEFAULT_DRAFT,
      title: "Nueva operación",
      municipality: "",
      address: "",
      listingUrl: "",
      portal: "manual",
    });
    setInputs(DEFAULT_INPUTS);
    setImportUrl("");
    setImportMessage("");
    setAnalyzerStep(0);
    setView("analyze");
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
      setImportMessage(`${(data.portal ?? "fuente").toUpperCase()} · fuente identificada`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo procesar la URL.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleSave() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      await saveDeal(user, draft, inputs, analysis);
      setStatusMessage("Operación guardada");
      await refreshDeals(user);
      setView("watchlist");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo guardar la operación.");
    } finally {
      setSaving(false);
    }
  }

  function openSavedDeal(deal: SavedDeal) {
    const record = deal.estate_deal_analyses?.[0];
    if (record?.inputs) {
      setInputs(record.inputs as DealInputs);
    }
    const listing = deal.estate_listings?.[0];
    setDraft({
      title: deal.title,
      municipality: deal.municipality ?? "",
      province: deal.province ?? "Alicante",
      address: deal.address ?? "",
      listingUrl: listing?.url ?? "",
      portal: listing?.portal ?? "manual",
      bedrooms: deal.bedrooms ?? undefined,
      bathrooms: deal.bathrooms ?? undefined,
      floorLabel: deal.floor_label ?? "",
      hasElevator: deal.has_elevator ?? undefined,
      condition: deal.condition ?? "unknown",
    });
    setImportUrl(listing?.url ?? "");
    setImportMessage("");
    setAnalyzerStep(0);
    setView("analyze");
  }

  async function changeDealStage(deal: SavedDeal, stage: EstateStage) {
    if (!user || deal.stage === stage) return;
    try {
      await updateDealStage(user, deal.id, stage);
      setSavedDeals((current) =>
        current.map((item) => (item.id === deal.id ? { ...item, stage } : item)),
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    }
  }

  async function handleSignIn(event: FormEvent) {
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
      setAuthMessage(data.session ? "Cuenta lista" : "Revisa tu correo para confirmar");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSavedDeals([]);
    setStatusMessage("");
  }

  function selectView(next: View) {
    setView(next);
    setSidebarOpen(false);
  }

  return (
    <div className="estate-shell">
      <AppSidebar
        view={view}
        open={sidebarOpen}
        savedCount={savedDeals.length}
        onSelect={selectView}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        <Topbar
          view={view}
          authReady={authReady}
          signedIn={Boolean(user)}
          onMenu={() => setSidebarOpen(true)}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleSignOut}
          onNew={startNewDeal}
        />

        <main className="content">
          {statusMessage && (
            <button className="toast" onClick={() => setStatusMessage("")}>
              <span className="status-dot" />
              {statusMessage}
            </button>
          )}

          {view === "dashboard" && (
            <DashboardView
              analysis={analysis}
              inputs={inputs}
              draft={draft}
              deals={savedDeals}
              loading={loadingDeals}
              onAnalyze={() => selectView("analyze")}
              onOperations={() => selectView("watchlist")}
              onOpenDeal={openSavedDeal}
            />
          )}

          {view === "analyze" && (
            <AnalyzerView
              draft={draft}
              setDraft={setDraft}
              inputs={inputs}
              updateInput={updateInput}
              analysis={analysis}
              importUrl={importUrl}
              setImportUrl={setImportUrl}
              importBusy={importBusy}
              importMessage={importMessage}
              onImport={handleImport}
              onSave={handleSave}
              saving={saving}
              signedIn={Boolean(user)}
              step={analyzerStep}
              setStep={setAnalyzerStep}
            />
          )}

          {view === "watchlist" && (
            <OperationsView
              user={user}
              deals={savedDeals}
              loading={loadingDeals}
              onLogin={() => setAuthOpen(true)}
              onNew={startNewDeal}
              onOpen={openSavedDeal}
              onStageChange={changeDealStage}
            />
          )}

          {view === "finder" && (
            <FinderView deals={savedDeals} onOpen={openSavedDeal} onAnalyze={startNewDeal} />
          )}

          {view === "market" && (
            <MarketView deals={savedDeals} onAnalyze={startNewDeal} />
          )}

          {view === "renovation" && (
            <RenovationView
              inputs={inputs}
              updateInput={updateInput}
              analysis={analysis}
            />
          )}

          {view === "portfolio" && (
            <PortfolioView deals={savedDeals} onOperations={() => selectView("watchlist")} />
          )}
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {authOpen && (
        <AuthModal
          email={authEmail}
          password={authPassword}
          busy={authBusy}
          message={authMessage}
          setEmail={setAuthEmail}
          setPassword={setAuthPassword}
          onClose={() => setAuthOpen(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      )}
    </div>
  );
}
