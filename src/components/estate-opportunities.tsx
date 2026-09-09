"use client";

import { ArrowRight, CheckCircle2, ClipboardCheck, GitCompareArrows, MoreHorizontal, Plus, ShieldAlert } from "lucide-react";
import type { EstateStage, SavedDeal } from "@/lib/estate-store";
import {
  completenessForDeal,
  dealOutput,
  fmtMoney,
  fmtPct,
  listingPrice,
  Panel,
  ScoreDial,
  SectionHead,
  stageLabel,
} from "@/components/estate-primitives";

const COLUMNS: Array<{ key: EstateStage; label: string; prompt: string }> = [
  { key: "watchlist", label: "Radar", prompt: "¿Merece tiempo?" },
  { key: "analyzing", label: "Análisis", prompt: "¿Cuadran los datos?" },
  { key: "visit", label: "Visita", prompt: "¿La realidad confirma?" },
  { key: "negotiating", label: "Negociación", prompt: "¿A qué precio entra?" },
  { key: "purchased", label: "Compra", prompt: "¿Qué hay que ejecutar?" },
  { key: "managed", label: "Cartera", prompt: "¿Rinde como esperaba?" },
];

function blockerCount(deal: SavedDeal) {
  return (deal.estate_risks ?? []).filter((risk) => risk.is_kill_switch && !risk.resolved_at).length;
}

export function OpportunitiesView({
  deals,
  onNew,
  onOpen,
  onStageChange,
}: {
  deals: SavedDeal[];
  onNew: () => void;
  onOpen: (deal: SavedDeal) => void;
  onStageChange: (deal: SavedDeal, stage: EstateStage) => void;
}) {
  const visible = deals.filter((deal) => deal.stage !== "sold");
  const discarded = deals.filter((deal) => deal.stage === "discarded");

  return (
    <div className="view view-opportunities">
      <SectionHead eyebrow="ACQUISITION PIPELINE" title="Cada operación tiene una siguiente decisión." copy="El pipeline no es un archivo. Cada columna cambia la pregunta que Estate debe ayudarte a responder." action={<button className="primary-button" onClick={onNew}><Plus size={15} /> Nueva oportunidad</button>} />

      <div className="pipeline-context">
        <div><span>{visible.filter((deal) => !["discarded", "purchased", "managed"].includes(deal.stage)).length}</span><small>en decisión</small></div>
        <div><span>{visible.filter((deal) => deal.stage === "visit").length}</span><small>por visitar</small></div>
        <div><span>{visible.filter((deal) => deal.stage === "negotiating").length}</span><small>negociando</small></div>
        <div><span>{discarded.length}</span><small>descartadas</small></div>
        <div className="pipeline-rule"><ShieldAlert size={14} /><span>Un riesgo bloqueante debe resolverse antes de avanzar.</span></div>
      </div>

      {!deals.length ? (
        <Panel className="pipeline-first-run">
          <div className="pipeline-first-copy"><span className="eyebrow">PRIMER CICLO</span><h2>Empieza en Radar, no en “comprar”.</h2><p>Una oportunidad avanza únicamente cuando la evidencia responde la pregunta de la etapa anterior.</p><button className="primary-button" onClick={onNew}>Analizar primera <ArrowRight size={14} /></button></div>
          <div className="pipeline-first-flow">
            {COLUMNS.map((column, index) => <div key={column.key}><span>{String(index + 1).padStart(2, "0")}</span><strong>{column.label}</strong><small>{column.prompt}</small></div>)}
          </div>
        </Panel>
      ) : (
        <div className="kanban-wrap">
          <div className="kanban-board">
            {COLUMNS.map((column) => {
              const items = deals.filter((deal) => deal.stage === column.key);
              return (
                <section className="kanban-column" key={column.key}>
                  <header><div><strong>{column.label}</strong><span>{column.prompt}</span></div><b>{items.length}</b></header>
                  <div className="kanban-stack">
                    {items.map((deal) => {
                      const out = dealOutput(deal);
                      const blockers = blockerCount(deal);
                      return (
                        <article className="kanban-card" key={deal.id}>
                          <button className="kanban-open" onClick={() => onOpen(deal)}>
                            <div className="kanban-card-top"><ScoreDial score={out?.score ?? 0} size="sm" /><div><strong>{deal.title}</strong><span>{deal.municipality || "Ubicación pendiente"}</span></div><MoreHorizontal size={14} /></div>
                            <div className="kanban-card-price"><strong>{fmtMoney(listingPrice(deal))}</strong><span>{out ? `${fmtPct(out.netYieldPct)} yield` : "sin análisis"}</span></div>
                            <div className="kanban-data-line"><i style={{ width: `${completenessForDeal(deal)}%` }} /><span>{completenessForDeal(deal)}% datos</span></div>
                            {blockers > 0 && <div className="kanban-blocker"><ShieldAlert size={13} />{blockers} riesgo{blockers > 1 ? "s" : ""} bloqueante{blockers > 1 ? "s" : ""}</div>}
                          </button>
                          <div className="kanban-card-actions">
                            <select value={deal.stage} onChange={(event) => onStageChange(deal, event.target.value as EstateStage)} aria-label="Cambiar etapa">
                              {COLUMNS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                              <option value="discarded">Descartada</option>
                            </select>
                            <button onClick={() => onOpen(deal)}><ClipboardCheck size={13} /> Revisar</button>
                          </div>
                        </article>
                      );
                    })}
                    {!items.length && <div className="kanban-empty"><span />Sin operaciones</div>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {discarded.length > 0 && (
        <Panel className="discarded-strip">
          <div><CheckCircle2 size={16} /><span><strong>{discarded.length} descartadas.</strong> Conservar descartes es útil: permite aprender qué criterios realmente evitan malas compras.</span></div>
          <div className="discarded-list">{discarded.slice(0, 5).map((deal) => <button key={deal.id} onClick={() => onOpen(deal)}>{deal.title}</button>)}</div>
        </Panel>
      )}
    </div>
  );
}
