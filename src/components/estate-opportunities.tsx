"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Eye,
  MoreHorizontal,
  Plus,
  Radar,
  ShieldAlert,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import type { EstateStage, SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import {
  dealOutput,
  fmtMoney,
  fmtPct,
  listingPrice,
  Panel,
  ScoreDial,
  SectionHead,
} from "@/components/estate-primitives";

const COLUMNS: Array<{
  key: EstateStage;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}> = [
  {
    key: "watchlist",
    label: "Radar",
    icon: <Radar size={15} />,
    prompt: "¿tiempo?",
  },
  {
    key: "analyzing",
    label: "Análisis",
    icon: <ClipboardCheck size={15} />,
    prompt: "¿cuadra?",
  },
  {
    key: "visit",
    label: "Visita",
    icon: <Eye size={15} />,
    prompt: "¿confirma?",
  },
  {
    key: "negotiating",
    label: "Negocia",
    icon: <CircleDollarSign size={15} />,
    prompt: "¿precio?",
  },
  {
    key: "financing",
    label: "Financiación",
    icon: <CircleDollarSign size={15} />,
    prompt: "validar términos",
  },
  {
    key: "deposit",
    label: "Arras",
    icon: <ClipboardCheck size={15} />,
    prompt: "condiciones",
  },
  {
    key: "purchased",
    label: "Compra",
    icon: <ShoppingBag size={15} />,
    prompt: "¿ejecutar?",
  },
  {
    key: "rehab",
    label: "Reforma",
    icon: <ShoppingBag size={15} />,
    prompt: "presupuesto",
  },
  {
    key: "marketing",
    label: "Alquiler",
    icon: <WalletCards size={15} />,
    prompt: "comercializar",
  },
  {
    key: "managed",
    label: "Cartera",
    icon: <WalletCards size={15} />,
    prompt: "¿rinde?",
  },
];

function blockerCount(deal: SavedDeal) {
  return (deal.estate_risks ?? []).filter(
    (risk) => risk.is_kill_switch && !risk.resolved_at,
  ).length;
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
  const [stageFilter, setStageFilter] = useState<EstateStage | null>(null);
  const [query, setQuery] = useState("");
  const visible = deals.filter(
    (deal) => deal.stage !== "sold" && deal.stage !== "discarded",
  );
  const discarded = deals.filter((deal) => deal.stage === "discarded");

  return (
    <div className="view view-opportunities visual-first v14-view">
      <SectionHead
        eyebrow="ACQUISITION"
        title="¿Qué tengo que hacer después?"
        action={
          <button className="primary-button" onClick={onNew}>
            <Plus size={14} /> Oportunidad
          </button>
        }
      />

      <label className="search-box">
        Buscar{" "}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Activo o municipio"
        />
      </label>
      <div className="pipeline-flow-strip">
        {COLUMNS.map((column, index) => {
          const count = deals.filter(
            (deal) => deal.stage === column.key,
          ).length;
          return (
            <button
              title={column.prompt}
              aria-pressed={stageFilter === column.key}
              onClick={() =>
                setStageFilter(stageFilter === column.key ? null : column.key)
              }
              className={`pipeline-flow-segment ${stageFilter === column.key ? "selected" : ""}`}
              key={column.key}
            >
              <div className={`pipeline-stage-orb ${count ? "has-items" : ""}`}>
                {column.icon}
                <b>{count}</b>
              </div>
              <span>
                <strong>{column.label}</strong>
              </span>
              {index < COLUMNS.length - 1 && <ArrowRight size={13} />}
            </button>
          );
        })}
      </div>

      <div className="pipeline-status-bar">
        <span>
          <b>{visible.length}</b> activas
        </span>
        <span>
          <b>{discarded.length}</b> descartes
        </span>
        <span className="risk-rule" title="Resuelve los riesgos bloqueantes antes de avanzar">
          <ShieldAlert size={13} /> {visible.filter(d=>blockerCount(d)>0).length} bloqueadas
        </span>
      </div>

      {!deals.length ? (
        <div className="pipeline-empty-activation">
          <div className="pipeline-empty-symbol">
            <Radar size={24} />
            <span />
          </div>
          <div>
            <strong>Primera oportunidad</strong>
            <span>Radar → análisis → visita → oferta → compra</span>
          </div>
          <button className="primary-button" onClick={onNew}>
            Empezar <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="kanban-wrap">
          <div
            className={`kanban-board visual-kanban ${stageFilter ? "filtered-stage" : ""}`}
          >
            {COLUMNS.filter(
              (column) => !stageFilter || column.key === stageFilter,
            ).map((column) => {
              const items = deals.filter(
                (deal) =>
                  deal.stage === column.key &&
                  `${deal.title} ${deal.municipality}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              );
              return (
                <section className="kanban-column" key={column.key}>
                  <header>
                    <div>
                      {column.icon}
                      <strong>{column.label}</strong>
                    </div>
                    <b>{items.length}</b>
                  </header>
                  <div className="kanban-stack">
                    {items.map((deal) => {
                      const out = dealOutput(deal);
                      const blockers = blockerCount(deal);
                      const score = opportunityScore(deal);
                      return (
                        <article className="kanban-card" key={deal.id}>
                          <button
                            className="kanban-open"
                            onClick={() => onOpen(deal)}
                          >
                            <div className="kanban-thumbnail">
                              {deal.estate_property_images?.[0]?.preview_url ? (
                                <Image
                                  unoptimized
                                  width={500}
                                  height={260}
                                  src={
                                    deal.estate_property_images[0].preview_url
                                  }
                                  alt=""
                                />
                              ) : (
                                <span>Sin fotografía</span>
                              )}
                            </div>
                            <div className="kanban-card-top">
                              <ScoreDial score={score.score} size="sm" />
                              <div>
                                <strong>{deal.title}</strong>
                                <span>{deal.municipality || "—"}</span>
                              </div>
                              <MoreHorizontal size={14} />
                            </div>
                            <div className="kanban-card-price">
                              <strong>{fmtMoney(listingPrice(deal))}</strong>
                              <span>{out ? fmtPct(out.netYieldPct) : "—"}</span>
                            </div>

                            <div className="kanban-data-line">
                              <i style={{ width: `${score.coverage}%` }} />
                              <span>{score.coverage}% mínimos</span>
                            </div>
                            {blockers > 0 && (
                              <div className="kanban-blocker">
                                <ShieldAlert size={13} />
                                {blockers}
                              </div>
                            )}
                          </button>
                          <p>
                            {deal.estate_tasks?.find((t) => t.status === "open")
                              ?.title ?? "Define la siguiente acción"}
                          </p>
                          <small>
                            {Math.max(
                              0,
                              Math.floor(
                                (Date.now() -
                                  Date.parse(
                                    deal.stage_entered_at ?? deal.updated_at,
                                  )) /
                                  86400000,
                              ),
                            )}{" "}
                            días en fase
                          </small>
                          <div className="kanban-card-actions">
                            <select
                              value={deal.stage}
                              onChange={(event) =>
                                onStageChange(
                                  deal,
                                  event.target.value as EstateStage,
                                )
                              }
                              aria-label="Cambiar etapa"
                            >
                              {COLUMNS.map((option) => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                              <option value="discarded">Descartar</option>
                            </select>
                            <button onClick={() => onOpen(deal)}>Abrir</button>
                          </div>
                        </article>
                      );
                    })}
                    {!items.length && (
                      <div className="kanban-empty">
                        <span />—
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {discarded.length > 0 && (
        <Panel className="discarded-strip">
          <div>
            <CheckCircle2 size={15} />
            <strong>{discarded.length}</strong>
            <span>descartadas · historial conservado</span>
          </div>
          <div className="discarded-list">
            {discarded.slice(0, 5).map((deal) => (
              <button key={deal.id} onClick={() => onOpen(deal)}>
                {deal.title}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
