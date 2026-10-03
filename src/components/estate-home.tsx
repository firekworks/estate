"use client";
import {
  ArrowRight,
  Radar,
  ChartNoAxesCombined,
  Map,
  GitBranch,
  Wallet,
  ShieldAlert,
  Plus,
  Clock3,
  ScanLine,
} from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
import { opportunityScore } from "@/lib/estate-opportunity-score";
import type { View } from "./estate-shell";
import {
  completenessForDeal,
  fmtMoney,
  Panel,
  SectionHead,
  ScoreDial,
  listingPrice,
  stageLabel,
} from "./estate-primitives";
const modules = [
  { view: "explore", label: "Radar", icon: Radar, note: "Encontrar" },
  {
    view: "market",
    label: "Mercado",
    icon: ChartNoAxesCombined,
    note: "Contrastar",
  },
  { view: "mobility", label: "Flujo", icon: Map, note: "Localizar" },
  {
    view: "opportunities",
    label: "Pipeline",
    icon: GitBranch,
    note: "Avanzar",
  },
  { view: "portfolio", label: "Cartera", icon: Wallet, note: "Medir" },
] as const;
export function HomeView({
  deals,
  onNew,
  onExplore,
  onOpen,
  onOpportunities,
  onNavigate,
}: {
  deals: SavedDeal[];
  onNew: () => void;
  onExplore: () => void;
  onOpen: (deal: SavedDeal) => void;
  onOpportunities: () => void;
  onNavigate: (view: View) => void;
}) {
  const active = deals.filter(
    (d) =>
      ![
        "discarded",
        "sold",
        "purchased",
        "rehab",
        "marketing",
        "managed",
      ].includes(d.stage),
  );
  const ranked = active.filter(d=>!opportunityScore(d).blocked)
    .sort(
      (a, b) => opportunityScore(b).rankScore - opportunityScore(a).rankScore,
    )
    .slice(0, 3);
  const tasks = deals
    .flatMap((deal) =>
      (deal.estate_tasks ?? [])
        .filter((t) => t.status === "open")
        .map((task) => ({ deal, task })),
    )
    .sort((a, b) =>
      (a.task.due_at ?? "9999").localeCompare(b.task.due_at ?? "9999"),
    );
  const blockers = deals.flatMap((deal) =>
    (deal.estate_risks ?? [])
      .filter((r) => r.is_kill_switch && !r.resolved_at)
      .map((risk) => ({ deal, risk })),
  );
  const changes = deals
    .flatMap((deal) =>
      (deal.estate_listings ?? []).flatMap((l) =>
        (l.estate_listing_history ?? [])
          .filter((h) =>
            ["price_drop", "price_increase"].includes(h.event_type),
          )
          .map((change) => ({ deal, change })),
      ),
    )
    .sort((a, b) => b.change.observed_at.localeCompare(a.change.observed_at));
  const actual = deals.flatMap((deal) =>
    (deal.estate_actual_performance ?? [])
      .slice(0, 1)
      .map((row) => ({ deal, row })),
  );
  return (
    <div className="view decision-cockpit">
      <SectionHead
        eyebrow="01 / DECIDIR"
        title="Qué hago hoy"
        action={
          <button className="primary-button" onClick={onNew}>
            <Plus size={16} /> Analizar activo
          </button>
        }
      />
      {!deals.length ? (
        <>
          <div className="welcome-workspace">
            <section className="welcome-action">
              <span className="eyebrow">TU PRIMERA DECISIÓN</span>
              <div className="welcome-symbol">
                <ScanLine size={44} />
                <span>01</span>
              </div>
              <h2>
                Un activo.
                <br />
                Toda la perspectiva.
              </h2>
              <p>
                Añade una oportunidad y contrasta precio, riesgo y capital antes
                de avanzar.
              </p>
              <div className="button-row">
                <button className="primary-button" onClick={onNew}>
                  Añadir oportunidad <ArrowRight size={16} />
                </button>
                <button className="ghost-button" onClick={onExplore}>
                  Explorar Radar
                </button>
              </div>
              <div className="evidence-track">
                <span>Hechos</span>
                <i />
                <span>Estimaciones</span>
                <i />
                <span>Decisión</span>
              </div>
            </section>
            <aside className="system-index">
              <div className="panel-head">
                <span className="eyebrow">ESPACIO DE TRABAJO</span>
                <span className="status-pill">Sin activos</span>
              </div>
              {modules.map((m) => (
                <button key={m.view} onClick={() => onNavigate(m.view)}>
                  <m.icon size={20} />
                  <span>
                    <strong>{m.label}</strong>
                    <small>{m.note}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </aside>
          </div>
          <div className="investment-loop" aria-label="Ciclo de inversión">
            {[
              "Encontrar",
              "Validar",
              "Comprar",
              "Mejorar",
              "Explotar",
              "Reinvertir",
            ].map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                <strong>{s}</strong>
                {i < 5 && <ArrowRight size={14} />}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="cockpit-summary">
            <span>
              <b>{active.length}</b> oportunidades
            </span>
            <span>
              <b>{blockers.length}</b> bloqueos
            </span>
            <span>
              <b>{tasks.length}</b> acciones
            </span>
            <span>
              <b>{actual.length}</b> activos con cierres
            </span>
          </div>
          <div className="cockpit-grid">
            <Panel>
              <div className="panel-head">
                <h2>Necesita atención</h2>
                <ShieldAlert size={18} />
              </div>
              {blockers.slice(0, 3).map(({ deal, risk }) => (
                <button
                  className="attention-row"
                  key={risk.id}
                  onClick={() => onOpen(deal)}
                >
                  <span className="status-pill status-bad">Bloqueada</span>
                  <span>
                    <strong>{risk.title}</strong>
                    <small>{deal.title}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
              {tasks.slice(0, 4).map(({ deal, task }) => (
                <button
                  className="attention-row"
                  key={task.id}
                  onClick={() => onOpen(deal)}
                >
                  <Clock3 size={17} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {deal.title} ·{" "}
                      {task.due_at
                        ? new Date(task.due_at).toLocaleDateString("es-ES")
                        : "Sin fecha"}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
              {!blockers.length && !tasks.length && (
                <p className="compact-empty">
                  Todo al día. Define el siguiente paso desde cada inmueble.
                </p>
              )}
            </Panel>
            <Panel>
              <h2>
                Top oportunidades <small>ajustado por evidencia</small>
              </h2>
              {ranked.map((deal) => {
                const score = opportunityScore(deal);
                return (
                  <button
                    className="attention-row"
                    key={deal.id}
                    onClick={() => onOpen(deal)}
                  >
                    <ScoreDial score={score.score} size="sm" />
                    <span>
                      <strong>{deal.title}</strong>
                      <small>
                        {deal.municipality} · {stageLabel(deal.stage)} ·{" "}
                        {score.coverage}% cobertura
                      </small>
                    </span>
                    <strong>{fmtMoney(listingPrice(deal))}</strong>
                  </button>
                );
              })}
              {!ranked.length && (
                <p className="compact-empty">No hay oportunidades abiertas.</p>
              )}
            </Panel>
            <Panel>
              <h2>Evidencia pendiente</h2>
              {active
                .filter((d) => completenessForDeal(d) < 70)
                .slice(0, 3)
                .map((deal) => (
                  <button
                    className="attention-row"
                    key={deal.id}
                    onClick={() => onOpen(deal)}
                  >
                    <span>
                      <strong>{deal.title}</strong>
                      <small>Validar hechos, comparables y riesgos</small>
                    </span>
                    <b>{completenessForDeal(deal)}%</b>
                  </button>
                ))}
            </Panel>
            <Panel>
              <h2>Capital y desviaciones</h2>
              {actual.length ? (
                actual.slice(0, 3).map(({ deal, row }) => {
                  const forecast = (
                    row.forecast?.outputs as { netMonthlyCashFlow?: number }
                  )?.netMonthlyCashFlow;
                  const real =
                    row.rent_received -
                    row.operating_expenses -
                    row.debt_payment;
                  return (
                    <button
                      className="attention-row"
                      key={deal.id}
                      onClick={() => onOpen(deal)}
                    >
                      <span>
                        <strong>{deal.title}</strong>
                        <small>
                          {row.period} · equity{" "}
                          {fmtMoney(
                            row.valuation === null || row.debt_balance === null
                              ? null
                              : row.valuation - row.debt_balance,
                          )}
                        </small>
                      </span>
                      <strong>
                        {fmtMoney(
                          forecast === undefined ? null : real - forecast,
                        )}
                        <small>vs. previsión</small>
                      </strong>
                    </button>
                  );
                })
              ) : (
                <button className="attention-row" onClick={onOpportunities}>
                  <span>Registrar compra y primer cierre</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </Panel>
            <Panel>
              <h2>Cambios de precio</h2>
              {changes.length ? (
                changes.slice(0, 4).map(({ deal, change }) => (
                  <button
                    key={change.id}
                    className="attention-row"
                    onClick={() => onOpen(deal)}
                  >
                    <span>
                      <strong>{deal.title}</strong>
                      <small>
                        {change.observed_at.slice(0, 10)} ·{" "}
                        {fmtMoney(change.payload.previous_price)} →{" "}
                        {fmtMoney(change.asking_price)}
                      </small>
                    </span>
                    <strong
                      className={
                        change.event_type === "price_drop"
                          ? "positive"
                          : "negative"
                      }
                    >
                      {fmtMoney(
                        change.payload.previous_price === undefined
                          ? null
                          : change.asking_price - change.payload.previous_price,
                      )}
                    </strong>
                  </button>
                ))
              ) : (
                <p className="compact-empty">
                  Sin cambios de precio registrados.
                </p>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
