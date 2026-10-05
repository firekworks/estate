"use client";
import { useRef } from "react";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import type { PropertyDraft } from "@/lib/estate-store";
import { analysisReadiness } from "@/lib/estate-readiness";
import {
  DataMeter,
  fmtMoney,
  fmtPct,
  Metric,
  ScoreDial,
} from "./estate-primitives";

export function StressDisclosure({
  analysis,
}: {
  analysis: DealAnalysis | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scenarios = analysis?.stress.filter((s) => s.key !== "base") ?? [];
  const passes = scenarios.filter((s) => s.passes).length;
  return (
    <div className="stress-summary">
      <div>
        <span className="eyebrow">RESISTENCIA</span>
        <strong>
          {analysis ? `${passes}/${scenarios.length}` : "Sin evaluar"}
        </strong>
      </div>
      {analysis && (
        <>
          <meter
            aria-label="Escenarios superados"
            min={0}
            max={scenarios.length}
            value={passes}
          />
          <button
            className="ghost-button"
            onClick={() => dialog.current?.showModal()}
          >
            Ver escenarios
          </button>
          <dialog
            ref={dialog}
            className="decision-dialog"
            aria-label="Escenarios de resistencia"
          >
            <div className="panel-head">
              <h2>Escenarios de resistencia</h2>
              <button
                className="ghost-button"
                onClick={() => dialog.current?.close()}
              >
                Cerrar
              </button>
            </div>
            <div className="stress-matrix">
              {scenarios.map((s) => (
                <div key={s.key} className={s.passes ? "pass" : "fail"}>
                  <span>{s.label}</span>
                  <strong>{fmtMoney(s.monthlyCashFlow)}/mes</strong>
                  <small>
                    {s.passes ? "Resiste" : "No resiste"} ·{" "}
                    {s.dscr === null
                      ? "Sin deuda"
                      : `DSCR ${s.dscr.toFixed(2)}`}
                  </small>
                </div>
              ))}
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
export function DecisionSummary({
  draft,
  inputs,
  analysis,
  onContinue,
  compact = false,
  blocked = false,
}: {
  blocked?: boolean;
  compact?: boolean;
  draft: PropertyDraft;
  inputs: DealInputs;
  analysis: DealAnalysis | null;
  onContinue: (step: number) => void;
}) {
  const ready = analysisReadiness(draft, inputs);
  if (!analysis)
    return (
      <div className="decision-incomplete" data-calculation-state={ready.state}>
        <span className="eyebrow">
          {ready.state === "EMPTY" ? "EMPEZAR" : "PENDIENTE DE VALIDAR"}
        </span>
        <h2>Análisis incompleto</h2>
        <DataMeter value={ready.coverage} label="cobertura" />
        <ul>
          {ready.missing.slice(0, 3).map((m) => (
            <li key={m.key}>{m.label}</li>
          ))}
        </ul>
        <button
          className="primary-button"
          onClick={() => onContinue(ready.missing[0]?.step ?? 0)}
        >
          Continuar análisis
        </button>
      </div>
    );
  const signals = [
    {
      label: "Mercado",
      tone: inputs.marketValueEstimate ? "warning" : "unknown",
      detail: inputs.marketValueEstimate
        ? "Valor introducido; contrasta comparables antes de ofertar."
        : "Falta contrastar el valor con comparables.",
    },
    {
      label: "Alquiler",
      tone: ready.state === "VALIDATED" ? "positive" : "warning",
      detail:
        ready.state === "VALIDATED"
          ? "Evidencia registrada."
          : "Renta estimada: pendiente de contrastar.",
    },
    {
      label: "Reforma",
      tone: inputs.renovation > 0 ? "warning" : "unknown",
      detail:
        inputs.renovation > 0
          ? `Presupuesto estimado ${fmtMoney(inputs.renovation)}.`
          : "Sin presupuesto de reforma. Verifica el estado.",
    },
    {
      label: "Electricidad",
      tone: draft.features?.electricity ? "warning" : "unknown",
      detail: draft.features?.electricity || "Instalación sin verificar.",
    },
    {
      label: "Comunidad",
      tone: inputs.communityMonthly > 0 ? "warning" : "unknown",
      detail: `Coste declarado ${fmtMoney(inputs.communityMonthly)}/mes. Verifica cuotas y derramas.`,
    },
  ];
  return (
    <div className="decision-summary" data-calculation-state={ready.state}>
      <div className="decision-hero">
        <ScoreDial
          score={blocked ? null : analysis.score}
          size={compact ? "md" : "lg"}
        />
        <div>
          <span className="eyebrow">
            {ready.state === "VALIDATED" ? "DATOS VALIDADOS" : "ESTIMACIÓN"}
          </span>
          <h2>{blocked ? "No avanzar" : analysis.verdict}</h2>
          <span>Confianza {Math.round(ready.confidence * 100)}%</span>
        </div>
      </div>
      <div className="decision-metrics">
        <Metric label="Máximo" value={fmtMoney(analysis.maxPurchasePrice)} />
        <Metric
          label="Cash-flow"
          value={`${fmtMoney(analysis.netMonthlyCashFlow)}/mes`}
        />
        <Metric label="Yield neta" value={fmtPct(analysis.netYieldPct)} />
      </div>
      {!compact && (
        <>
          <div className="decision-signals">
            {blocked && (
              <details className="signal signal-blocker">
                <summary>
                  <i />
                  Bloqueantes
                </summary>
                <p>
                  Hay riesgos abiertos que impiden avanzar. Revisa el registro
                  de riesgos.
                </p>
              </details>
            )}
            {signals.map((s) => (
              <details key={s.label} className={`signal signal-${s.tone}`}>
                <summary>
                  <i />
                  {s.label}
                </summary>
                <p>{s.detail}</p>
              </details>
            ))}
          </div>
          <StressDisclosure analysis={analysis} />
          <details className="decision-context">
            <summary>Supuestos y límites</summary>
            <p>
              Estimación orientativa, no tasación. Confianza declarada y
              cobertura son independientes del score.
            </p>
            <dl>
              {Object.entries(analysis.purchaseCeilings).map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {{
                      yield: "Rentabilidad objetivo",
                      cashflow: "Cash-flow mínimo",
                      dscr: "Cobertura de deuda",
                      market_comps: "Comparables",
                      financing: "Financiación",
                      available_capital: "Capital disponible",
                      appraisal: "Tasación",
                    }[k] ?? k}
                  </dt>
                  <dd>{fmtMoney(v)}</dd>
                </div>
              ))}
            </dl>
            <ul>
              {[...analysis.strengths, ...analysis.weaknesses].map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </details>
        </>
      )}
      {compact && (
        <button className="ghost-button" onClick={() => onContinue(5)}>
          Ver decisión
        </button>
      )}
    </div>
  );
}
