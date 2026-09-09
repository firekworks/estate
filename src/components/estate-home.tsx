"use client";

import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  DatabaseZap,
  Eye,
  Hammer,
  KeyRound,
  Radar,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import {
  completenessForDeal,
  dealInput,
  dealOutput,
  fmtMoney,
  fmtPct,
  Panel,
  ScoreDial,
  SectionHead,
  stageLabel,
} from "@/components/estate-primitives";

const FLOW = [
  { icon: <Radar size={18} />, label: "ENCONTRAR", hint: "radar" },
  { icon: <DatabaseZap size={18} />, label: "CONTRASTAR", hint: "mercado" },
  { icon: <Eye size={18} />, label: "VALIDAR", hint: "fotos + zona" },
  { icon: <ShieldAlert size={18} />, label: "ROMPER", hint: "stress" },
  { icon: <CircleDollarSign size={18} />, label: "NEGOCIAR", hint: "máximo" },
  { icon: <KeyRound size={18} />, label: "OPERAR", hint: "cash-flow" },
] as const;

function nextAction(deal: SavedDeal) {
  const completeness = completenessForDeal(deal);
  const unresolvedKill = (deal.estate_risks ?? []).find((risk) => risk.is_kill_switch && !risk.resolved_at);
  if (unresolvedKill) return { label: "BLOQUEO", value: unresolvedKill.title, icon: <ShieldAlert size={18} />, tone: "bad" };
  if (completeness < 70) return { label: "SIGUIENTE", value: "Completar evidencia", icon: <DatabaseZap size={18} />, tone: "warn" };
  if (deal.stage === "analyzing") return { label: "SIGUIENTE", value: "Validar para visita", icon: <Eye size={18} />, tone: "accent" };
  if (deal.stage === "visit") return { label: "SIGUIENTE", value: "Checklist de visita", icon: <CheckCircle2 size={18} />, tone: "accent" };
  if (deal.stage === "negotiating") return { label: "SIGUIENTE", value: "Preparar oferta", icon: <CircleDollarSign size={18} />, tone: "accent" };
  if (deal.stage === "purchased") return { label: "SIGUIENTE", value: "Ejecutar reforma", icon: <Hammer size={18} />, tone: "good" };
  return { label: "SIGUIENTE", value: "Medir real vs previsto", icon: <TrendingUp size={18} />, tone: "good" };
}

function FactorStrip({ deal }: { deal: SavedDeal }) {
  const score = opportunityScore(deal);
  return (
    <div className="factor-strip" aria-label="Factores del Estate Score">
      {score.components.map((factor) => (
        <div className="factor-cell" key={factor.key} title={`${factor.label}: ${factor.score === null ? "sin dato" : Math.round(factor.score)} · confianza ${Math.round(factor.confidence * 100)}%`}>
          <span>{factor.label}</span>
          <div><i style={{ width: `${factor.score ?? 0}%` }} /></div>
          <strong>{factor.score === null ? "—" : Math.round(factor.score)}</strong>
        </div>
      ))}
    </div>
  );
}

export function HomeView({ deals, onNew, onExplore, onOpen, onOpportunities }: {
  deals: SavedDeal[];
  onNew: () => void;
  onExplore: () => void;
  onOpen: (deal: SavedDeal) => void;
  onOpportunities: () => void;
}) {
  const active = deals.filter((deal) => !["discarded", "sold"].includes(deal.stage));
  const ranked = active
    .map((deal) => ({ deal, opportunity: opportunityScore(deal), out: dealOutput(deal), input: dealInput(deal) }))
    .sort((a, b) => b.opportunity.rankScore - a.opportunity.rankScore);
  const focus = ranked[0] ?? null;
  const portfolio = deals.filter((deal) => ["purchased", "managed"].includes(deal.stage));
  const portfolioCashflow = portfolio.reduce((sum, deal) => sum + (dealOutput(deal)?.netMonthlyCashFlow ?? 0), 0);

  if (!deals.length) {
    return (
      <div className="view view-home visual-first">
        <SectionHead eyebrow="ESTATE OS" title="Del radar al cash-flow." action={<button className="primary-button" onClick={onNew}>+ Primera operación</button>} />

        <Panel className="workflow-map-card">
          <div className="workflow-map">
            {FLOW.map((step, index) => (
              <div className="workflow-map-segment" key={step.label}>
                <button className={`workflow-node node-${index + 1}`} onClick={index === 0 ? onExplore : onNew} title={step.hint}>
                  <span>{step.icon}</span><strong>{step.label}</strong><small>{step.hint}</small>
                </button>
                {index < FLOW.length - 1 && <div className="workflow-arrow"><ArrowRight size={15} /></div>}
              </div>
            ))}
          </div>
          <div className="workflow-core">
            <Sparkles size={18} />
            <strong>1 inmueble</strong>
            <span>1 workspace</span>
          </div>
        </Panel>

        <div className="visual-rules-grid">
          <button className="visual-rule" onClick={onNew}><DatabaseZap size={20} /><strong>HECHO ≠ ESTIMACIÓN</strong><span>evidencia</span></button>
          <button className="visual-rule" onClick={onNew}><Camera size={20} /><strong>FOTOS → SEÑALES</strong><span>visión</span></button>
          <button className="visual-rule" onClick={onNew}><Hammer size={20} /><strong>REFORMA → ACTIVO</strong><span>partidas</span></button>
          <button className="visual-rule" onClick={onNew}><Users size={20} /><strong>ZONA → INQUILINO</strong><span>demanda</span></button>
          <button className="visual-rule" onClick={onNew}><ShieldAlert size={20} /><strong>RIESGO → BLOQUEA</strong><span>kill switch</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="view view-home visual-first">
      <SectionHead eyebrow="HOY" title="Centro de decisión." action={<button className="primary-button" onClick={onNew}>+ Operación</button>} />

      {focus && focus.out && focus.input && (
        <Panel className="command-board">
          <button className="command-score" onClick={() => onOpen(focus.deal)}>
            <ScoreDial score={focus.opportunity.score} label="ESTATE" size="lg" />
            <span className="coverage-ring" style={{ "--coverage": `${focus.opportunity.coverage * 3.6}deg` } as React.CSSProperties}><b>{focus.opportunity.coverage}%</b><small>evidencia</small></span>
          </button>

          <button className="command-main" onClick={() => onOpen(focus.deal)}>
            <div className="command-title"><span>{stageLabel(focus.deal.stage)}</span><h2>{focus.deal.title}</h2><small>{focus.deal.municipality || "ubicación pendiente"}</small></div>
            <div className="command-kpis">
              <div><span>PRECIO</span><strong>{fmtMoney(focus.input.purchasePrice)}</strong></div>
              <div><span>YIELD</span><strong>{fmtPct(focus.out.netYieldPct)}</strong></div>
              <div><span>CASH-FLOW</span><strong className={focus.out.netMonthlyCashFlow >= 0 ? "positive" : "negative"}>{fmtMoney(focus.out.netMonthlyCashFlow)}</strong></div>
              <div><span>MÁXIMO</span><strong>{fmtMoney(focus.out.maxPurchasePrice)}</strong></div>
            </div>
            <FactorStrip deal={focus.deal} />
          </button>

          <button className={`command-next command-${nextAction(focus.deal).tone}`} onClick={() => onOpen(focus.deal)}>
            {nextAction(focus.deal).icon}<span>{nextAction(focus.deal).label}</span><strong>{nextAction(focus.deal).value}</strong><ArrowRight size={16} />
          </button>
        </Panel>
      )}

      <div className="home-visual-grid">
        <Panel className="decision-radar-mini">
          <div className="visual-panel-head"><span><Compass size={15} /> RANKING</span><button onClick={onExplore}>Radar <ArrowRight size={13} /></button></div>
          <div className="rank-visual-list">
            {ranked.slice(0, 5).map(({ deal, opportunity, out }, index) => (
              <button key={deal.id} onClick={() => onOpen(deal)}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <ScoreDial score={opportunity.score} size="sm" />
                <span><strong>{deal.title}</strong><small>{deal.municipality || "—"}</small></span>
                <i style={{ width: `${opportunity.coverage}%` }} />
                <em>{out ? fmtPct(out.netYieldPct) : "—"}</em>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="capital-orbit-card">
          <div className="visual-panel-head"><span><Building2 size={15} /> CAPITAL</span><button onClick={onOpportunities}>Pipeline <ArrowRight size={13} /></button></div>
          <div className="capital-orbit-visual">
            <div className="orbit-center"><strong>{fmtMoney(portfolioCashflow)}</strong><span>/ mes</span></div>
            <div className="orbit-stat orbit-a"><b>{active.length}</b><span>pipeline</span></div>
            <div className="orbit-stat orbit-b"><b>{portfolio.length}</b><span>activos</span></div>
            <div className="orbit-stat orbit-c"><b>{Math.round(active.reduce((sum, deal) => sum + completenessForDeal(deal), 0) / Math.max(1, active.length))}%</b><span>evidencia</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
