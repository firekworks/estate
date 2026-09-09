"use client";

import { ArrowRight, CheckCircle2, CircleDollarSign, ClipboardCheck, Eye, MoreHorizontal, Plus, Radar, ShieldAlert, ShoppingBag, WalletCards } from "lucide-react";
import type { EstateStage, SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import { completenessForDeal, dealOutput, fmtMoney, fmtPct, listingPrice, Panel, ScoreDial, SectionHead } from "@/components/estate-primitives";

const COLUMNS: Array<{ key: EstateStage; label: string; icon: React.ReactNode; prompt: string }> = [
  { key: "watchlist", label: "Radar", icon: <Radar size={15} />, prompt: "¿tiempo?" },
  { key: "analyzing", label: "Análisis", icon: <ClipboardCheck size={15} />, prompt: "¿cuadra?" },
  { key: "visit", label: "Visita", icon: <Eye size={15} />, prompt: "¿confirma?" },
  { key: "negotiating", label: "Negocia", icon: <CircleDollarSign size={15} />, prompt: "¿precio?" },
  { key: "purchased", label: "Compra", icon: <ShoppingBag size={15} />, prompt: "¿ejecutar?" },
  { key: "managed", label: "Cartera", icon: <WalletCards size={15} />, prompt: "¿rinde?" },
];

function blockerCount(deal: SavedDeal) { return (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at).length; }

export function OpportunitiesView({ deals, onNew, onOpen, onStageChange }: {
  deals: SavedDeal[];
  onNew: () => void;
  onOpen: (deal: SavedDeal) => void;
  onStageChange: (deal: SavedDeal, stage: EstateStage) => void;
}) {
  const visible = deals.filter((deal) => deal.stage !== "sold" && deal.stage !== "discarded");
  const discarded = deals.filter((deal) => deal.stage === "discarded");

  return (
    <div className="view view-opportunities visual-first">
      <SectionHead eyebrow="ACQUISITION" title="Pipeline." action={<button className="primary-button" onClick={onNew}><Plus size={14} /> Oportunidad</button>} />

      <div className="pipeline-flow-strip">
        {COLUMNS.map((column, index) => {
          const count = deals.filter((deal) => deal.stage === column.key).length;
          return <div className="pipeline-flow-segment" key={column.key}><div className={`pipeline-stage-orb ${count ? "has-items" : ""}`}>{column.icon}<b>{count}</b></div><span><strong>{column.label}</strong><small>{column.prompt}</small></span>{index < COLUMNS.length - 1 && <ArrowRight size={13} />}</div>;
        })}
      </div>

      <div className="pipeline-status-bar"><span><b>{visible.length}</b> activas</span><span><b>{visible.filter((deal) => deal.stage === "visit").length}</b> visitas</span><span><b>{visible.filter((deal) => deal.stage === "negotiating").length}</b> negociación</span><span><b>{discarded.length}</b> descartes</span><span className="risk-rule"><ShieldAlert size={13} /> kill switch = stop</span></div>

      {!deals.length ? (
        <Panel className="pipeline-visual-empty"><div className="pipeline-empty-radar"><Radar size={32} /><i /><i /><i /></div><strong>RADAR → ANÁLISIS → VISITA → OFERTA → COMPRA</strong><button className="primary-button" onClick={onNew}>Empezar <ArrowRight size={14} /></button></Panel>
      ) : (
        <div className="kanban-wrap"><div className="kanban-board visual-kanban">
          {COLUMNS.map((column) => {
            const items = deals.filter((deal) => deal.stage === column.key);
            return <section className="kanban-column" key={column.key}><header><div>{column.icon}<strong>{column.label}</strong></div><b>{items.length}</b></header><div className="kanban-stack">
              {items.map((deal) => {
                const out = dealOutput(deal); const blockers = blockerCount(deal); const score = opportunityScore(deal);
                return <article className="kanban-card" key={deal.id}>
                  <button className="kanban-open" onClick={() => onOpen(deal)}>
                    <div className="kanban-card-top"><ScoreDial score={score.score} size="sm" /><div><strong>{deal.title}</strong><span>{deal.municipality || "—"}</span></div><MoreHorizontal size={14} /></div>
                    <div className="kanban-card-price"><strong>{fmtMoney(listingPrice(deal))}</strong><span>{out ? fmtPct(out.netYieldPct) : "—"}</span></div>
                    <div className="kanban-signal-bars">{score.components.map((factor) => <i key={factor.key} style={{ height: `${Math.max(4, (factor.score ?? 0) * .16)}px` }} title={`${factor.label} ${factor.score ?? "—"}`} />)}</div>
                    <div className="kanban-data-line"><i style={{ width: `${score.coverage}%` }} /><span>{score.coverage}% evidencia</span></div>
                    {blockers > 0 && <div className="kanban-blocker"><ShieldAlert size={13} />{blockers}</div>}
                  </button>
                  <div className="kanban-card-actions"><select value={deal.stage} onChange={(event) => onStageChange(deal, event.target.value as EstateStage)} aria-label="Cambiar etapa">{COLUMNS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}<option value="discarded">Descartar</option></select><button onClick={() => onOpen(deal)}>Abrir</button></div>
                </article>;
              })}
              {!items.length && <div className="kanban-empty"><span />—</div>}
            </div></section>;
          })}
        </div></div>
      )}

      {discarded.length > 0 && <Panel className="discarded-strip"><div><CheckCircle2 size={15} /><strong>{discarded.length}</strong><span>descartadas · historial conservado</span></div><div className="discarded-list">{discarded.slice(0, 5).map((deal) => <button key={deal.id} onClick={() => onOpen(deal)}>{deal.title}</button>)}</div></Panel>}
    </div>
  );
}
