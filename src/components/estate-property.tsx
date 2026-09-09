"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCheck2,
  Gauge,
  Hammer,
  Home,
  Landmark,
  Loader2,
  MapPin,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { EstateRisk, EstateStage, PropertyImage, RenovationItem, SavedDeal, ZoneAssessment } from "@/lib/estate-store";
import {
  deletePropertyImage,
  deleteRenovationItem,
  saveRenovationItem,
  saveRisk,
  setRiskResolved,
  updatePropertyImageAssessment,
  updatePropertyWorkspace,
  uploadPropertyImage,
} from "@/lib/estate-store";
import {
  completenessForDeal,
  DataMeter,
  dealInput,
  dealOutput,
  EvidenceChip,
  ExternalAnchor,
  fmtMoney,
  fmtPct,
  KpiBar,
  Metric,
  Panel,
  RiskFlag,
  ScoreDial,
  stageLabel,
  StatusPill,
} from "@/components/estate-primitives";

type PropertyTab = "decision" | "property" | "zone" | "returns" | "renovation" | "risk" | "plan";

const TABS: Array<{ key: PropertyTab; label: string }> = [
  { key: "decision", label: "Decisión" },
  { key: "property", label: "Inmueble" },
  { key: "zone", label: "Zona" },
  { key: "returns", label: "Rentabilidad" },
  { key: "renovation", label: "Reforma" },
  { key: "risk", label: "Riesgos" },
  { key: "plan", label: "Plan" },
];

function missingEvidence(deal: SavedDeal) {
  const input = dealInput(deal);
  const zone = deal.features?.zone;
  const items: Array<{ label: string; tab: PropertyTab; critical?: boolean }> = [];
  if (!deal.address) items.push({ label: "Dirección exacta / microzona", tab: "property" });
  if (!deal.usable_area_m2) items.push({ label: "Superficie útil", tab: "property" });
  if (deal.bathrooms === null) items.push({ label: "Número de baños", tab: "property" });
  if (!deal.features?.electricity) items.push({ label: "Estado de instalación eléctrica", tab: "property", critical: true });
  if (!deal.features?.plumbing) items.push({ label: "Estado de fontanería", tab: "property", critical: true });
  if (!input?.marketValueEstimate) items.push({ label: "Valor de mercado contrastado", tab: "returns", critical: true });
  if (!input?.monthlyRent) items.push({ label: "Alquiler contrastado", tab: "returns", critical: true });
  if (typeof zone?.mobility !== "number") items.push({ label: "Movilidad y transporte", tab: "zone" });
  if (typeof zone?.amenities !== "number") items.push({ label: "Servicios cercanos", tab: "zone" });
  if (typeof zone?.rentalDemand !== "number") items.push({ label: "Demanda de alquiler", tab: "zone", critical: true });
  if (!(deal.estate_property_images?.length ?? 0)) items.push({ label: "Fotos revisadas", tab: "property" });
  if (!(deal.estate_risks?.length ?? 0)) items.push({ label: "Registro de riesgos / due diligence", tab: "risk" });
  return items;
}

function nextStageAction(deal: SavedDeal) {
  const blockers = (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at);
  if (blockers.length) return { label: "No avanzar", detail: `Resuelve ${blockers.length} riesgo${blockers.length > 1 ? "s" : ""} bloqueante${blockers.length > 1 ? "s" : ""}.`, tone: "bad" as const };
  const completeness = completenessForDeal(deal);
  if (completeness < 65) return { label: "Completar evidencia", detail: `Ficha al ${completeness}%. Primero reduce incertidumbre.`, tone: "warn" as const };
  if (deal.stage === "watchlist") return { label: "Pasar a análisis", detail: "La oportunidad merece underwriting completo.", tone: "accent" as const };
  if (deal.stage === "analyzing") return { label: "Validar para visita", detail: "Contrasta zona, fotos y comparables antes de desplazarte.", tone: "accent" as const };
  if (deal.stage === "visit") return { label: "Ejecutar checklist de visita", detail: "Instalaciones, luz, ruido, comunidad y mediciones.", tone: "accent" as const };
  if (deal.stage === "negotiating") return { label: "Preparar oferta", detail: "Ancla por debajo del máximo y justifica cada ajuste.", tone: "accent" as const };
  if (deal.stage === "purchased") return { label: "Convertir estimaciones en presupuesto real", detail: "Desglosa reforma y prepara salida a alquiler.", tone: "good" as const };
  if (deal.stage === "managed") return { label: "Medir real vs. previsto", detail: "Actualiza renta, vacancia, gastos y mantenimiento.", tone: "good" as const };
  return { label: "Revisar", detail: stageLabel(deal.stage), tone: "neutral" as const };
}

function zoneAverage(zone?: ZoneAssessment) {
  if (!zone) return null;
  const values = [zone.mobility, zone.amenities, zone.safety, zone.rentalDemand, zone.liquidity, zone.light]
    .filter((value): value is number => typeof value === "number");
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function PropertyHero({ deal, onBack, onReanalyze, onStageChange }: { deal: SavedDeal; onBack: () => void; onReanalyze: () => void; onStageChange: (stage: EstateStage) => void }) {
  const out = dealOutput(deal);
  const input = dealInput(deal);
  const blockers = (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at).length;
  return (
    <div className="property-hero">
      <button className="back-button" onClick={onBack}><ArrowLeft size={14} /> Oportunidades</button>
      <div className="property-hero-main">
        <div className="property-identity">
          <div className="property-icon"><Building2 size={21} /></div>
          <div><div className="property-title-line"><h1>{deal.title}</h1><StatusPill tone={blockers ? "bad" : "neutral"}>{blockers ? `${blockers} bloqueante${blockers > 1 ? "s" : ""}` : stageLabel(deal.stage)}</StatusPill></div><p><MapPin size={13} />{[deal.address, deal.municipality, deal.province].filter(Boolean).join(" · ") || "Ubicación pendiente"}</p></div>
        </div>
        <div className="property-hero-actions">
          <select value={deal.stage} onChange={(event) => onStageChange(event.target.value as EstateStage)} aria-label="Etapa de la operación"><option value="watchlist">Radar</option><option value="analyzing">Análisis</option><option value="visit">Visita</option><option value="negotiating">Negociación</option><option value="purchased">Comprada</option><option value="managed">En cartera</option><option value="discarded">Descartada</option><option value="sold">Vendida</option></select>
          <button className="ghost-button" onClick={onReanalyze}><Sparkles size={14} /> Reanalizar</button>
        </div>
      </div>
      <div className="property-hero-kpis">
        <div className="hero-score">{out ? <ScoreDial score={out.score} label={out.verdict} size="md" /> : <ScoreDial score={0} label="Sin análisis" size="md" />}</div>
        <Metric label="Precio" value={fmtMoney(input?.purchasePrice)} />
        <Metric label="Yield neta" value={fmtPct(out?.netYieldPct)} />
        <Metric label="Cash-flow" value={`${fmtMoney(out?.netMonthlyCashFlow)}/mes`} tone={(out?.netMonthlyCashFlow ?? 0) >= 0 ? "good" : "bad"} />
        <Metric label="Máximo" value={fmtMoney(out?.maxPurchasePrice)} tone="accent" />
        <div className="hero-data-meter"><DataMeter value={completenessForDeal(deal)} label="ficha" /></div>
      </div>
    </div>
  );
}

export function PropertyWorkspace({
  user,
  deal,
  onBack,
  onReanalyze,
  onStageChange,
  onRefresh,
}: {
  user: User;
  deal: SavedDeal;
  onBack: () => void;
  onReanalyze: () => void;
  onStageChange: (stage: EstateStage) => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<PropertyTab>("decision");
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try { await task(); await onRefresh(); } finally { setBusy(false); }
  }

  return (
    <div className="view view-property">
      <PropertyHero deal={deal} onBack={onBack} onReanalyze={onReanalyze} onStageChange={onStageChange} />
      <div className="property-tabs" role="tablist">{TABS.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}{item.key === "risk" && (deal.estate_risks?.filter((risk) => !risk.resolved_at).length ?? 0) > 0 ? <b>{deal.estate_risks?.filter((risk) => !risk.resolved_at).length}</b> : null}</button>)}</div>
      {busy && <div className="workspace-busy"><Loader2 size={14} className="spin" /> Guardando…</div>}

      {tab === "decision" && <DecisionTab deal={deal} onGo={setTab} />}
      {tab === "property" && <PropertyTabView user={user} deal={deal} run={run} />}
      {tab === "zone" && <ZoneTab user={user} deal={deal} run={run} />}
      {tab === "returns" && <ReturnsTab deal={deal} />}
      {tab === "renovation" && <RenovationTab user={user} deal={deal} run={run} />}
      {tab === "risk" && <RiskTab user={user} deal={deal} run={run} />}
      {tab === "plan" && <PlanTab deal={deal} onStageChange={onStageChange} />}
    </div>
  );
}

function DecisionTab({ deal, onGo }: { deal: SavedDeal; onGo: (tab: PropertyTab) => void }) {
  const out = dealOutput(deal);
  const input = dealInput(deal);
  const missing = missingEvidence(deal);
  const action = nextStageAction(deal);
  const blockers = (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at);
  return (
    <div className="workspace-grid decision-workspace">
      <Panel className={`decision-command command-${action.tone}`}>
        <span className="eyebrow">SIGUIENTE DECISIÓN</span>
        <h2>{action.label}</h2><p>{action.detail}</p>
        <div className="command-price"><span>Precio pedido <b>{fmtMoney(input?.purchasePrice)}</b></span><ArrowRight size={14} /><span>Límite Estate <b>{fmtMoney(out?.maxPurchasePrice)}</b></span></div>
        {out?.recommendedOpeningOffer ? <div className="opening-offer"><CircleDollarSign size={15} /><span>Apertura orientativa</span><strong>{fmtMoney(out.recommendedOpeningOffer)}</strong><small>no es una tasación ni una oferta automática</small></div> : null}
      </Panel>

      <Panel className="evidence-debt">
        <div className="panel-head"><div><span className="eyebrow">DATA DEBT</span><h3>Qué falta verificar</h3></div><Database size={17} /></div>
        <div className="evidence-list">
          {missing.slice(0, 7).map((item) => <button key={item.label} onClick={() => onGo(item.tab)}><span className={item.critical ? "critical" : ""}>{item.critical ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}</span><strong>{item.label}</strong><small>{item.critical ? "clave" : "pendiente"}</small><ArrowRight size={13} /></button>)}
          {!missing.length && <div className="evidence-complete"><CheckCircle2 size={18} /><div><strong>Ficha suficientemente completa.</strong><p>Ahora la incertidumbre principal debería venir de la realidad de mercado, visita y documentación.</p></div></div>}
        </div>
      </Panel>

      <Panel className="decision-stress">
        <div className="panel-head"><div><span className="eyebrow">STRESS TEST</span><h3>Intentar romper la operación</h3></div><Gauge size={17} /></div>
        <div className="stress-cards">{out?.stress.filter((scenario) => scenario.key !== "base").map((scenario) => <div className={scenario.passes ? "pass" : "fail"} key={scenario.key}><span>{scenario.label}</span><strong>{fmtMoney(scenario.monthlyCashFlow)}</strong><small>{scenario.dscr === null ? "sin deuda" : `DSCR ${scenario.dscr.toFixed(2)}×`}</small></div>) ?? <p>Sin análisis.</p>}</div>
      </Panel>

      <Panel className="decision-risks-mini">
        <div className="panel-head"><div><span className="eyebrow">KILL SWITCH</span><h3>Bloqueantes</h3></div><ShieldAlert size={17} /></div>
        {blockers.length ? <div className="risk-stack">{blockers.map((risk) => <RiskFlag key={risk.id} title={risk.title} kill severity={risk.severity} />)}</div> : <div className="risk-clear"><Check size={18} /><div><strong>Sin bloqueantes abiertos.</strong><p>Eso no significa “sin riesgo”; significa que ninguno ha sido marcado como impeditivo.</p></div></div>}
        <button className="text-link button-link" onClick={() => onGo("risk")}>Abrir due diligence <ArrowRight size={13} /></button>
      </Panel>
    </div>
  );
}

function PropertyTabView({ user, deal, run }: { user: User; deal: SavedDeal; run: (task: () => Promise<void>) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const images = deal.estate_property_images ?? [];
  const input = dealInput(deal);
  const mapQuery = encodeURIComponent([deal.address, deal.municipality, deal.province].filter(Boolean).join(", "));

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 12)) await uploadPropertyImage(user, deal.id, file);
      await run(async () => Promise.resolve());
    } finally { setUploading(false); event.target.value = ""; }
  }

  return (
    <div className="workspace-grid property-facts-workspace">
      <Panel className="facts-panel">
        <div className="panel-head"><div><span className="eyebrow">FICHA FÍSICA</span><h3>Qué existe realmente</h3></div><Home size={17} /></div>
        <div className="fact-grid">
          <Fact label="Construidos" value={deal.built_area_m2 ? `${deal.built_area_m2} m²` : "Sin dato"} />
          <Fact label="Útiles" value={deal.usable_area_m2 ? `${deal.usable_area_m2} m²` : "Sin dato"} />
          <Fact label="Dormitorios" value={deal.bedrooms ?? "Sin dato"} />
          <Fact label="Baños" value={deal.bathrooms ?? "Sin dato"} />
          <Fact label="Planta" value={deal.floor_label || "Sin dato"} />
          <Fact label="Ascensor" value={deal.has_elevator === null ? "Sin verificar" : deal.has_elevator ? "Sí" : "No"} />
          <Fact label="Año" value={deal.year_built || "Sin dato"} />
          <Fact label="Energía" value={deal.energy_rating || "Sin dato"} />
          <Fact label="Orientación" value={deal.orientation || "Sin dato"} />
          <Fact label="Estado" value={deal.condition?.replaceAll("_", " ") || "Sin dato"} />
          <Fact label="Terraza" value={deal.has_terrace === null ? "Sin verificar" : deal.has_terrace ? "Sí" : "No"} />
          <Fact label="Garaje" value={deal.has_garage === null ? "Sin verificar" : deal.has_garage ? "Sí" : "No"} />
        </div>
        <button className="ghost-button" onClick={() => run(() => updatePropertyWorkspace(user, deal.id, { notes: deal.notes }))}><Save size={13} /> Ficha sincronizada</button>
      </Panel>

      <Panel className="utilities-panel">
        <div className="panel-head"><div><span className="eyebrow">INSTALACIONES</span><h3>Lo caro de descubrir tarde</h3></div><Wrench size={17} /></div>
        <div className="utility-list">
          <Utility label="Electricidad" value={deal.features?.electricity} />
          <Utility label="Fontanería" value={deal.features?.plumbing} />
          <Utility label="Calefacción" value={deal.features?.heating} />
          <Utility label="Agua caliente" value={deal.features?.hotWater} />
          <Utility label="Climatización" value={deal.features?.cooling} />
          <Utility label="Gas" value={deal.features?.gas === null || deal.features?.gas === undefined ? undefined : deal.features.gas ? "Sí" : "No"} />
          <Utility label="Internet" value={deal.features?.internet} />
          <Utility label="Comunidad" value={input?.communityMonthly ? `${fmtMoney(input.communityMonthly)}/mes` : undefined} />
        </div>
        <div className="utility-warning"><AlertTriangle size={14} /><span>Una instalación “sin dato” debe tratarse como incertidumbre, no como buen estado.</span></div>
      </Panel>

      <Panel className="photo-desk">
        <div className="panel-head"><div><span className="eyebrow">PHOTO DESK</span><h3>Revisar lo que el anuncio enseña — y lo que oculta</h3></div><label className="upload-button"><input type="file" accept="image/*" multiple onChange={handleUpload} />{uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Subir fotos</label></div>
        {images.length ? <div className="photo-grid">{images.map((image) => <PhotoCard key={image.id} user={user} image={image} run={run} />)}</div> : <div className="photo-empty"><Camera size={27} /><div><strong>Añade fotos de anuncio o visita.</strong><p>Estate ya conserva cada imagen por propiedad y permite etiquetar estancia y estado. El análisis visual automático quedará separado de la valoración financiera para no fingir precisión sin proveedor AI configurado.</p></div></div>}
      </Panel>

      <Panel className="address-panel">
        <div className="panel-head"><div><span className="eyebrow">UBICACIÓN</span><h3>{deal.address || deal.municipality || "Sin dirección"}</h3></div><MapPin size={17} /></div>
        <p>La dirección exacta enlaza el inmueble con su microzona. Sin coordenadas o un proveedor geoespacial no se inventan distancias ni servicios cercanos.</p>
        {mapQuery && <ExternalAnchor href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}>Abrir en Google Maps</ExternalAnchor>}
      </Panel>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) { return <div className="fact"><span>{label}</span><strong>{value}</strong><EvidenceChip kind="fact" /></div>; }
function Utility({ label, value }: { label: string; value?: string }) { return <div className="utility-row"><span>{label}</span><strong className={!value ? "missing" : ""}>{value || "Sin verificar"}</strong></div>; }

function PhotoCard({ user, image, run }: { user: User; image: PropertyImage; run: (task: () => Promise<void>) => Promise<void> }) {
  return <article className="photo-card"><div className="photo-frame">{image.preview_url ? <img src={image.preview_url} alt={image.room_type || "Foto del inmueble"} /> : <Camera size={22} />}<button onClick={() => run(() => deletePropertyImage(user, image))} aria-label="Eliminar foto"><Trash2 size={12} /></button></div><select value={image.room_type || "unknown"} onChange={(event) => run(() => updatePropertyImageAssessment(user, image.id, { room_type: event.target.value }))}><option value="unknown">Sin estancia</option><option value="living_room">Salón</option><option value="kitchen">Cocina</option><option value="bedroom">Dormitorio</option><option value="bathroom">Baño</option><option value="facade">Fachada</option><option value="common_area">Comunes</option><option value="terrace">Terraza</option></select><label><span>Estado {image.condition_score ?? "—"}/100</span><input type="range" min="0" max="100" step="5" value={image.condition_score ?? 50} onChange={(event) => run(() => updatePropertyImageAssessment(user, image.id, { condition_score: Number(event.target.value), analysis: { ...(image.analysis ?? {}), status: "manual_reviewed" }, confidence: 1 }))} /></label></article>;
}

function ZoneTab({ user, deal, run }: { user: User; deal: SavedDeal; run: (task: () => Promise<void>) => Promise<void> }) {
  const [zone, setZone] = useState<ZoneAssessment>(deal.features?.zone ?? {});
  const nearbyOptions = ["Supermercado", "Centro salud", "Colegio", "Parada bus", "Aparcamiento", "Gimnasio", "Zonas verdes", "Comercio", "Universidad/FP", "Polígono/empleo"];
  const average = zoneAverage(zone);
  function toggleNearby(item: string) { setZone((current) => ({ ...current, nearby: (current.nearby ?? []).includes(item) ? (current.nearby ?? []).filter((value) => value !== item) : [...(current.nearby ?? []), item] })); }
  async function save() { await run(() => updatePropertyWorkspace(user, deal.id, { features: { ...(deal.features ?? {}), zone } })); }
  return (
    <div className="workspace-grid zone-workspace">
      <Panel className="zone-scorecard">
        <div className="zone-score-hero"><div><span className="eyebrow">MICROZONA</span><h2>{deal.municipality || "Zona pendiente"}</h2><p>Evaluación manual y trazable hasta conectar fuentes geoespaciales.</p></div><div className="zone-score-number"><strong>{average === null ? "—" : Math.round(average)}</strong><span>/100</span></div></div>
        <KpiBar items={[{ label: "Movilidad", value: zone.mobility ?? null }, { label: "Servicios", value: zone.amenities ?? null }, { label: "Seguridad percibida", value: zone.safety ?? null }, { label: "Demanda alquiler", value: zone.rentalDemand ?? null }, { label: "Liquidez salida", value: zone.liquidity ?? null }, { label: "Luz", value: zone.light ?? null }, { label: "Ruido", value: zone.noise ?? null, invert: true }]} />
      </Panel>
      <Panel className="zone-editor">
        <div className="panel-head"><div><span className="eyebrow">EVALUACIÓN</span><h3>Valida la zona con evidencia</h3></div><Landmark size={17} /></div>
        {([['mobility','Movilidad / transporte'],['amenities','Servicios cercanos'],['safety','Seguridad percibida'],['rentalDemand','Demanda de alquiler'],['liquidity','Liquidez de reventa'],['light','Luz / orientación urbana'],['noise','Ruido / molestias']] as const).map(([key,label]) => <label className="range-field zone-range" key={key}><span>{label}<strong>{typeof zone[key] === "number" ? zone[key] : "—"}</strong></span><input type="range" min="0" max="100" step="5" value={typeof zone[key] === "number" ? zone[key]! : 50} onChange={(event) => setZone((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
        <button className="primary-button" onClick={save}><Save size={14} /> Guardar evaluación</button>
      </Panel>
      <Panel className="nearby-panel">
        <div className="panel-head"><div><span className="eyebrow">A 15 MINUTOS</span><h3>Qué hace vivible la ubicación</h3></div><MapPin size={17} /></div>
        <div className="nearby-chips">{nearbyOptions.map((item) => <button key={item} className={(zone.nearby ?? []).includes(item) ? "active" : ""} onClick={() => toggleNearby(item)}>{(zone.nearby ?? []).includes(item) && <Check size={12} />}{item}</button>)}</div>
        <label className="notes-field"><span>Notas / evidencias</span><textarea value={zone.notes ?? ""} onChange={(event) => setZone((current) => ({ ...current, notes: event.target.value }))} placeholder="Ej.: bus cada 30 min, Mercadona a 8 min andando, calle ruidosa viernes noche…" /></label>
      </Panel>
      <Panel className="tenant-fit">
        <div className="panel-head"><div><span className="eyebrow">TENANT FIT</span><h3>¿Para quién funciona esta zona?</h3></div><Users size={17} /></div>
        <p><strong>Perfil objetivo:</strong> {deal.features?.tenantProfile || "Sin definir"}</p><p><strong>Estrategia:</strong> {deal.features?.rentalStrategy === "rooms" ? "Habitaciones" : deal.features?.rentalStrategy === "student" ? "Estudiantes" : "Larga estancia"}</p><div className="tenant-fit-rule">La renta no se valida solo por €/m²: debe existir un inquilino razonable para ese producto y esa microzona.</div>
      </Panel>
    </div>
  );
}

function ReturnsTab({ deal }: { deal: SavedDeal }) {
  const input = dealInput(deal); const out = dealOutput(deal);
  if (!input || !out) return <Panel><p>Esta propiedad no tiene un análisis guardado.</p></Panel>;
  const vacancyLoss = input.monthlyRent - out.effectiveRentMonthly;
  const operating = out.operatingExpensesMonthly;
  return (
    <div className="workspace-grid returns-workspace">
      <Panel className="cashflow-waterfall">
        <div className="panel-head"><div><span className="eyebrow">CASH-FLOW WATERFALL</span><h3>De la renta al bolsillo</h3></div><CircleDollarSign size={17} /></div>
        <div className="waterfall"><Waterfall label="Alquiler" value={input.monthlyRent} base={input.monthlyRent} tone="income" /><Waterfall label="Vacancia" value={-vacancyLoss} base={input.monthlyRent} tone="cost" /><Waterfall label="Gastos operativos" value={-operating} base={input.monthlyRent} tone="cost" /><Waterfall label="NOI" value={out.noiMonthly} base={input.monthlyRent} tone="subtotal" /><Waterfall label="Hipoteca" value={-out.mortgageMonthly} base={input.monthlyRent} tone="cost" /><Waterfall label="Cash-flow" value={out.netMonthlyCashFlow} base={input.monthlyRent} tone={out.netMonthlyCashFlow >= 0 ? "result" : "negative"} /></div>
      </Panel>
      <Panel className="returns-metrics"><div className="panel-head"><div><span className="eyebrow">RETORNOS</span><h3>Las métricas que importan</h3></div><Gauge size={17} /></div><div className="returns-grid"><Metric label="Yield bruta" value={fmtPct(out.grossYieldPct)} /><Metric label="Yield neta" value={fmtPct(out.netYieldPct)} tone="accent" /><Metric label="Cash-on-cash" value={fmtPct(out.cashOnCashPct)} /><Metric label="Cap rate" value={fmtPct(out.capRatePct)} /><Metric label="DSCR" value={out.dscr === null ? "—" : `${out.dscr.toFixed(2)}×`} /><Metric label="Capital Velocity" value={out.capitalVelocityMonths === null ? "—" : `${out.capitalVelocityMonths} meses`} /></div></Panel>
      <Panel className="capital-stack"><div className="panel-head"><div><span className="eyebrow">CAPITAL STACK</span><h3>Qué dinero se inmoviliza</h3></div><Database size={17} /></div><div className="capital-stack-bar"><i className="loan" style={{ width: `${Math.min(100, input.ltvPct)}%` }} /><i className="equity" style={{ width: `${Math.max(0,100-input.ltvPct)}%` }} /></div><div className="capital-stack-list"><span><i className="loan-dot" />Préstamo <b>{fmtMoney(out.loanAmount)}</b></span><span><i className="equity-dot" />Entrada <b>{fmtMoney(out.downPayment)}</b></span><span><i className="cost-dot" />Adquisición <b>{fmtMoney(out.acquisitionCosts)}</b></span><span><i className="project-dot" />Proyecto <b>{fmtMoney(out.projectCosts)}</b></span><span className="total"><strong>Capital total</strong><b>{fmtMoney(out.capitalRequired)}</b></span></div></Panel>
      <Panel className="price-ceiling-card"><span className="eyebrow">DISCIPLINA DE PRECIO</span><div className="ceiling-number"><span>Máximo compatible con objetivo</span><strong>{fmtMoney(out.maxPurchasePrice)}</strong></div><div className="ceiling-compare"><span>Pedido {fmtMoney(input.purchasePrice)}</span><i /><span>Mercado {fmtMoney(input.marketValueEstimate)}</span></div><p>El precio máximo es un output de tu objetivo de rentabilidad; no es una tasación oficial.</p></Panel>
    </div>
  );
}
function Waterfall({ label, value, base, tone }: { label: string; value: number; base: number; tone: string }) { const width = Math.max(3, Math.min(100, Math.abs(value) / Math.max(1, base) * 100)); return <div className={`waterfall-row waterfall-${tone}`}><span>{label}</span><div><i style={{ width: `${width}%` }} /></div><strong>{value >= 0 ? "+" : "−"}{fmtMoney(Math.abs(value))}</strong></div>; }

function RenovationTab({ user, deal, run }: { user: User; deal: SavedDeal; run: (task: () => Promise<void>) => Promise<void> }) {
  const items = deal.estate_renovation_items ?? [];
  const input = dealInput(deal);
  const [category, setCategory] = useState("Cocina"); const [mode, setMode] = useState<"pro"|"diy"|"hybrid">("hybrid"); const [cost, setCost] = useState(0); const [uplift, setUplift] = useState(0); const [required, setRequired] = useState(false);
  const total = items.reduce((sum,item) => sum + (item.mode === "pro" ? item.pro_cost : item.mode === "diy" ? item.diy_material_cost : item.hybrid_cost),0);
  const rentUplift = items.reduce((sum,item) => sum + item.estimated_rent_uplift_monthly,0);
  async function add() { if (!category.trim() || cost <= 0) return; await run(() => saveRenovationItem(user, deal.id, { category, mode, pro_cost: mode === "pro" ? cost : 0, diy_material_cost: mode === "diy" ? cost : 0, hybrid_cost: mode === "hybrid" ? cost : 0, estimated_rent_uplift_monthly: uplift, professional_required: required, confidence: 0.5 })); setCost(0); setUplift(0); }
  return (
    <div className="workspace-grid renovation-workspace">
      <Panel className="reno-summary"><div><span className="eyebrow">RENOVATION ENGINE</span><h2>{fmtMoney(total || input?.renovation || 0)}</h2><p>{items.length ? `${items.length} partidas reales/estimadas` : "provisión del underwriting, todavía sin desglosar"}</p></div><div className="reno-summary-kpis"><Metric label="Uplift alquiler" value={`+${fmtMoney(rentUplift)}/mes`} tone="good" /><Metric label="Partidas PRO" value={items.filter((item) => item.professional_required).length} /><Metric label="Confianza" value={items.length ? `${Math.round(items.reduce((sum,item)=>sum+item.confidence,0)/items.length*100)}%` : "—"} /></div></Panel>
      <Panel className="reno-breakdown"><div className="panel-head"><div><span className="eyebrow">PARTIDAS</span><h3>Presupuesto por decisión, no por porcentaje</h3></div><Hammer size={17} /></div>{items.length ? <div className="reno-items">{items.map((item) => { const itemCost = item.mode === "pro" ? item.pro_cost : item.mode === "diy" ? item.diy_material_cost : item.hybrid_cost; return <div className="reno-item" key={item.id}><div><strong>{item.category}</strong><span>{item.mode.toUpperCase()} {item.professional_required ? "· profesional obligatorio" : ""}</span></div><div className="reno-item-bar"><i style={{ width: `${Math.min(100,itemCost/Math.max(1,...items.map((row)=>row.mode==='pro'?row.pro_cost:row.mode==='diy'?row.diy_material_cost:row.hybrid_cost))*100)}%` }} /></div><b>{fmtMoney(itemCost)}</b><small>{item.estimated_rent_uplift_monthly ? `+${fmtMoney(item.estimated_rent_uplift_monthly)}/mes` : "sin uplift probado"}</small><button onClick={() => run(() => deleteRenovationItem(user,item.id))}><Trash2 size={12} /></button></div>; })}</div> : <div className="reno-empty"><Hammer size={25} /><div><strong>La provisión de reforma aún es una sola cifra.</strong><p>Desglósala por cocina, baño, electricidad, pintura, suelo, ventanas, mobiliario… Cada partida puede ser PRO, DIY o híbrida.</p></div></div>}</Panel>
      <Panel className="reno-add"><div className="panel-head"><div><span className="eyebrow">NUEVA PARTIDA</span><h3>Convertir incertidumbre en presupuesto</h3></div><Plus size={17} /></div><label className="field"><span className="field-label">Categoría</span><div className="input-shell"><input value={category} onChange={(event)=>setCategory(event.target.value)} /></div></label><div className="choice-row"><button className={mode==="diy"?"active":""} onClick={()=>setMode("diy")}>DIY</button><button className={mode==="hybrid"?"active":""} onClick={()=>setMode("hybrid")}>Híbrido</button><button className={mode==="pro"?"active":""} onClick={()=>setMode("pro")}>PRO</button></div><label className="field"><span className="field-label">Coste</span><div className="input-shell"><input type="number" min="0" value={cost||""} onChange={(event)=>setCost(Number(event.target.value))}/><small>€</small></div></label><label className="field"><span className="field-label">Uplift alquiler esperado</span><div className="input-shell"><input type="number" min="0" value={uplift||""} onChange={(event)=>setUplift(Number(event.target.value))}/><small>€/mes</small></div></label><button className={`boolean-card ${required?"active":""}`} onClick={()=>setRequired(!required)}><span>Profesional obligatorio</span><i>{required?<Check size={12}/>:null}</i></button><button className="primary-button" onClick={add}><Plus size={14}/> Añadir partida</button></Panel>
    </div>
  );
}

function RiskTab({ user, deal, run }: { user: User; deal: SavedDeal; run: (task: () => Promise<void>) => Promise<void> }) {
  const risks = deal.estate_risks ?? []; const [title,setTitle]=useState(""); const [category,setCategory]=useState("technical"); const [severity,setSeverity]=useState(50); const [kill,setKill]=useState(false);
  async function add(){ if(!title.trim())return; await run(()=>saveRisk(user,deal.id,{title:title.trim(),category,severity,is_kill_switch:kill,confidence:0.7,source:"manual"}));setTitle("");setSeverity(50);setKill(false); }
  const due = [
    { label:"Nota simple y titularidad", done: risks.some((r)=>r.category==="legal" && r.resolved_at) },
    { label:"Cargas / deudas comunidad", done: risks.some((r)=>r.category==="community" && r.resolved_at) },
    { label:"ITE / edificio / derramas", done: risks.some((r)=>r.category==="building" && r.resolved_at) },
    { label:"Instalación eléctrica", done: Boolean(deal.features?.electricity) },
    { label:"Fontanería / humedades", done: Boolean(deal.features?.plumbing) },
    { label:"Situación ocupacional", done: false },
  ];
  return <div className="workspace-grid risk-workspace"><Panel className="risk-register"><div className="panel-head"><div><span className="eyebrow">RISK REGISTER</span><h3>Riesgos con dueño y estado</h3></div><ShieldAlert size={17}/></div>{risks.length?<div className="risk-register-list">{risks.map((risk)=><div className={`risk-record ${risk.is_kill_switch?"kill":""} ${risk.resolved_at?"resolved":""}`} key={risk.id}><button onClick={()=>run(()=>setRiskResolved(user,risk.id,!risk.resolved_at))}>{risk.resolved_at?<Check size={13}/>:<AlertTriangle size={13}/>}</button><div><strong>{risk.title}</strong><span>{risk.category} · confianza {Math.round(risk.confidence*100)}%</span></div><b>{risk.is_kill_switch?"KILL SWITCH":`${risk.severity}/100`}</b></div>)}</div>:<div className="risk-clear"><CheckCircle2 size={20}/><div><strong>No has registrado riesgos.</strong><p>Esto no significa que no existan. Registra también lo que necesitas descartar.</p></div></div>}</Panel><Panel className="due-diligence"><div className="panel-head"><div><span className="eyebrow">DUE DILIGENCE</span><h3>Checklist mínimo antes de comprar</h3></div><ClipboardCheck size={17}/></div><div className="due-list">{due.map((item)=><div key={item.label} className={item.done?"done":""}><i>{item.done?<Check size={12}/>:null}</i><span>{item.label}</span><small>{item.done?"evidencia registrada":"pendiente"}</small></div>)}</div><p>El Legal Kill Switch debe bloquear una compra cuando aparezca un riesgo jurídico/técnico que no encaje con tu tolerancia.</p></Panel><Panel className="risk-add"><div className="panel-head"><div><span className="eyebrow">REGISTRAR</span><h3>Añadir riesgo</h3></div><Plus size={17}/></div><label className="field"><span className="field-label">Riesgo</span><div className="input-shell"><input value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="Ej.: posible derrama fachada"/></div></label><label className="field"><span className="field-label">Categoría</span><select value={category} onChange={(event)=>setCategory(event.target.value)}><option value="legal">Legal</option><option value="technical">Técnico</option><option value="building">Edificio</option><option value="community">Comunidad</option><option value="market">Mercado</option><option value="tenant">Alquiler</option><option value="environmental">Ambiental</option></select></label><label className="range-field"><span>Severidad <strong>{severity}</strong></span><input type="range" min="0" max="100" step="5" value={severity} onChange={(event)=>setSeverity(Number(event.target.value))}/></label><button className={`boolean-card ${kill?"active danger":""}`} onClick={()=>setKill(!kill)}><span>Bloquea la compra</span><i>{kill?<X size={12}/>:null}</i></button><button className="primary-button" onClick={add}><Plus size={14}/> Añadir riesgo</button></Panel></div>;
}

function PlanTab({ deal, onStageChange }: { deal: SavedDeal; onStageChange: (stage: EstateStage) => void }) {
  const input=dealInput(deal); const out=dealOutput(deal); const strategy=deal.features?.rentalStrategy ?? "long_term"; const profile=deal.features?.tenantProfile || "por definir";
  const channels = strategy === "student" ? ["Centros universitarios/FP","Portales generalistas","Grupos locales verificados","Agencias de la zona"] : strategy === "rooms" ? ["Portales de habitaciones","Red local / referencias","Centros de estudio/empleo","Agencias especializadas"] : ["Portales generalistas","Agencias locales","Red de referencias","Empresas / relocation local"];
  const stages: Array<{key:EstateStage;label:string;task:string}>=[{key:"watchlist",label:"Radar",task:"Capturar y descartar rápido"},{key:"analyzing",label:"Análisis",task:"Validar números, zona y evidencia"},{key:"visit",label:"Visita",task:"Comprobar realidad física"},{key:"negotiating",label:"Negociar",task:"Definir apertura, máximo y condiciones"},{key:"purchased",label:"Comprar",task:"Cerrar due diligence y ejecutar"},{key:"managed",label:"Operar",task:"Alquilar y medir real vs. previsto"}];
  const index=stages.findIndex((stage)=>stage.key===deal.stage);
  return <div className="workspace-grid plan-workspace"><Panel className="execution-timeline"><div className="panel-head"><div><span className="eyebrow">EXECUTION PLAN</span><h3>La operación como procedimiento</h3></div><FileCheck2 size={17}/></div><div className="timeline-list">{stages.map((stage,i)=><button key={stage.key} className={`${i<index?"done":""} ${i===index?"current":""}`} onClick={()=>onStageChange(stage.key)}><i>{i<index?<Check size={12}/>:String(i+1).padStart(2,"0")}</i><div><strong>{stage.label}</strong><span>{stage.task}</span></div>{i===index&&<StatusPill tone="accent">Ahora</StatusPill>}</button>)}</div></Panel><Panel className="negotiation-plan"><div className="panel-head"><div><span className="eyebrow">NEGOCIACIÓN</span><h3>Precio y argumento</h3></div><CircleDollarSign size={17}/></div><div className="negotiation-numbers"><Metric label="Pide" value={fmtMoney(input?.purchasePrice)}/><Metric label="Apertura orientativa" value={fmtMoney(out?.recommendedOpeningOffer)} tone="accent"/><Metric label="Máximo" value={fmtMoney(out?.maxPurchasePrice)}/></div><p>La apertura debe apoyarse en evidencia: días publicado, bajadas, reforma, comparables, estado y riesgos. Estate no negocia por porcentaje fijo.</p></Panel><Panel className="rental-plan"><div className="panel-head"><div><span className="eyebrow">RENTAL GO-TO-MARKET</span><h3>Cómo encontrar al inquilino</h3></div><Users size={17}/></div><div className="tenant-target"><span>Perfil objetivo</span><strong>{profile}</strong><small>{strategy==="student"?"Estudiantes":strategy==="rooms"?"Habitaciones":"Larga estancia"}</small></div><div className="channel-list">{channels.map((channel,i)=><div key={channel}><span>{String(i+1).padStart(2,"0")}</span><strong>{channel}</strong></div>)}</div><p>El canal es parte de la tesis: si el inquilino objetivo no existe en la microzona, el alquiler esperado pierde confianza.</p></Panel><Panel className="closing-rule"><Gauge size={18}/><div><span className="eyebrow">REGLA DE CIERRE</span><h3>No comprar porque “parece barato”.</h3><p>Compra cuando precio, demanda, estado, financiación, riesgo y plan de salida estén suficientemente probados juntos.</p></div></Panel></div>;
}
