"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  FileSearch,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
import {
  ActionLink,
  completenessForDeal,
  DataMeter,
  dealInput,
  dealOutput,
  fmtMoney,
  fmtPct,
  Metric,
  Panel,
  ScoreDial,
  SectionHead,
  stageLabel,
  StatusPill,
} from "@/components/estate-primitives";

function nextAction(deal: SavedDeal) {
  const completeness = completenessForDeal(deal);
  const unresolvedKill = (deal.estate_risks ?? []).find((risk) => risk.is_kill_switch && !risk.resolved_at);
  if (unresolvedKill) return { title: "Resolver riesgo bloqueante", copy: unresolvedKill.title, icon: <ShieldAlert size={17} />, tone: "bad" as const };
  if (completeness < 70) return { title: "Completar evidencia", copy: `${100 - completeness}% de la ficha aún está sin validar`, icon: <DatabaseZap size={17} />, tone: "warn" as const };
  if (deal.stage === "analyzing") return { title: "Decidir si merece visita", copy: "Revisa zona, fotos y stress antes de desplazarte", icon: <FileSearch size={17} />, tone: "accent" as const };
  if (deal.stage === "visit") return { title: "Preparar visita", copy: "Comprueba instalaciones, comunidad, ruido, luz y medidas", icon: <ClipboardCheck size={17} />, tone: "accent" as const };
  if (deal.stage === "negotiating") return { title: "Preparar oferta", copy: "Usa el precio máximo y las evidencias para fijar el ancla", icon: <CircleDollarSign size={17} />, tone: "accent" as const };
  if (deal.stage === "purchased") return { title: "Activar plan de reforma", copy: "Convierte presupuesto estimado en partidas reales", icon: <CheckCircle2 size={17} />, tone: "good" as const };
  if (deal.stage === "managed") return { title: "Medir real vs. previsto", copy: "Compara alquiler, gastos y cash-flow con el underwriting", icon: <TrendingUp size={17} />, tone: "good" as const };
  return { title: "Revisar operación", copy: stageLabel(deal.stage), icon: <Sparkles size={17} />, tone: "neutral" as const };
}

export function HomeView({
  deals,
  onNew,
  onExplore,
  onOpen,
  onOpportunities,
}: {
  deals: SavedDeal[];
  onNew: () => void;
  onExplore: () => void;
  onOpen: (deal: SavedDeal) => void;
  onOpportunities: () => void;
}) {
  const ranked = deals
    .map((deal) => ({ deal, out: dealOutput(deal), input: dealInput(deal) }))
    .filter((item) => item.out && item.deal.stage !== "discarded" && item.deal.stage !== "sold")
    .sort((a, b) => (b.out?.score ?? 0) - (a.out?.score ?? 0));
  const focus = ranked[0] ?? null;
  const active = deals.filter((deal) => !["discarded", "sold"].includes(deal.stage));
  const portfolio = deals.filter((deal) => ["purchased", "managed"].includes(deal.stage));
  const portfolioCashflow = portfolio.reduce((sum, deal) => sum + (dealOutput(deal)?.netMonthlyCashFlow ?? 0), 0);

  if (!deals.length) {
    return (
      <div className="view view-home">
        <SectionHead eyebrow="ESTATE WORKFLOW" title="De un anuncio a una decisión." copy="Empieza con una oportunidad real. Estate te irá pidiendo solo el dato que toca, en el orden correcto." />

        <Panel className="onboarding-path">
          <div className="onboarding-intro">
            <span className="onboarding-number">01</span>
            <div><h2>Añade la primera oportunidad</h2><p>Pega un anuncio o introduce los datos manualmente. No necesitas completar todo de golpe.</p></div>
            <button className="primary-button" onClick={onNew}>Analizar inmueble <ArrowRight size={15} /></button>
          </div>
          <div className="path-steps">
            <div><Compass size={17} /><strong>Captura</strong><span>anuncio + ficha física</span></div>
            <i />
            <div><DatabaseZap size={17} /><strong>Contrasta</strong><span>mercado + alquiler + zona</span></div>
            <i />
            <div><ShieldAlert size={17} /><strong>Rompe</strong><span>riesgos + stress + visita</span></div>
            <i />
            <div><CircleDollarSign size={17} /><strong>Decide</strong><span>precio máximo + plan</span></div>
          </div>
        </Panel>

        <div className="home-empty-grid">
          <Panel className="empty-guide-card">
            <span className="eyebrow">DESCUBRIR</span>
            <h3>Explora sin perder contexto</h3>
            <p>Las ofertas que añadas aparecerán en Explorar, donde podrás filtrarlas y compararlas sin mezclarlo con el análisis profundo.</p>
            <ActionLink onClick={onExplore}>Abrir Explorar</ActionLink>
          </Panel>
          <Panel className="empty-guide-card">
            <span className="eyebrow">REGLA DEL SISTEMA</span>
            <h3>Sin datos inventados</h3>
            <p>Hechos, estimaciones y supuestos se diferencian. Una puntuación con poca evidencia pierde confianza en lugar de aparentar precisión.</p>
          </Panel>
          <Panel className="empty-guide-card">
            <span className="eyebrow">DIFERENCIAL</span>
            <h3>La reforma vive dentro del inmueble</h3>
            <p>Fotos, partidas, riesgos, zona, financiación y plan de alquiler se trabajan en el workspace de cada propiedad.</p>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="view view-home">
      <SectionHead eyebrow="HOY" title="Qué merece tu atención." copy={`${active.length} operaciones activas · ${portfolio.length} activos en cartera`} action={<button className="primary-button" onClick={onNew}>Nueva oportunidad</button>} />

      {focus && focus.out && focus.input && (
        <Panel className="home-focus">
          <div className="home-focus-score"><ScoreDial score={focus.out.score} label={focus.out.verdict} size="lg" /></div>
          <div className="home-focus-main">
            <div className="home-focus-title">
              <div><span className="eyebrow">MEJOR SEÑAL ACTIVA</span><h2>{focus.deal.title}</h2><p>{focus.deal.municipality || "Ubicación pendiente"} · {fmtMoney(focus.input.purchasePrice)} · {focus.deal.built_area_m2 ? `${focus.deal.built_area_m2} m²` : "m² pendiente"}</p></div>
              <StatusPill tone="accent">{stageLabel(focus.deal.stage)}</StatusPill>
            </div>
            <div className="home-focus-metrics">
              <Metric label="Yield neta" value={fmtPct(focus.out.netYieldPct)} />
              <Metric label="Cash-flow" value={`${fmtMoney(focus.out.netMonthlyCashFlow)}/mes`} tone={focus.out.netMonthlyCashFlow >= 0 ? "good" : "bad"} />
              <Metric label="Precio máximo" value={fmtMoney(focus.out.maxPurchasePrice)} />
              <Metric label="Capital" value={fmtMoney(focus.out.capitalRequired)} />
            </div>
            <DataMeter value={completenessForDeal(focus.deal)} label="Ficha verificada" />
          </div>
          <div className={`next-action next-${nextAction(focus.deal).tone}`}>
            {nextAction(focus.deal).icon}
            <span>PRÓXIMA ACCIÓN</span>
            <strong>{nextAction(focus.deal).title}</strong>
            <p>{nextAction(focus.deal).copy}</p>
            <button onClick={() => onOpen(focus.deal)}>Abrir workspace <ArrowRight size={14} /></button>
          </div>
        </Panel>
      )}

      <div className="home-lower-grid">
        <Panel className="home-queue">
          <div className="panel-head"><div><span className="eyebrow">COLA DE DECISIÓN</span><h3>Siguientes operaciones</h3></div><button className="text-link button-link" onClick={onOpportunities}>Ver pipeline <ArrowRight size={13} /></button></div>
          <div className="queue-list">
            {ranked.slice(1, 5).map(({ deal, out }) => (
              <button className="queue-row" key={deal.id} onClick={() => onOpen(deal)}>
                <ScoreDial score={out?.score ?? 0} size="sm" />
                <div><strong>{deal.title}</strong><span>{deal.municipality || "Sin ubicación"} · {stageLabel(deal.stage)}</span></div>
                <DataMeter value={completenessForDeal(deal)} label="datos" />
                <ArrowRight size={14} />
              </button>
            ))}
            {ranked.length <= 1 && <div className="queue-placeholder">Añade otra operación para empezar a comparar decisiones.</div>}
          </div>
        </Panel>

        <Panel className="home-capital-card">
          <div className="panel-head"><div><span className="eyebrow">CARTERA</span><h3>Motor de capital</h3></div><TrendingUp size={18} /></div>
          <div className="capital-number"><span>Cash-flow real/previsto</span><strong>{fmtMoney(portfolioCashflow)}<small>/mes</small></strong></div>
          <div className="capital-rings">
            <div><strong>{portfolio.length}</strong><span>activos</span></div>
            <div><strong>{active.length}</strong><span>en pipeline</span></div>
            <div><strong>{Math.round(active.reduce((sum, deal) => sum + completenessForDeal(deal), 0) / Math.max(1, active.length))}%</strong><span>datos medios</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
