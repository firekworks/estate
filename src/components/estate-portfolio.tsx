"use client";
import type { User } from "@supabase/supabase-js";
import { AssetMap } from "./estate-asset-map";
import { StrategyDesk } from "./estate-operations";
import {
  Wallet,
  TrendingUp,
  ArrowRight,
  ChartNoAxesCombined,
} from "lucide-react";
import { useState } from "react";
import { xirr, forecastError } from "@/lib/estate-performance";
import type { SavedDeal } from "@/lib/estate-store";
import {
  SectionHead,
  Panel,
  Metric,
  fmtMoney,
  fmtPct,
  dealOutput,
} from "./estate-primitives";
export function PortfolioView({
  deals,
  onOpen,
  onOpportunities,
  user,
}: {
  user: User;
  deals: SavedDeal[];
  onOpen: (d: SavedDeal) => void;
  onOpportunities: () => void;
}) {
  const [strategy, setStrategy] = useState<{
    id: string;
    mode: "hold" | "refinance" | "sell";
  } | null>(null);
  const assets = deals.filter((d) =>
    ["purchased", "rehab", "marketing", "managed"].includes(d.stage),
  );
  const periods = [
    ...new Set(
      assets.flatMap((d) =>
        (d.estate_actual_performance ?? []).map((r) => r.period),
      ),
    ),
  ]
    .sort()
    .reverse();
  const [selected, setSelected] = useState("");
  const period = selected || periods[0] || "";
  const rows = assets.map((deal) => ({
    deal,
    actual: deal.estate_actual_performance?.find((r) => r.period === period),
  }));
  const covered = rows.filter((r) => r.actual),
    total = (key: "valuation" | "debt_balance") =>
      covered.length === assets.length &&
      covered.every((r) => r.actual![key] !== null)
        ? covered.reduce((s, r) => s + r.actual![key]!, 0)
        : null;
  const value = assets.length ? total("valuation") : null,
    debt = assets.length ? total("debt_balance") : null;
  const noi = covered.length
    ? covered.reduce(
        (s, r) => s + r.actual!.rent_received - r.actual!.operating_expenses,
        0,
      )
    : null;
  const days = period
    ? new Date(
        Number(period.slice(0, 4)),
        Number(period.slice(5, 7)),
        0,
      ).getDate()
    : 0;
  const occupied =
    assets.length > 0 &&
    days &&
    covered.length === assets.length &&
    covered.every((r) => r.actual!.occupied_days !== null)
      ? (covered.reduce((s, r) => s + r.actual!.occupied_days!, 0) /
          (days * assets.length)) *
        100
      : null;
  const ledger = deals
    .filter((d) =>
      ["purchased", "rehab", "marketing", "managed", "sold"].includes(d.stage),
    )
    .flatMap((d) =>
      (d.estate_investor_cashflows ?? []).map((f) => ({
        date: f.occurred_at,
        amount: f.direction === "contribution" ? -f.amount : f.amount,
      })),
    );
  const irr = xirr(ledger);
  const [groupBy, setGroupBy] = useState<"city" | "asset" | "strategy">("city");
  const calibration = new Map<string, { n: number; error: number }>();
  for (const d of deals)
    for (const actual of d.estate_actual_performance ?? []) {
      const forecast = actual.forecast?.outputs as
        { netMonthlyCashFlow?: number } | undefined;
      const error = forecastError(
        forecast?.netMonthlyCashFlow,
        actual.rent_received - actual.operating_expenses - actual.debt_payment,
      );
      if (!error) continue;
      const key =
        groupBy === "city"
          ? (d.municipality ?? "Sin municipio")
          : groupBy === "asset"
            ? d.property_type
            : (d.features?.rentalStrategy ?? "Sin estrategia");
      const old = calibration.get(key) ?? { n: 0, error: 0 };
      calibration.set(key, { n: old.n + 1, error: old.error + error.absolute });
    }
  const timeline = periods
    .slice()
    .reverse()
    .map((p) => {
      const records = assets
        .flatMap((d) => d.estate_actual_performance ?? [])
        .filter((r) => r.period === p);
      return {
        period: p,
        n: records.length,
        cf: records.reduce(
          (s, r) =>
            s +
            r.rent_received -
            r.operating_expenses -
            r.debt_payment -
            r.capex,
          0,
        ),
      };
    });
  const cf = covered.length
    ? covered.reduce(
        (s, r) =>
          s +
          r.actual!.rent_received -
          r.actual!.operating_expenses -
          r.actual!.debt_payment -
          r.actual!.capex,
        0,
      )
    : null;
  const allocation = [
    ...new Set(assets.map((d) => d.municipality ?? "Sin municipio")),
  ].map((city) => ({
    city,
    n: assets.filter((d) => (d.municipality ?? "Sin municipio") === city)
      .length,
  }));
  const velocity = assets
    .map((d) => dealOutput(d)?.capitalVelocityMonths)
    .filter((v): v is number => v !== undefined && v !== null);
  return (
    <div className="view portfolio-os">
      <SectionHead
        eyebrow="06 / MEDIR"
        title="¿Cómo está rindiendo mi capital?"
        action={
          periods.length ? (
            <label>
              Periodo{" "}
              <select
                value={period}
                onChange={(e) => setSelected(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          ) : undefined
        }
      />
      {!assets.length ? (
        <div className="portfolio-onboarding">
          <div className="portfolio-outline">
            <Wallet size={32} />
            <span className="eyebrow">TU PATRIMONIO, EN CONTEXTO</span>
            <h2>De oportunidad a activo.</h2>
            <p>Registra tu primera compra para medir resultados reales.</p>
            <button className="primary-button" onClick={onOpportunities}>
              Abrir Pipeline <ArrowRight size={16} />
            </button>
          </div>
          <div className="portfolio-preview">
            <div>
              <TrendingUp size={20} />
              <strong>Capital</strong>
              <span>Valor · Deuda · Equity</span>
              <div className="empty-track" />
            </div>
            <div>
              <ChartNoAxesCombined size={20} />
              <strong>Resultados</strong>
              <span>Cash-flow · Ocupación · XIRR</span>
              <div className="empty-track" />
            </div>
            <div>
              <Wallet size={20} />
              <strong>Estrategia</strong>
              <span>HOLD / REFINANCE / SELL</span>
              <div className="empty-track" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="portfolio-kpis">
            <Metric label="GAV documentado" value={fmtMoney(value)} />
            <Metric label="Deuda actual" value={fmtMoney(debt)} />
            <Metric
              label="Equity"
              value={fmtMoney(
                value === null || debt === null ? null : value - debt,
              )}
            />
            <Metric
              label="LTV"
              value={fmtPct(
                value && debt !== null ? (debt / value) * 100 : null,
              )}
            />
            <Metric
              label="Cash-flow real registrado"
              value={fmtMoney(cf)}
              note={`${covered.length}/${assets.length} activos · ${period || "sin cierres"}`}
            />
          </div>
          <details className="panel"><summary>Ocupación, XIRR y métricas de capital</summary><div className="portfolio-kpis">
            <Metric label="NOI registrado / mes" value={fmtMoney(noi)} />
            <Metric label="Ocupación documentada" value={fmtPct(occupied)} />
            <Metric
              label="XIRR de flujos inversor"
              value={fmtPct(irr === null ? null : irr * 100)}
              note="ACT/365 · aportaciones/distribuciones; excluye equity retenido"
            />
            <Metric
              label="Capital velocity prevista"
              value={
                velocity.length === assets.length
                  ? `${Math.round(velocity.reduce((a, b) => a + b, 0) / velocity.length)} meses`
                  : "Sin datos"
              }
              note="Media por activo · supuestos guardados"
            />
          </div></details>
          <Panel>
            <h2>Previsión frente a realidad</h2>
            <p>
              Importes mensuales. Sin cierre registrado se muestra «Sin datos».
            </p>
            <div className="portfolio-table">
              <div className="portfolio-table-row">
                <b>Activo</b>
                <b>Previsto</b>
                <b>Real</b>
                <b>Desviación</b>
                <b>CAPEX</b>
              </div>
              {rows.map(({ deal, actual }) => {
                const forecast = actual?.forecast?.outputs as
                  { netMonthlyCashFlow?: number } | undefined;
                const predicted =
                  forecast?.netMonthlyCashFlow ??
                  dealOutput(deal)?.netMonthlyCashFlow;
                const real = actual
                  ? actual.rent_received -
                    actual.operating_expenses -
                    actual.debt_payment -
                    actual.capex
                  : null;
                return (
                  <button
                    className="portfolio-table-row"
                    key={deal.id}
                    onClick={() => onOpen(deal)}
                  >
                    <strong>
                      {deal.title}
                      <small>{deal.municipality}</small>
                    </strong>
                    <span>{fmtMoney(predicted)}</span>
                    <span>{real === null ? "Sin datos" : fmtMoney(real)}</span>
                    <span>
                      {real === null || predicted === undefined
                        ? "—"
                        : fmtMoney(real - predicted)}
                    </span>
                    <span>{fmtMoney(actual?.capex)}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
          <div className="portfolio-visuals">
            <Panel>
              <h2>Capital documentado</h2>
              {value !== null && debt !== null && value > 0 ? (
                <>
                  <div className="equity-bar">
                    <i
                      style={{
                        width: `${Math.min(100, (debt / value) * 100)}%`,
                      }}
                    />
                    <span />
                  </div>
                  <div className="capital-legend">
                    <span>Deuda {fmtMoney(debt)}</span>
                    <span>Equity {fmtMoney(value - debt)}</span>
                  </div>
                </>
              ) : (
                <p className="compact-empty">
                  Completa valor y saldo de deuda en cada cierre.
                </p>
              )}
              <h3>Distribución por municipio</h3>
              {allocation.map((a) => (
                <div className="allocation-row" key={a.city}>
                  <span>{a.city}</span>
                  <i style={{ width: `${(a.n / assets.length) * 100}%` }} />
                  <b>{a.n}</b>
                </div>
              ))}
            </Panel>
            <Panel>
              <h2>Cash-flow mensual</h2>
              {timeline.length ? (
                <svg
                  className="cashflow-chart"
                  viewBox="0 0 620 230"
                  role="img"
                  aria-label="Cash-flow real por mes"
                >
                  <line
                    x1="15"
                    x2="605"
                    y1="140"
                    y2="140"
                    stroke="var(--line-strong)"
                  />
                  {timeline.slice(-12).map((t, i, all) => {
                    const max = Math.max(1, ...all.map((r) => Math.abs(r.cf)));
                    const h = (Math.abs(t.cf) / max) * 100;
                    const x = 20 + (i * 580) / all.length;
                    return (
                      <g key={t.period}>
                        <rect
                          x={x}
                          y={t.cf >= 0 ? 140 - h : 140}
                          width={Math.min(48, 500 / all.length)}
                          height={h}
                          rx="3"
                          fill={t.cf >= 0 ? "var(--green)" : "var(--red)"}
                        />
                        <text x={x} y="220" fontSize="11" fill="var(--muted)">
                          {t.period.slice(5, 7)}
                        </text>
                        <title>
                          {t.period}: {fmtMoney(t.cf)} · {t.n}/{assets.length}{" "}
                          activos
                        </title>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <p className="compact-empty">
                  El primer cierre iniciará la serie.
                </p>
              )}
            </Panel>
          </div>
          <details className="panel">
            <summary>Mapa de activos</summary>
            <AssetMap deals={assets} onOpen={onOpen} />
          </details>
          <Panel>
            <h2>Activos y estrategia</h2>
            {assets.map((d) => (
              <div className="asset-strategy-row" key={d.id}>
                <button onClick={() => onOpen(d)}>
                  <strong>{d.title}</strong>
                  <small>{d.municipality}</small>
                </button>
                <div className="segmented">
                  {(["hold", "refinance", "sell"] as const).map((mode) => (
                    <button
                      className={
                        strategy?.id === d.id && strategy.mode === mode
                          ? "active"
                          : ""
                      }
                      key={mode}
                      onClick={() => setStrategy({ id: d.id, mode })}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
          {strategy && (
            <StrategyDesk
              key={`${strategy.id}-${strategy.mode}`}
              deal={assets.find((d) => d.id === strategy.id)!}
              user={user}
              initialStrategy={strategy.mode}
              onSaved={() => {}}
            />
          )}

          <details className="panel"><summary>Error de previsión · revisión del modelo</summary>
            <label>
              Agrupar por
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
              >
                <option value="city">Municipio</option>
                <option value="asset">Tipo de activo</option>
                <option value="strategy">Estrategia</option>
              </select>
            </label>
            <p>
              Cash-flow mensual antes de CAPEX extraordinario frente a la
              previsión guardada. No modifica modelos automáticamente. Meses del
              mismo activo no son observaciones independientes.
            </p>
            {[...calibration].map(([group, g]) => (
              <div className="attention-row" key={group}>
                <strong>{group}</strong>
                <span>
                  N {g.n} cierres · error medio {fmtMoney(g.error / g.n)}/mes
                </span>
              </div>
            ))}
          </details>
        </>
      )}
    </div>
  );
}
