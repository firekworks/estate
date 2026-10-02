"use client";
import { humanError } from "@/lib/estate-errors";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import type { SavedDeal } from "@/lib/estate-store";
import {
  loadOperations,
  saveOperation,
  type OperationTable,
  type OperationalRecord,
} from "@/lib/estate-operations";
import { dealInput, dealOutput, fmtMoney, Panel } from "./estate-primitives";
import { supabase } from "@/lib/supabase";
import { projectHold } from "@/lib/estate-hold";
import { mortgagePayment } from "@/lib/estate-engine";
import {
  marketDistribution,
  refinance,
  saleProceeds,
} from "@/lib/estate-market";

type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  optional?: boolean;
};
const sections: Record<
  string,
  { table: OperationTable; label: string; fields: Field[] }
> = {
  capital: {
    table: "estate_investor_cashflows",
    label: "Movimientos de capital",
    fields: [
      { key: "occurred_at", label: "Fecha efectiva", type: "date" },
      {
        key: "direction",
        label: "Dirección",
        options: ["contribution", "distribution"],
      },
      { key: "amount", label: "Importe €", type: "number" },
      { key: "source", label: "Justificante / descripción" },
    ],
  },
  tasks: {
    table: "estate_tasks",
    label: "Plan y tareas",
    fields: [
      { key: "title", label: "Siguiente acción" },
      {
        key: "due_at",
        label: "Fecha límite",
        type: "datetime-local",
        optional: true,
      },
      { key: "owner_label", label: "Responsable", optional: true },
    ],
  },
  visits: {
    table: "estate_visits",
    label: "Visitas",
    fields: [
      { key: "scheduled_at", label: "Fecha de visita", type: "datetime-local" },
      {
        key: "notes",
        label: "Notas y medidas",
        type: "textarea",
        optional: true,
      },
    ],
  },
  offers: {
    table: "estate_offers",
    label: "Negociación",
    fields: [
      { key: "amount", label: "Importe €", type: "number" },
      { key: "direction", label: "Tipo", options: ["offer", "counteroffer"] },
      {
        key: "conditions",
        label: "Condiciones",
        type: "textarea",
        optional: true,
      },
      {
        key: "expires_at",
        label: "Caducidad",
        type: "datetime-local",
        optional: true,
      },
    ],
  },
  documents: {
    table: "estate_documents",
    label: "Documentos",
    fields: [
      { key: "title", label: "Documento" },
      {
        key: "category",
        label: "Categoría",
        options: [
          "nota_simple",
          "catastro",
          "comunidad",
          "ITE_IEE",
          "urbanismo",
          "licencia",
          "seguro",
          "fiscalidad",
          "other",
        ],
      },
      { key: "url", label: "Enlace privado al documento", type: "url" },
      {
        key: "verified_at",
        label: "Verificado manualmente en fecha",
        type: "datetime-local",
        optional: true,
      },
    ],
  },
  actual: {
    table: "estate_actual_performance",
    label: "Resultado real",
    fields: [
      { key: "period", label: "Mes (primer día)", type: "date" },
      { key: "rent_received", label: "Renta cobrada €", type: "number" },
      {
        key: "operating_expenses",
        label: "Gastos operativos €",
        type: "number",
      },
      { key: "debt_payment", label: "Cuota de deuda €", type: "number" },
      { key: "capex", label: "CAPEX / reforma €", type: "number" },
      {
        key: "debt_balance",
        label: "Saldo de deuda €",
        type: "number",
        optional: true,
      },
      {
        key: "valuation",
        label: "Tasación / valor documentado €",
        type: "number",
        optional: true,
      },
      {
        key: "occupied_days",
        label: "Días ocupado",
        type: "number",
        optional: true,
      },
      { key: "source", label: "Fuente / justificante" },
    ],
  },
  tenants: {
    table: "estate_tenancies",
    label: "Explotación y alquiler",
    fields: [
      {
        key: "stage",
        label: "Fase",
        options: [
          "ready",
          "marketing",
          "leads",
          "visits",
          "screening",
          "contract",
          "occupied",
          "ended",
        ],
      },
      {
        key: "asking_rent",
        label: "Renta anunciada €",
        type: "number",
        optional: true,
      },
      {
        key: "achieved_rent",
        label: "Renta acordada €",
        type: "number",
        optional: true,
      },
      { key: "started_at", label: "Inicio", type: "date", optional: true },
      { key: "ended_at", label: "Fin", type: "date", optional: true },
      { key: "channel", label: "Canal", optional: true },
      {
        key: "channel_cost",
        label: "Coste del canal €",
        type: "number",
        optional: true,
      },
      { key: "leads", label: "Contactos", type: "number", optional: true },
      { key: "visits", label: "Visitas", type: "number", optional: true },
    ],
  },
  comps: {
    table: "estate_comparables",
    label: "Comparables",
    fields: [
      { key: "municipality", label: "Municipio" },
      {
        key: "property_type",
        label: "Tipo",
        options: [
          "apartment",
          "house",
          "studio",
          "commercial",
          "office",
          "building",
          "garage",
          "land",
        ],
      },
      {
        key: "transaction_type",
        label: "Operación",
        options: ["rent", "sale"],
      },
      { key: "price", label: "Precio €", type: "number" },
      { key: "area_m2", label: "Superficie m²", type: "number" },
      { key: "source", label: "Fuente" },
      { key: "url", label: "URL", type: "url" },
      { key: "observed_at", label: "Fecha observada", type: "date" },
      {
        key: "similarity",
        label: "Similitud 0–1 (si evaluada)",
        type: "number",
        optional: true,
      },
    ],
  },
  evidence: {
    table: "estate_evidence",
    label: "Evidencias",
    fields: [
      { key: "field", label: "Dato evaluado" },
      {
        key: "kind",
        label: "Tipo",
        options: ["fact", "estimate", "assumption"],
      },
      { key: "value", label: "Valor / rango" },
      { key: "source", label: "Fuente" },
      { key: "url", label: "URL", type: "url", optional: true },
      { key: "observed_at", label: "Fecha", type: "datetime-local" },
      { key: "method", label: "Método / modelo" },
      { key: "confidence", label: "Confianza 0–1", type: "number" },
    ],
  },
};
const checklist = [
  "Electricidad",
  "Presión de agua",
  "Humedades visibles",
  "Ventanas",
  "Ruido",
  "Luz y orientación",
  "Estructura visual",
  "Cubierta y fachada",
  "Ascensor",
  "Zonas comunes",
  "Ocupación",
  "Suministros",
  "Medidas",
  "Licencia y uso",
  "Salida de emergencia",
  "Ventilación",
];
const translations: Record<string, string> = {
  contribution: "Aportación del inversor",
  distribution: "Distribución al inversor",
  open: "Pendiente",
  done: "Hecha",
  offer: "Oferta",
  counteroffer: "Contraoferta",
  ready: "Preparado",
  marketing: "Anunciado",
  leads: "Contactos",
  visits: "Visitas",
  screening: "Evaluación económica",
  contract: "Contrato",
  occupied: "Ocupado",
  ended: "Finalizado",
  rent: "Alquiler",
  sale: "Venta",
  fact: "Hecho",
  estimate: "Estimación",
  assumption: "Supuesto",
};
export function OperationsDesk({
  user,
  deal,
  onRefresh,
}: {
  user: User;
  deal: SavedDeal;
  onRefresh: () => Promise<void>;
}) {
  const [section, setSection] = useState("tasks"),
    [rows, setRows] = useState<
      Partial<Record<OperationTable, OperationalRecord[]>>
    >({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      created_at: string;
      event_type: string;
      payload: Record<string, unknown>;
    }>
  >([]);
  const [strategies, setStrategies] = useState<
    Array<{
      id: string;
      created_at: string;
      model_version: string;
      outputs: Record<string, number | null>;
    }>
  >([]);
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from("estate_audit_events")
        .select("id,created_at,event_type,payload")
        .eq("property_id", deal.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("estate_strategy_snapshots")
        .select("id,created_at,model_version,outputs")
        .eq("property_id", deal.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([a, b]) => {
      if (active) {
        if (a.error || b.error)
          setMessage(
            a.error?.message ?? b.error?.message ?? "Error de historial",
          );
        else {
          setHistory(a.data ?? []);
          setStrategies(b.data ?? []);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [deal.id, revision]);
  const [checks, setChecks] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    loadOperations(deal.id)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setMessage(humanError(e));
      });
    return () => {
      active = false;
    };
  }, [deal.id, revision]);
  const config = sections[section],
    records = rows[config.table] ?? [];
  const acquired = [
    "purchased",
    "rehab",
    "marketing",
    "managed",
    "sold",
  ].includes(deal.stage);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const fd = new FormData(form),
        values: Record<string, unknown> = {};
      for (const field of config.fields) {
        const raw = String(fd.get(field.key) ?? "").trim();
        values[field.key] = !raw
          ? null
          : field.type === "number"
            ? Number(raw)
            : field.type === "datetime-local"
              ? new Date(raw).toISOString()
              : raw;
      }
      if (section === "tasks") values.status = "open";
      if (section === "visits") {
        values.checklist = checks;
        values.completed_at = fd.get("completed")
          ? new Date().toISOString()
          : null;
      }
      if (section === "actual") {
        if (!acquired)
          throw new Error("Solo activos comprados admiten resultados reales.");
        if (String(values.period).slice(-2) !== "01")
          throw new Error("Selecciona el primer día del mes.");
        values.forecast = {
          engine: dealOutput(deal)?.engineVersion,
          inputs: dealInput(deal),
          outputs: dealOutput(deal),
        };
      }
      if (section === "comps" && Number(values.similarity) > 1)
        throw new Error("Similitud debe estar entre 0 y 1.");
      await saveOperation(config.table, user.id, deal.id, values);
      await onRefresh();
      form.reset();
      setChecks({});
      setRevision((r) => r + 1);
      setMessage("Guardado y confirmado por la base de datos.");
    } catch (e) {
      setMessage(humanError(e,"No se pudo guardar."));
    } finally {
      setBusy(false);
    }
  }
  async function complete(row: OperationalRecord) {
    try {
      await saveOperation(
        "estate_tasks",
        user.id,
        deal.id,
        { status: row.status === "done" ? "open" : "done" },
        row.id,
      );
      setRevision((r) => r + 1);
    } catch (e) {
      setMessage(String(e));
    }
  }
  const comps = (rows.estate_comparables ?? [])
    .filter(
      (r) =>
        r.transaction_type === "rent" &&
        r.property_type === deal.property_type &&
        r.municipality === deal.municipality,
    )
    .map((r) => ({
      price: Number(r.price),
      area_m2: Number(r.area_m2),
      observed_at: String(r.observed_at),
      similarity: r.similarity === null ? null : Number(r.similarity),
      url: String(r.url),
    }));
  const dist = marketDistribution(comps);
  return (
    <div className="operations-desk">
      <nav className="operation-nav" aria-label="Operativa del inmueble">
        {Object.entries(sections).map(([key, s]) => (
          <button
            className={key === section ? "active" : ""}
            key={key}
            onClick={() => setSection(key)}
          >
            {s.label}
            <span>{rows[s.table]?.length ?? "—"}</span>
          </button>
        ))}
      </nav>
      <div className="operations-body">
        <h2>{config.label}</h2>
        {message && <p role="status">{message}</p>}
        {section === "comps" && (
          <div className="metric-strip">
            <span>
              N {dist.n} ·{" "}
              {dist.status === "insufficient"
                ? "Muestra insuficiente"
                : dist.status === "indicative"
                  ? "Orientativa"
                  : "Útil"}{" "}
              · últimos 180 días
            </span>
            <strong>
              P25 {fmtMoney(dist.p25)} · P50 {fmtMoney(dist.p50)} · P75{" "}
              {fmtMoney(dist.p75)}
            </strong>
          </div>
        )}
        {section === "capital" && (
          <p>
            Registra flujos reales entre inversor y operación. No repitas como
            distribución el alquiler que sigue dentro de la operación; no se
            agregan automáticamente los cierres mensuales.
          </p>
        )}
        {section === "offers" && (
          <div className="metric-strip">
            Pedido {fmtMoney(dealInput(deal)?.purchasePrice)} · Mercado{" "}
            {fmtMoney(dealInput(deal)?.marketValueEstimate)} · Máximo{" "}
            {fmtMoney(dealOutput(deal)?.maxPurchasePrice)} · Apertura (supuesto
            −5%) {fmtMoney(dealOutput(deal)?.recommendedOpeningOffer)}
          </div>
        )}
        <div className="operations-grid">
          <Panel>
            <form key={section} className="operation-form" onSubmit={submit}>
              {config.fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.optional ? " · opcional" : ""}
                  {field.options ? (
                    <select
                      name={field.key}
                      defaultValue={
                        field.key === "property_type"
                          ? deal.property_type
                          : field.options[0]
                      }
                    >
                      {field.options.map((value) => (
                        <option key={value} value={value}>
                          {translations[value] ?? value}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea name={field.key} required={!field.optional} />
                  ) : (
                    <input
                      name={field.key}
                      type={field.type ?? "text"}
                      step="any"
                      min={field.type === "number" ? 0 : undefined}
                      required={!field.optional}
                      defaultValue={
                        field.key === "municipality"
                          ? (deal.municipality ?? "")
                          : undefined
                      }
                    />
                  )}
                </label>
              ))}
              {section === "visits" && (
                <fieldset>
                  <legend>Comprobaciones en visita</legend>
                  {checklist.map((label) => (
                    <label key={label}>
                      {label}
                      <select
                        value={checks[label] ?? "pending"}
                        onChange={(e) =>
                          setChecks({ ...checks, [label]: e.target.value })
                        }
                      >
                        <option value="pending">Sin comprobar</option>
                        <option value="verified">Comprobado</option>
                        <option value="needs_inspection">
                          Requiere inspección / riesgo
                        </option>
                        <option value="not_applicable">No aplica</option>
                      </select>
                    </label>
                  ))}
                  <label>
                    <input type="checkbox" name="completed" /> Visita finalizada
                  </label>
                  <p>
                    Al finalizar se registran riesgos bloqueantes para los
                    hallazgos que requieren inspección y una tarea de
                    seguimiento. Incorpora los presupuestos al reanalizar: no se
                    inventarán costes.
                  </p>
                </fieldset>
              )}
              <button
                className="primary-button"
                disabled={busy || (section === "actual" && !acquired)}
              >
                {busy ? "Guardando…" : "Guardar registro"}
              </button>
            </form>
          </Panel>
          <Panel>
            <h3>Historial</h3>
            {!records.length ? (
              <p>Sin registros. Los datos aparecerán después de guardarlos.</p>
            ) : (
              records.map((row) => (
                <article className="operation-record" key={row.id}>
                  <small>
                    {new Date(row.created_at).toLocaleString("es-ES")}
                  </small>
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <span>{field.label}</span>
                      <strong>
                        {row[field.key] === null
                          ? "Sin datos"
                          : (translations[String(row[field.key])] ??
                            String(row[field.key] ?? "—"))}
                      </strong>
                    </div>
                  ))}
                  {section === "tasks" && (
                    <button
                      className="ghost-button"
                      onClick={() => complete(row)}
                    >
                      {row.status === "done" ? "Reabrir" : "Marcar hecha"}
                    </button>
                  )}
                  {section === "actual" && (
                    <div>
                      <span>Cash-flow real del mes</span>
                      <strong>
                        {fmtMoney(
                          Number(row.rent_received) -
                            Number(row.operating_expenses) -
                            Number(row.debt_payment) -
                            Number(row.capex),
                        )}
                      </strong>
                    </div>
                  )}
                </article>
              ))
            )}
          </Panel>
        </div>
        {section === "actual" && (
          <>
            <StrategyDesk
              deal={deal}
              user={user}
              onSaved={() => setRevision((r) => r + 1)}
            />
            <details className="panel">
              <summary>Escenarios guardados ({strategies.length})</summary>
              {strategies.map((s) => (
                <p key={s.id}>
                  {new Date(s.created_at).toLocaleString("es-ES")} ·{" "}
                  {s.model_version} · refinanciación{" "}
                  {fmtMoney(s.outputs.released)} · venta{" "}
                  {fmtMoney(s.outputs.saleNet)}
                </p>
              ))}
            </details>
          </>
        )}
        <details className="panel">
          <summary>Historial del inmueble ({history.length})</summary>
          {history.map((h) => (
            <p key={h.id}>
              {new Date(h.created_at).toLocaleString("es-ES")} · {h.event_type}{" "}
              {h.payload?.from ? `${h.payload.from} → ${h.payload.to}` : ""}
            </p>
          ))}
        </details>
      </div>
    </div>
  );
}
export function StrategyDesk({
  deal,
  user,
  onSaved,
  initialStrategy = "hold",
}: {
  deal: SavedDeal;
  user: User;
  onSaved: () => void;
  initialStrategy?: "hold" | "refinance" | "sell";
}) {
  const [strategy, setStrategy] = useState(initialStrategy);
  const input = dealInput(deal),
    out = dealOutput(deal);
  const [value, setValue] = useState(input?.marketValueEstimate ?? 0),
    [debt, setDebt] = useState(out?.loanAmount ?? 0),
    [ltv, setLtv] = useState(60),
    [fees, setFees] = useState(0),
    [taxes, setTaxes] = useState(0),
    [agency, setAgency] = useState(0),
    [interest, setInterest] = useState(3.5),
    [years, setYears] = useState(25),
    [message, setMessage] = useState("");
  const [horizon, setHorizon] = useState(5),
    [growth, setGrowth] = useState(0),
    [discount, setDiscount] = useState(5),
    [holdRate, setHoldRate] = useState(input?.interestPct ?? 0),
    [holdTerm, setHoldTerm] = useState(input?.termYears ?? 0),
    [annualCapex, setAnnualCapex] = useState(0);
  const payment = mortgagePayment((value * ltv) / 100, interest, years),
    noi = out?.noiMonthly ?? null;
  const hold =
    noi === null
      ? null
      : projectHold({
          value,
          debt,
          annualRatePct: holdRate,
          remainingTermYears: holdTerm,
          horizonYears: horizon,
          appreciationPct: growth,
          discountPct: discount,
          monthlyNoi: noi,
          saleCosts: taxes + agency + fees,
          annualCapex,
        });
  const outputs = {
    holdProjection: hold,
    released: refinance(value, ltv, debt, fees),
    saleNet: saleProceeds(value, debt, taxes, agency, fees),
    postRefinancePayment: payment,
    postRefinanceCashFlow: noi === null ? null : noi - payment,
    postRefinanceDscr: noi === null || !payment ? null : noi / payment,
    holdMonthly: out?.netMonthlyCashFlow ?? null,
  };
  async function save() {
    const { error } = await supabase
      .from("estate_strategy_snapshots")
      .insert({
        user_id: user.id,
        property_id: deal.id,
        inputs: {
          value,
          debt,
          ltv,
          fees,
          taxes,
          agency,
          interest,
          years,
          noi,
          horizon,
          growth,
          discount,
          holdRate,
          holdTerm,
          annualCapex,
        },
        outputs,
        model_version: "estate_strategy_v2",
      });
    setMessage(
      error ? humanError(error) : "Escenario guardado con fecha y versión.",
    );
    if (!error) onSaved();
  }
  return (
    <Panel>
      <div className="panel-head">
        <h3>Estrategia · {deal.title}</h3>
        <div className="segmented">
          {(["hold", "refinance", "sell"] as const).map((s) => (
            <button
              className={strategy === s ? "active" : ""}
              key={s}
              onClick={() => setStrategy(s)}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p>
        Supuestos editables. La deuda inicial es la del análisis, sustitúyela
        por el saldo actual. No representa aprobación bancaria.
      </p>
      <div className="field-grid three">
        {(
          [
            ["Valor / precio", value, setValue],
            ["Deuda pendiente", debt, setDebt],
            ["LTV %", ltv, setLtv],
            ["Gastos totales", fees, setFees],
            ["Impuestos venta", taxes, setTaxes],
            ["Agencia venta", agency, setAgency],
            ["Interés nuevo %", interest, setInterest],
            ["Plazo nuevo años", years, setYears],
          ] as const
        ).map(([label, v, set]) => (
          <label key={label}>
            {label}
            <input
              type="number"
              min="0"
              max={label === "LTV %" ? 100 : undefined}
              value={v}
              onChange={(e) => set(Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      {strategy === "refinance" && (
        <p>
          Capital liberado {fmtMoney(outputs.released)} · cuota{" "}
          {fmtMoney(payment)} · cash-flow{" "}
          {fmtMoney(outputs.postRefinanceCashFlow)}/mes · DSCR{" "}
          {outputs.postRefinanceDscr?.toFixed(2) ?? "Sin datos"}.
        </p>
      )}
      {strategy === "sell" && (
        <p>
          Neto de venta después de deuda y costes: {fmtMoney(outputs.saleNet)}.
        </p>
      )}
      {strategy === "hold" && (
        <>
          <h4>Proyección de mantener</h4>
          <p>
            NOI constante, amortización mensual y CAPEX anual. Apreciación y
            descuento son supuestos; impuestos y gastos de venta se mantienen al
            importe introducido, sin simulación fiscal.
          </p>
          <div className="field-grid three">
            {(
              [
                ["Horizonte años", horizon, setHorizon],
                ["Apreciación anual %", growth, setGrowth],
                ["Coste oportunidad anual %", discount, setDiscount],
                ["Interés deuda actual %", holdRate, setHoldRate],
                ["Plazo restante actual años", holdTerm, setHoldTerm],
                ["CAPEX anual previsto €", annualCapex, setAnnualCapex],
              ] as const
            ).map(([label, v, set]) => (
              <label key={label}>
                {label}
                <input
                  type="number"
                  value={v}
                  onChange={(e) => set(Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          {hold ? (
            <>
              <p>
                Cash-flow acumulado: {fmtMoney(hold.totalCash)}. Neto de venta
                al final: {fmtMoney(hold.terminalNet)}. Valor actual de
                mantener: {fmtMoney(hold.holdPresentValue)}. Venta hoy:{" "}
                {fmtMoney(hold.sellNow)}. Diferencia descontada:{" "}
                {fmtMoney(hold.advantagePresentValue)}.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Valor supuesto</th>
                      <th>Deuda</th>
                      <th>Cash-flow anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hold.rows.map((r) => (
                      <tr key={r.year}>
                        <td>{r.year}</td>
                        <td>{fmtMoney(r.value)}</td>
                        <td>{fmtMoney(r.debt)}</td>
                        <td>{fmtMoney(r.cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>
              Faltan datos válidos para proyectar: valor, NOI, horizonte entero
              entre 1 y 50 años y plazo si hay deuda.
            </p>
          )}
        </>
      )}
      <button className="ghost-button" onClick={save}>
        Guardar escenario de estrategia
      </button>
      {message && <p role="status">{message}</p>}
    </Panel>
  );
}
