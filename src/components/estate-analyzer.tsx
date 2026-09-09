"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Database,
  Gauge,
  Home,
  Layers3,
  Loader2,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import type { EvidenceKind, PropertyDraft, PropertyFeatures } from "@/lib/estate-store";
import { DataMeter, EvidenceChip, fmtMoney, fmtPct, Metric, Panel, ScoreDial, SectionHead } from "@/components/estate-primitives";

const STEPS = [
  { label: "Captura", helper: "Qué estás mirando", icon: <Search size={15} /> },
  { label: "Inmueble", helper: "Qué estás comprando", icon: <Building2 size={15} /> },
  { label: "Mercado", helper: "Qué puede valer y alquilar", icon: <MapPin size={15} /> },
  { label: "Compra", helper: "Cómo entra el capital", icon: <CircleDollarSign size={15} /> },
  { label: "Operación", helper: "Qué cuesta mantenerlo", icon: <Wrench size={15} /> },
  { label: "Decisión", helper: "Qué harías ahora", icon: <Target size={15} /> },
];

function FieldLabel({ children, kind }: { children: ReactNode; kind?: EvidenceKind }) {
  return <span className="field-label"><span>{children}</span>{kind && <EvidenceChip kind={kind} />}</span>;
}

function NumberField({ label, value, onChange, suffix, step = 1, min = 0, kind }: { label: string; value: number | undefined | null; onChange: (value: number) => void; suffix?: string; step?: number; min?: number; kind?: EvidenceKind }) {
  return <label className="field"><FieldLabel kind={kind}>{label}</FieldLabel><div className="input-shell"><input type="number" min={min} step={step} value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))} />{suffix && <small>{suffix}</small>}</div></label>;
}

function TextField({ label, value, onChange, placeholder, kind }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; kind?: EvidenceKind }) {
  return <label className="field"><FieldLabel kind={kind}>{label}</FieldLabel><div className="input-shell"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div></label>;
}

function Choice({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <div className="choice-row">{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

function Toggle({ value, onChange, label }: { value: boolean | undefined; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" className={`boolean-card ${value ? "active" : ""}`} onClick={() => onChange(!value)}><span>{label}</span><i>{value ? <Check size={12} /> : null}</i></button>;
}

function patchFeatures(setDraft: Dispatch<SetStateAction<PropertyDraft>>, patch: Partial<PropertyFeatures>) {
  setDraft((current) => ({ ...current, features: { ...(current.features ?? {}), ...patch } }));
}

function requiredProgress(draft: PropertyDraft, inputs: DealInputs) {
  const checks = [Boolean(draft.title.trim()), Boolean(draft.municipality.trim()), Boolean(inputs.builtAreaM2), draft.bedrooms !== undefined, draft.bathrooms !== undefined, Boolean(inputs.purchasePrice), Boolean(inputs.monthlyRent), Boolean(inputs.marketValueEstimate), Boolean(inputs.ltvPct >= 0), Boolean(inputs.purchaseTaxPct >= 0), Boolean(inputs.communityMonthly >= 0), Boolean(inputs.ibiAnnual >= 0)];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function essentialsMissing(draft: PropertyDraft, inputs: DealInputs) {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push("nombre");
  if (!draft.municipality.trim()) missing.push("municipio");
  if (!inputs.builtAreaM2) missing.push("superficie");
  if (!inputs.purchasePrice) missing.push("precio");
  if (!inputs.monthlyRent) missing.push("alquiler estimado");
  return missing;
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
  editing,
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
  editing: boolean;
}) {
  const missing = essentialsMissing(draft, inputs);
  const progress = requiredProgress(draft, inputs);
  const canSave = missing.length === 0;

  return (
    <div className="view view-analyzer">
      <SectionHead eyebrow={editing ? "NUEVA VERSIÓN" : "UNDERWRITING"} title={editing ? `Reanaliza ${draft.title}.` : "Una decisión. Seis pasos."} copy="Primero hechos. Después mercado. Luego financiación y operación. El score llega al final, no al principio." action={<DataMeter value={progress} label="mínimos" />} />

      <div className="analyzer-stepper">
        {STEPS.map((item, index) => <button key={item.label} className={`${step === index ? "active" : ""} ${index < step ? "done" : ""}`} onClick={() => setStep(index)}><i>{index < step ? <Check size={13} /> : item.icon}</i><span><strong>{item.label}</strong><small>{item.helper}</small></span></button>)}
      </div>

      <div className="analyzer-layout">
        <Panel className="analyzer-form">
          <div className="analyzer-form-head"><span>0{step + 1}</span><div><h2>{STEPS[step].label}</h2><p>{STEPS[step].helper}</p></div></div>

          {step === 0 && (
            <div className="step-content capture-step">
              <div className="url-capture"><Search size={17} /><input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="Pega URL de Idealista, Fotocasa, agencia…" /><button onClick={onImport} disabled={importBusy || !importUrl.trim()}>{importBusy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}</button></div>
              {importMessage && <div className="source-message"><Database size={14} /><span>{importMessage}</span></div>}
              <div className="field-grid two">
                <TextField label="Nombre interno" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} placeholder="Piso centro · oportunidad 01" kind="fact" />
                <TextField label="Municipio" value={draft.municipality} onChange={(value) => setDraft((current) => ({ ...current, municipality: value }))} placeholder="Castalla" kind="fact" />
                <TextField label="Provincia" value={draft.province} onChange={(value) => setDraft((current) => ({ ...current, province: value }))} placeholder="Alicante" kind="fact" />
                <TextField label="Dirección / zona" value={draft.address ?? ""} onChange={(value) => setDraft((current) => ({ ...current, address: value }))} placeholder="Calle, barrio o referencia" kind="fact" />
              </div>
              <div className="step-explainer"><ShieldCheck size={16} /><div><strong>Capturar no es analizar.</strong><p>La URL identifica la fuente. Estate no rellena automáticamente datos de un portal si no existe un conector autorizado.</p></div></div>
            </div>
          )}

          {step === 1 && (
            <div className="step-content">
              <div className="field-grid three">
                <NumberField label="Superficie construida" value={inputs.builtAreaM2} suffix="m²" onChange={(value) => updateInput("builtAreaM2", value)} kind="fact" />
                <NumberField label="Superficie útil" value={draft.usableAreaM2} suffix="m²" onChange={(value) => setDraft((current) => ({ ...current, usableAreaM2: value }))} kind="fact" />
                <NumberField label="Año" value={draft.yearBuilt} onChange={(value) => setDraft((current) => ({ ...current, yearBuilt: value }))} kind="fact" />
                <NumberField label="Dormitorios" value={draft.bedrooms} onChange={(value) => setDraft((current) => ({ ...current, bedrooms: value }))} kind="fact" />
                <NumberField label="Baños" value={draft.bathrooms} onChange={(value) => setDraft((current) => ({ ...current, bathrooms: value }))} kind="fact" />
                <TextField label="Planta" value={draft.floorLabel ?? ""} onChange={(value) => setDraft((current) => ({ ...current, floorLabel: value }))} placeholder="2ª" kind="fact" />
              </div>
              <div className="subsection"><span className="subsection-title">EDIFICIO Y EXTRAS</span><div className="boolean-grid"><Toggle label="Ascensor" value={draft.hasElevator} onChange={(value) => setDraft((current) => ({ ...current, hasElevator: value }))} /><Toggle label="Exterior" value={draft.features?.exterior ?? undefined} onChange={(value) => patchFeatures(setDraft, { exterior: value })} /><Toggle label="Terraza" value={draft.hasTerrace} onChange={(value) => setDraft((current) => ({ ...current, hasTerrace: value }))} /><Toggle label="Garaje" value={draft.hasGarage} onChange={(value) => setDraft((current) => ({ ...current, hasGarage: value }))} /><Toggle label="Trastero" value={draft.hasStorage} onChange={(value) => setDraft((current) => ({ ...current, hasStorage: value }))} /><Toggle label="Gas" value={draft.features?.gas ?? undefined} onChange={(value) => patchFeatures(setDraft, { gas: value })} /></div></div>
              <div className="subsection split-subsection"><div><span className="subsection-title">ESTADO</span><Choice value={draft.condition ?? "unknown"} onChange={(value) => setDraft((current) => ({ ...current, condition: value as PropertyDraft["condition"] }))} options={[{ value: "good", label: "Bien" }, { value: "dated", label: "Antiguo" }, { value: "light_renovation", label: "Ligera" }, { value: "medium_renovation", label: "Media" }, { value: "full_renovation", label: "Integral" }]} /></div><div><span className="subsection-title">INSTALACIONES</span><div className="field-grid two"><TextField label="Calefacción" value={draft.features?.heating ?? ""} onChange={(value) => patchFeatures(setDraft, { heating: value })} placeholder="Gas / eléctrica / no" kind="fact" /><TextField label="Agua caliente" value={draft.features?.hotWater ?? ""} onChange={(value) => patchFeatures(setDraft, { hotWater: value })} placeholder="Termo / gas…" kind="fact" /><TextField label="Electricidad" value={draft.features?.electricity ?? ""} onChange={(value) => patchFeatures(setDraft, { electricity: value })} placeholder="Revisada / antigua…" kind="fact" /><TextField label="Fontanería" value={draft.features?.plumbing ?? ""} onChange={(value) => patchFeatures(setDraft, { plumbing: value })} placeholder="Revisada / antigua…" kind="fact" /></div></div></div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="market-input-band">
                <NumberField label="Precio anunciado" value={inputs.purchasePrice} suffix="€" onChange={(value) => updateInput("purchasePrice", value)} kind="fact" />
                <NumberField label="Valor razonable" value={inputs.marketValueEstimate} suffix="€" onChange={(value) => updateInput("marketValueEstimate", value)} kind="estimate" />
                <NumberField label="Alquiler esperado" value={inputs.monthlyRent} suffix="€/mes" onChange={(value) => updateInput("monthlyRent", value)} kind="estimate" />
              </div>
              <div className="confidence-control"><div><span>Confianza de los datos de mercado</span><strong>{Math.round(inputs.dataConfidence * 100)}%</strong></div><input type="range" min="0.2" max="1" step="0.05" value={inputs.dataConfidence} onChange={(event) => updateInput("dataConfidence", Number(event.target.value))} /><p>Sube la confianza solo cuando exista evidencia: comparables, tasación, alquileres equivalentes o una fuente verificable.</p></div>
              <div className="field-grid two"><NumberField label="Días publicado" value={inputs.daysOnMarket} suffix="días" onChange={(value) => updateInput("daysOnMarket", value)} kind="fact" /><NumberField label="Bajadas de precio" value={inputs.priceDrops} onChange={(value) => updateInput("priceDrops", value)} kind="fact" /></div>
              <div className="subsection split-subsection"><div><span className="subsection-title">ESTRATEGIA DE ALQUILER</span><Choice value={draft.features?.rentalStrategy ?? "long_term"} onChange={(value) => patchFeatures(setDraft, { rentalStrategy: value })} options={[{ value: "long_term", label: "Larga estancia" }, { value: "rooms", label: "Habitaciones" }, { value: "student", label: "Estudiantes" }]} /></div><div><span className="subsection-title">INQUILINO OBJETIVO</span><TextField label="Perfil" value={draft.features?.tenantProfile ?? ""} onChange={(value) => patchFeatures(setDraft, { tenantProfile: value })} placeholder="Pareja joven, familia, profesional…" kind="assumption" /></div></div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <div className="field-grid three"><NumberField label="ITP" value={inputs.purchaseTaxPct} suffix="%" step={0.1} onChange={(value) => updateInput("purchaseTaxPct", value)} kind="assumption" /><NumberField label="Notaría + registro" value={inputs.notaryRegistry} suffix="€" onChange={(value) => updateInput("notaryRegistry", value)} kind="assumption" /><NumberField label="Tasación" value={inputs.appraisal} suffix="€" onChange={(value) => updateInput("appraisal", value)} kind="assumption" /></div>
              <div className="finance-block"><div className="finance-block-head"><span className="subsection-title">FINANCIACIÓN</span><strong>{fmtMoney(analysis.loanAmount)} préstamo</strong></div><div className="field-grid three"><NumberField label="LTV" value={inputs.ltvPct} suffix="%" step={0.5} onChange={(value) => updateInput("ltvPct", value)} kind="assumption" /><NumberField label="Interés" value={inputs.interestPct} suffix="%" step={0.05} onChange={(value) => updateInput("interestPct", value)} kind="assumption" /><NumberField label="Plazo" value={inputs.termYears} suffix="años" onChange={(value) => updateInput("termYears", value)} kind="assumption" /></div><div className="finance-visual-bar"><i style={{ width: `${Math.min(100, inputs.ltvPct)}%` }} /><span>Banco {fmtPct(inputs.ltvPct)}</span><span>Entrada {fmtPct(100 - inputs.ltvPct)}</span></div></div>
              <NumberField label="Otros costes financiación" value={inputs.financingFees} suffix="€" onChange={(value) => updateInput("financingFees", value)} kind="assumption" />
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <div className="field-grid three"><NumberField label="Comunidad" value={inputs.communityMonthly} suffix="€/mes" onChange={(value) => updateInput("communityMonthly", value)} kind="fact" /><NumberField label="IBI" value={inputs.ibiAnnual} suffix="€/año" onChange={(value) => updateInput("ibiAnnual", value)} kind="fact" /><NumberField label="Seguro" value={inputs.insuranceAnnual} suffix="€/año" onChange={(value) => updateInput("insuranceAnnual", value)} kind="assumption" /><NumberField label="Mantenimiento" value={inputs.maintenanceMonthly} suffix="€/mes" onChange={(value) => updateInput("maintenanceMonthly", value)} kind="assumption" /><NumberField label="Vacancia" value={inputs.vacancyPct} suffix="%" step={0.5} onChange={(value) => updateInput("vacancyPct", value)} kind="assumption" /><NumberField label="Gestión" value={inputs.managementPct} suffix="%" step={0.5} onChange={(value) => updateInput("managementPct", value)} kind="assumption" /></div>
              <div className="project-costs"><div className="panel-head"><div><span className="subsection-title">ANTES DE ALQUILAR</span><h3>Capital de puesta en marcha</h3></div><Layers3 size={17} /></div><div className="field-grid three"><NumberField label="Reforma inicial" value={inputs.renovation} suffix="€" onChange={(value) => updateInput("renovation", value)} kind="estimate" /><NumberField label="Mobiliario" value={inputs.furniture} suffix="€" onChange={(value) => updateInput("furniture", value)} kind="estimate" /><NumberField label="Colchón" value={inputs.reserve} suffix="€" onChange={(value) => updateInput("reserve", value)} kind="assumption" /></div><p>El desglose real de reforma se hace después, dentro del workspace de esta propiedad. Aquí solo entra la provisión inicial para underwriting.</p></div>
            </div>
          )}

          {step === 5 && (
            <div className="step-content decision-step">
              <div className="decision-hero"><ScoreDial score={analysis.score} label={analysis.verdict} size="lg" /><div><span className="eyebrow">DECISIÓN PROVISIONAL</span><h2>{analysis.verdict === "NEGOCIAR" ? "Los números permiten negociar." : analysis.verdict === "VISITAR" ? "Merece validar sobre el terreno." : analysis.verdict === "ANALIZAR" ? "Faltan evidencias antes de desplazarte." : analysis.verdict === "MONITORIZAR" ? "No compite todavía." : "No pasa el filtro actual."}</h2><p>Score {fmtPct(analysis.scoreCoverage * 100).replace("%", "% de cobertura")} · motor {analysis.engineVersion}</p></div></div>
              <div className="decision-metrics"><Metric label="Capital requerido" value={fmtMoney(analysis.capitalRequired)} /><Metric label="Cash-flow" value={`${fmtMoney(analysis.netMonthlyCashFlow)}/mes`} tone={analysis.netMonthlyCashFlow >= 0 ? "good" : "bad"} /><Metric label="Yield neta" value={fmtPct(analysis.netYieldPct)} /><Metric label="Precio máximo" value={fmtMoney(analysis.maxPurchasePrice)} tone="accent" /></div>
              <div className="decision-columns"><div><span className="subsection-title">A FAVOR</span>{analysis.strengths.length ? analysis.strengths.map((item) => <div className="decision-line good" key={item}><Check size={13} />{item}</div>) : <p className="muted-copy">No hay fortalezas suficientes todavía.</p>}</div><div><span className="subsection-title">EN CONTRA</span>{analysis.weaknesses.length ? analysis.weaknesses.map((item) => <div className="decision-line bad" key={item}><Gauge size={13} />{item}</div>) : <p className="muted-copy">No hay debilidades críticas registradas.</p>}</div></div>
              <div className="stress-matrix">{analysis.stress.filter((scenario) => scenario.key !== "base").map((scenario) => <div className={scenario.passes ? "pass" : "fail"} key={scenario.key}><span>{scenario.label}</span><strong>{fmtMoney(scenario.monthlyCashFlow)}</strong><small>{scenario.passes ? "resiste" : "falla"}</small></div>)}</div>
              {!canSave && <div className="save-blocked">Faltan datos mínimos: {missing.join(", ")}.</div>}
            </div>
          )}

          <div className="analyzer-footer">
            <button className="ghost-button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={14} /> Atrás</button>
            <div className="analyzer-footer-note">{step < 5 ? "Los cambios recalculan el underwriting en tiempo real." : signedIn ? editing ? "Guardar crea una nueva versión del análisis sobre la misma propiedad." : "Guardar crea el workspace de esta propiedad." : "Inicia sesión para guardar."}</div>
            {step < 5 ? <button className="primary-button" onClick={() => setStep(step + 1)}>Siguiente <ArrowRight size={14} /></button> : <button className="primary-button" onClick={onSave} disabled={saving || !canSave}>{saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}{signedIn ? editing ? "Guardar versión" : "Crear workspace" : "Entrar y guardar"}</button>}
          </div>
        </Panel>

        <aside className="live-underwriting">
          <div className="live-head"><div><span className="eyebrow">LIVE UNDERWRITING</span><h3>{draft.title || "Sin nombre"}</h3></div><ScoreDial score={analysis.score} size="sm" /></div>
          <div className="live-metrics"><Metric label="Capital" value={fmtMoney(analysis.capitalRequired)} /><Metric label="Cash-flow" value={fmtMoney(analysis.netMonthlyCashFlow)} tone={analysis.netMonthlyCashFlow >= 0 ? "good" : "bad" /><Metric label="Yield" value={fmtPct(analysis.netYieldPct)} /><Metric label="Cuota" value={fmtMoney(analysis.mortgageMonthly)} /></div>
          <div className="price-discipline"><span>Precio pedido</span><strong>{fmtMoney(inputs.purchasePrice)}</strong><div className="discipline-track"><i style={{ width: `${analysis.maxPurchasePrice && inputs.purchasePrice ? Math.min(100, analysis.maxPurchasePrice / inputs.purchasePrice * 100) : 0}%` }} /></div><div><small>máximo</small><b>{fmtMoney(analysis.maxPurchasePrice)}</b></div></div>
          <DataMeter value={Math.round(analysis.scoreCoverage * 100)} label="confianza del score" />
          <div className={`stress-badge stress-${analysis.stressStatus}`}><Sparkles size={14} /><div><span>Stress test</span><strong>{analysis.stressStatus === "green" ? "Resistente" : analysis.stressStatus === "orange" ? "Frágil" : "No resiste"}</strong></div></div>
          <div className="live-rule"><Home size={14} /><span>La reforma, fotos, zona y riesgos se profundizan después dentro de esta propiedad.</span></div>
        </aside>
      </div>
    </div>
  );
}
