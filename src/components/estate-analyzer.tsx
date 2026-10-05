"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Database,
  Loader2,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import type { EvidenceKind, PropertyDraft, PropertyFeatures } from "@/lib/estate-store";
import {
  EvidenceChip,
  fmtMoney,
  fmtPct,
  Panel,
  SectionHead,
} from "@/components/estate-primitives";

import { analysisReadiness } from "@/lib/estate-readiness";
import { DecisionSummary } from "./estate-decision";

const STEPS = [
  { label: "Captura", helper: "Qué estás mirando", icon: <Search size={15} /> },
  { label: "Inmueble", helper: "Qué estás comprando", icon: <Building2 size={15} /> },
  { label: "Mercado", helper: "Qué puede valer y alquilar", icon: <MapPin size={15} /> },
  { label: "Compra", helper: "Cómo entra el capital", icon: <CircleDollarSign size={15} /> },
  { label: "Operación", helper: "Qué cuesta mantenerlo", icon: <Wrench size={15} /> },
  { label: "Decisión", helper: "Qué harías ahora", icon: <Target size={15} /> },
] as const;

function FieldLabel({ children, kind }: { children: ReactNode; kind?: EvidenceKind }) {
  return (
    <span className="field-label">
      <span>{children}</span>
      {kind ? <EvidenceChip kind={kind} /> : null}
    </span>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  kind,
}: {
  label: string;
  value: number | undefined | null;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  kind?: EvidenceKind;
}) {
  return (
    <label className="field">
      <FieldLabel kind={kind}>{label}</FieldLabel>
      <div className="input-shell">
        <input
          type="number"
          min={min}
          step={step}
          value={typeof value === "number" && Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.target.value===""?NaN:Number(event.target.value))}
        />
        {suffix ? <small>{suffix}</small> : null}
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  kind,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  kind?: EvidenceKind;
}) {
  return (
    <label className="field">
      <FieldLabel kind={kind}>{label}</FieldLabel>
      <div className="input-shell">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

function Choice({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="choice-row">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`boolean-card ${value ? "active" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <i>{value ? <Check size={12} /> : null}</i>
    </button>
  );
}

function patchFeatures(
  setDraft: Dispatch<SetStateAction<PropertyDraft>>,
  patch: Partial<PropertyFeatures>,
) {
  setDraft((current) => ({
    ...current,
    features: { ...(current.features ?? {}), ...patch },
  }));
}

function StepCapture({
  draft,
  setDraft,
  importUrl,
  setImportUrl,
  importBusy,
  importMessage,
  onImport,
}: {
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  importUrl: string;
  setImportUrl: (value: string) => void;
  importBusy: boolean;
  importMessage: string;
  onImport: () => void;
}) {
  return (
    <div className="step-content capture-step">
      <div className="url-capture">
        <Search size={17} />
        <input
          value={importUrl}
          onChange={(event) => setImportUrl(event.target.value)}
          aria-label="URL del anuncio"
          placeholder="Pega URL de Idealista, Fotocasa, agencia…"
        />
        <button aria-label="Importar anuncio" onClick={onImport} disabled={importBusy || !importUrl.trim()}>
          {importBusy ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
        </button>
      </div>
      {importMessage ? (
        <div className="source-message"><Database size={14} /><span>{importMessage}</span></div>
      ) : null}
      <div className="asset-type-picker">
        <span className="subsection-title">TIPO DE ACTIVO</span>
        <Choice
          value={draft.propertyType ?? "apartment"}
          onChange={(value) => setDraft((current) => ({ ...current, propertyType: value as PropertyDraft["propertyType"] }))}
          options={[
            { value: "apartment", label: "Piso" },
            { value: "house", label: "Casa" },
            { value: "studio", label: "Estudio" },
            { value: "garage", label: "Garaje" },
            { value: "land", label: "Suelo" },
            { value: "commercial", label: "Local" },
            { value: "office", label: "Oficina" },
            { value: "building", label: "Edificio" },
          ]}
        />
      </div>
      <div className="field-grid two">
        <TextField
          label="Nombre interno"
          value={draft.title}
          onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
          placeholder="Piso centro · oportunidad 01"
          kind="fact"
        />
        <TextField
          label="Municipio"
          value={draft.municipality}
          onChange={(value) => setDraft((current) => ({ ...current, municipality: value }))}
          placeholder="Castalla"
          kind="fact"
        />
        <TextField
          label="Provincia"
          value={draft.province}
          onChange={(value) => setDraft((current) => ({ ...current, province: value }))}
          placeholder="Alicante"
          kind="fact"
        />
        <TextField
          label="Dirección / zona"
          value={draft.address ?? ""}
          onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
          placeholder="Calle, barrio o referencia"
          kind="fact"
        />
      </div>
      <details className="step-explainer"><summary>Sobre la extracción</summary>
        <ShieldCheck size={16} />
        <div>
          <strong>Verifica la fuente.</strong>
          <p>La URL identifica la fuente. Estate no rellena datos de un portal si no existe un conector autorizado.</p>
        </div>
      </details>
    </div>
  );
}

function StepProperty({
  draft,
  setDraft,
  inputs,
  updateInput,
}: {
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
}) {
  return (
    <div className="step-content">
      <div className="field-grid three">
        <NumberField label="Superficie construida" value={inputs.builtAreaM2} suffix="m²" kind="fact" onChange={(value) => updateInput("builtAreaM2", value)} />
        <NumberField label="Superficie útil" value={draft.usableAreaM2} suffix="m²" kind="fact" onChange={(value) => setDraft((current) => ({ ...current, usableAreaM2: value }))} />
        <NumberField label="Año" value={draft.yearBuilt} kind="fact" onChange={(value) => setDraft((current) => ({ ...current, yearBuilt: value }))} />
        {!["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? (
          <NumberField label="Dormitorios" value={draft.bedrooms} kind="fact" onChange={(value) => setDraft((current) => ({ ...current, bedrooms: value }))} />
        ) : null}
        <NumberField label={["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? "Aseos / baños" : "Baños"} value={draft.bathrooms} kind="fact" onChange={(value) => setDraft((current) => ({ ...current, bathrooms: value }))} />
        <TextField label="Planta" value={draft.floorLabel ?? ""} kind="fact" placeholder="2ª" onChange={(value) => setDraft((current) => ({ ...current, floorLabel: value }))} />
      </div>

      {["commercial","office"].includes(draft.propertyType ?? "") && <div className="field-grid three">{([['frontage','Fachada (m)'],['visibility','Visibilidad'],['parking','Parking'],['access','Accesibilidad'],['licensing','Licencia / uso'],['power','Potencia eléctrica'],['emergencyExit','Salida de emergencia'],['ventilation','Ventilación'],['anchors','Comercios de referencia']] as const).map(([key,label])=><TextField key={key} label={label} value={String(draft.features?.commercial?.[key] ?? '')} kind="fact" onChange={value=>patchFeatures(setDraft,{commercial:{...draft.features?.commercial,[key]:key==='frontage'?(value?Number(value):undefined):value}})}/>)}</div>}
      <div className="subsection">
        <span className="subsection-title">EDIFICIO Y EXTRAS</span>
        <div className="boolean-grid">
          <Toggle label="Ascensor" value={draft.hasElevator} onChange={(value) => setDraft((current) => ({ ...current, hasElevator: value }))} />
          <Toggle label="Exterior" value={draft.features?.exterior ?? undefined} onChange={(value) => patchFeatures(setDraft, { exterior: value })} />
          <Toggle label="Terraza" value={draft.hasTerrace} onChange={(value) => setDraft((current) => ({ ...current, hasTerrace: value }))} />
          <Toggle label="Garaje" value={draft.hasGarage} onChange={(value) => setDraft((current) => ({ ...current, hasGarage: value }))} />
          <Toggle label="Trastero" value={draft.hasStorage} onChange={(value) => setDraft((current) => ({ ...current, hasStorage: value }))} />
          <Toggle label="Gas" value={draft.features?.gas ?? undefined} onChange={(value) => patchFeatures(setDraft, { gas: value })} />
        </div>
      </div>

      <div className="subsection split-subsection">
        <div>
          <span className="subsection-title">ESTADO</span>
          <Choice
            value={draft.condition ?? "unknown"}
            onChange={(value) => setDraft((current) => ({ ...current, condition: value as PropertyDraft["condition"] }))}
            options={[
              { value: "good", label: "Bien" },
              { value: "dated", label: "Antiguo" },
              { value: "light_renovation", label: "Ligera" },
              { value: "medium_renovation", label: "Media" },
              { value: "full_renovation", label: "Integral" },
            ]}
          />
        </div>
        <div>
          <span className="subsection-title">INSTALACIONES</span>
          <div className="field-grid two">
            <TextField label="Calefacción" value={draft.features?.heating ?? ""} kind="fact" placeholder="Gas / eléctrica / no" onChange={(value) => patchFeatures(setDraft, { heating: value })} />
            <TextField label="Agua caliente" value={draft.features?.hotWater ?? ""} kind="fact" placeholder="Termo / gas…" onChange={(value) => patchFeatures(setDraft, { hotWater: value })} />
            <TextField label="Electricidad" value={draft.features?.electricity ?? ""} kind="fact" placeholder="Revisada / antigua…" onChange={(value) => patchFeatures(setDraft, { electricity: value })} />
            <TextField label="Fontanería" value={draft.features?.plumbing ?? ""} kind="fact" placeholder="Revisada / antigua…" onChange={(value) => patchFeatures(setDraft, { plumbing: value })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepMarket({
  draft,
  setDraft,
  inputs,
  updateInput,
}: {
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
}) {
  return (
    <div className="step-content">
      <div className="market-input-band">
        <NumberField label="Precio anunciado" value={inputs.purchasePrice} suffix="€" kind="fact" onChange={(value) => updateInput("purchasePrice", value)} />
        <NumberField label="Valor razonable" value={inputs.marketValueEstimate} suffix="€" kind="estimate" onChange={(value) => updateInput("marketValueEstimate", value)} />
        <NumberField label={["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? "Renta esperada" : "Alquiler esperado"} value={inputs.monthlyRent} suffix="€/mes" kind="estimate" onChange={(value) => updateInput("monthlyRent", value)} />
      </div>
      <div className="confidence-control">
        <div><span>Confianza de los datos de mercado</span><strong>{Math.round(inputs.dataConfidence * 100)}%</strong></div>
        <input type="range" min="0.2" max="1" step="0.05" value={inputs.dataConfidence} onChange={(event) => updateInput("dataConfidence", Number(event.target.value))} />
        <p>Sube la confianza solo cuando exista evidencia: comparables, tasación, alquileres equivalentes o una fuente verificable.</p>
      </div>
      <div className="field-grid two">
        <NumberField label="Días publicado" value={inputs.daysOnMarket} suffix="días" kind="fact" onChange={(value) => updateInput("daysOnMarket", value)} />
        <NumberField label="Bajadas de precio" value={inputs.priceDrops} kind="fact" onChange={(value) => updateInput("priceDrops", value)} />
      </div>
      <div className="subsection split-subsection">
        <div>
          <span className="subsection-title">ESTRATEGIA DE ALQUILER</span>
          <Choice
            value={draft.features?.rentalStrategy ?? "long_term"}
            onChange={(value) => patchFeatures(setDraft, { rentalStrategy: value })}
            options={["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? [
              { value: "commercial_lease", label: "Alquiler comercial" },
            ] : [
              { value: "long_term", label: "Larga estancia" },
              { value: "rooms", label: "Habitaciones" },
              { value: "student", label: "Estudiantes" },
            ]}
          />
        </div>
        <div>
          <span className="subsection-title">INQUILINO OBJETIVO</span>
          <TextField label={["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? "Operador / inquilino" : "Perfil"} value={draft.features?.tenantProfile ?? ""} kind="assumption" placeholder={["commercial","office","building"].includes(draft.propertyType ?? "apartment") ? "Retail, clínica, oficina, estudio…" : "Pareja joven, familia, profesional…"} onChange={(value) => patchFeatures(setDraft, { tenantProfile: value })} />
        </div>
      </div>
    </div>
  );
}

function StepPurchase({
  inputs,
  updateInput,
  analysis,
}: {
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  analysis: DealAnalysis | null;
}) {
  return (
    <div className="step-content">
      <div className="field-grid three">
        <NumberField label="ITP" value={inputs.purchaseTaxPct} suffix="%" step={0.1} kind="assumption" onChange={(value) => updateInput("purchaseTaxPct", value)} />
        <NumberField label="Notaría + registro" value={inputs.notaryRegistry} suffix="€" kind="assumption" onChange={(value) => updateInput("notaryRegistry", value)} />
        <NumberField label="Tasación" value={inputs.appraisal} suffix="€" kind="assumption" onChange={(value) => updateInput("appraisal", value)} />
      </div>
      <div className="subsection"><span className="subsection-title">PRESET EDITABLE</span><Choice value="" onChange={v=>{updateInput('ltvPct',v==='conservative'?40:v==='base'?60:75);updateInput('vacancyPct',v==='conservative'?10:5);}} options={[{value:'conservative',label:'Conservador'},{value:'base',label:'Base'},{value:'leveraged',label:'Apalancado'}]}/><Choice value={inputs.financingMode??'mortgage'} onChange={v=>updateInput('financingMode',v as DealInputs['financingMode'])} options={[{value:'cash',label:'Contado'},{value:'mortgage',label:'Hipoteca'},{value:'seller',label:'Vendedor · amortizable'}]}/></div>
      <div className="finance-block">
        <div className="finance-block-head">
          <span className="subsection-title">FINANCIACIÓN</span>
          <strong>{fmtMoney(analysis?.loanAmount)} préstamo</strong>
        </div>
        <div className="field-grid three">
          <NumberField label="LTV" value={inputs.ltvPct} suffix="%" step={0.5} kind="assumption" onChange={(value) => updateInput("ltvPct", value)} />
          <NumberField label="Interés" value={inputs.interestPct} suffix="%" step={0.05} kind="assumption" onChange={(value) => updateInput("interestPct", value)} />
          <NumberField label="Plazo" value={inputs.termYears} suffix="años" kind="assumption" onChange={(value) => updateInput("termYears", value)} />
        </div>
        <div className="finance-visual-bar">
          <i style={{ width: `${Math.min(100, inputs.ltvPct)}%` }} />
          <span>Banco {fmtPct(inputs.ltvPct)}</span>
          <span>Entrada {fmtPct(100 - inputs.ltvPct)}</span>
        </div>
      </div>
      <details className="advanced-settings"><summary>Límites de inversión y stress combinado</summary><p>Los campos vacíos no aplican. Cero es un límite explícito. La tasación limita el precio financiable con el LTV indicado.</p><div className="field-grid three">{([['availableCapital','Capital disponible €'],['minMonthlyCashFlow','Cash-flow mínimo €/mes'],['minDscr','DSCR mínimo'],['marketComparableCeiling','Techo comparables €'],['financingLoanLimit','Préstamo máximo €'],['appraisalValue','Valor de tasación €'],['unexpectedCapex','CAPEX imprevisto €']] as const).map(([key,label])=><label className="field" key={key}>{label}<input type="number" min="0" step="any" value={inputs[key]??''} onChange={e=>updateInput(key,e.target.value===''?undefined:Number(e.target.value))}/></label>)}</div><div className="field-grid three">{([['rentPct','Cambio renta %'],['vacancyPp','Vacancia adicional pp'],['ratePp','Cambio interés pp'],['renovationPct','Cambio reforma %'],['capex','CAPEX €']] as const).map(([key,label])=><label key={key}>{label}<input type="number" step="any" value={inputs.combinedStress?.[key]??''} onChange={e=>updateInput('combinedStress',{rentPct:0,vacancyPp:0,ratePp:0,renovationPct:0,capex:0,...inputs.combinedStress,[key]:Number(e.target.value)})}/></label>)}</div></details>
      <div className="field-grid two">
        <NumberField label="Otros costes financiación" value={inputs.financingFees} suffix="€" kind="assumption" onChange={(value) => updateInput("financingFees", value)} />
      </div>
    </div>
  );
}

function StepOperation({
  inputs,
  updateInput,
}: {
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
}) {
  return (
    <div className="step-content">
      <div className="field-grid three">
        <NumberField label="Comunidad" value={inputs.communityMonthly} suffix="€/mes" kind="fact" onChange={(value) => updateInput("communityMonthly", value)} />
        <NumberField label="IBI" value={inputs.ibiAnnual} suffix="€/año" kind="fact" onChange={(value) => updateInput("ibiAnnual", value)} />
        <NumberField label="Seguro" value={inputs.insuranceAnnual} suffix="€/año" kind="assumption" onChange={(value) => updateInput("insuranceAnnual", value)} />
        <NumberField label="Mantenimiento" value={inputs.maintenanceMonthly} suffix="€/mes" kind="assumption" onChange={(value) => updateInput("maintenanceMonthly", value)} />
        <NumberField label="Vacancia" value={inputs.vacancyPct} suffix="%" step={0.5} kind="assumption" onChange={(value) => updateInput("vacancyPct", value)} />
        <NumberField label="Gestión" value={inputs.managementPct} suffix="%" step={0.5} kind="assumption" onChange={(value) => updateInput("managementPct", value)} />
      </div>
      <div className="project-costs">
        <div className="panel-head">
          <div><span className="subsection-title">ANTES DE ALQUILAR</span><h3>Capital de puesta en marcha</h3></div>
          <Wrench size={17} />
        </div>
        <div className="field-grid three">
          <NumberField label="Reforma inicial" value={inputs.renovation} suffix="€" kind="estimate" onChange={(value) => updateInput("renovation", value)} />
          <NumberField label="Mobiliario" value={inputs.furniture} suffix="€" kind="estimate" onChange={(value) => updateInput("furniture", value)} />
          <NumberField label="Colchón" value={inputs.reserve} suffix="€" kind="assumption" onChange={(value) => updateInput("reserve", value)} />
        </div>
        <p>El desglose real de reforma vive después dentro del workspace de esta propiedad.</p>
      </div>
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
  editing,
}: {
  draft: PropertyDraft;
  setDraft: Dispatch<SetStateAction<PropertyDraft>>;
  inputs: DealInputs;
  updateInput: <K extends keyof DealInputs>(key: K, value: DealInputs[K]) => void;
  analysis: DealAnalysis | null;
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
  const readiness = analysisReadiness(draft, inputs);
  const canSave = readiness.calculable;
  const completedSteps = STEPS.map((_, index) => readiness.state !== "EMPTY" &&
    (index === 5 ? readiness.calculable : !readiness.missing.some(item => item.step === index)));

  let content: ReactNode;
  if (step === 0) {
    content = <StepCapture draft={draft} setDraft={setDraft} importUrl={importUrl} setImportUrl={setImportUrl} importBusy={importBusy} importMessage={importMessage} onImport={onImport} />;
  } else if (step === 1) {
    content = <StepProperty draft={draft} setDraft={setDraft} inputs={inputs} updateInput={updateInput} />;
  } else if (step === 2) {
    content = <StepMarket draft={draft} setDraft={setDraft} inputs={inputs} updateInput={updateInput} />;
  } else if (step === 3) {
    content = <StepPurchase inputs={inputs} updateInput={updateInput} analysis={analysis} />;
  } else if (step === 4) {
    content = <><StepOperation inputs={inputs} updateInput={updateInput} /><label className="cost-review"><input type="checkbox" checked={draft.features?.costsReviewed===true} onChange={e=>setDraft(current=>({...current,features:{...current.features,costsReviewed:e.target.checked}}))}/>He revisado los costes y los importes a cero</label></>;
  } else {
    content = <><DecisionSummary draft={draft} inputs={inputs} analysis={analysis} onContinue={setStep} />{analysis&&<details className="evidence-validation"><summary>Registrar evidencia verificada</summary><p>Registra una fuente comprobada para cada dato. No convierte una estimación en certeza.</p>{([ ["price","Precio"],["area","Superficie"],["rent","Alquiler"],["costs","Costes"] ] as const).map(([key,label])=><label className="field" key={key}>{label} · fuente verificada<input value={draft.features?.evidence?.[key]?.source??""} placeholder="Documento, comparable o referencia" onChange={e=>setDraft(current=>({...current,features:{...current.features,evidence:{...current.features?.evidence,[key]:{kind:"fact",source:e.target.value,observedAt:new Date().toISOString()}}}}))}/></label>)}</details>}</>;
  }

  return (
    <div className="view view-analyzer">
      <SectionHead
        eyebrow={editing ? "NUEVA VERSIÓN" : "UNDERWRITING"}
        title={editing ? `Revisar ${draft.title}` : "¿Tiene sentido esta operación?"}
      />

      <div className="analyzer-stepper">
        {STEPS.map((item, index) => (
          <button
            key={item.label}
            aria-label={item.label+" · "+item.helper}
            aria-current={step === index ? "step" : undefined}
            className={`${step === index ? "active" : ""} ${completedSteps[index] ? "done" : ""}`}
            onClick={() => setStep(index)}
          >
            <i>{completedSteps[index] ? <Check size={13} /> : item.icon}</i>
            <span><strong>{item.label}</strong></span>
          </button>
        ))}
      </div>

      <div className="analyzer-layout">
        <Panel className="analyzer-form">
          <div className="analyzer-form-head">
            <span>0{step + 1}</span>
            <div><h2>{STEPS[step].label}</h2><p>{STEPS[step].helper}</p></div>
          </div>
          {content}
          <div className="analyzer-footer">
            <button className="ghost-button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft size={14} /> Atrás
            </button>
            <div className="analyzer-footer-note">
              {step < 5
                ? ""
                : signedIn
                  ? editing
                    ? "Guardar crea una nueva versión sobre la misma propiedad."
                    : "Guardar crea el workspace de esta propiedad."
                  : "Inicia sesión para guardar."}
            </div>
            {step < 5 ? (
              <button className="primary-button" onClick={() => setStep(step + 1)}>
                Siguiente <ArrowRight size={14} />
              </button>
            ) : (
              <button className="primary-button" onClick={onSave} disabled={saving || !canSave}>
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                {signedIn ? (editing ? "Guardar versión" : "Crear workspace") : "Entrar y guardar"}
              </button>
            )}
          </div>
        </Panel>

        <aside className="decision-rail" aria-label="Contexto de la operación">
          <span className="eyebrow">OPERACIÓN</span><h3>{draft.title || "Nuevo inmueble"}</h3>
          {step !== 5 ? <DecisionSummary compact draft={draft} inputs={inputs} analysis={analysis} onContinue={setStep}/> : <><dl><div><dt>Precio</dt><dd>{inputs.purchasePrice>0?fmtMoney(inputs.purchasePrice):"—"}</dd></div><div><dt>Renta</dt><dd>{inputs.monthlyRent>0?`${fmtMoney(inputs.monthlyRent)}/mes`:"—"}</dd></div><div><dt>Superficie</dt><dd>{inputs.builtAreaM2>0?`${inputs.builtAreaM2} m²`:"—"}</dd></div></dl><button className="ghost-button" onClick={()=>setStep(0)}>Revisar datos</button></>}
        </aside>
      </div>
    </div>
  );
}
