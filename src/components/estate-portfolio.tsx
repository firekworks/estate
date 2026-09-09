"use client";

import { ArrowRight, Building2, CircleDollarSign, LineChart, Wallet } from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
import {
  dealInput,
  dealOutput,
  fmtMoney,
  fmtPct,
  Metric,
  Panel,
  SectionHead,
} from "@/components/estate-primitives";

export function PortfolioView({ deals, onOpen, onOpportunities }: { deals: SavedDeal[]; onOpen: (deal: SavedDeal) => void; onOpportunities: () => void }) {
  const assets = deals.filter((deal) => deal.stage === "purchased" || deal.stage === "managed");
  const rows = assets.map((deal) => {
    const input = dealInput(deal);
    const out = dealOutput(deal);
    const value = input?.marketValueEstimate || input?.purchasePrice || 0;
    const debt = out?.loanAmount ?? 0;
    const equity = Math.max(0, value - debt);
    return { deal, input, out, value, debt, equity };
  });
  const totalValue = rows.reduce((sum, item) => sum + item.value, 0);
  const totalDebt = rows.reduce((sum, item) => sum + item.debt, 0);
  const totalEquity = rows.reduce((sum, item) => sum + item.equity, 0);
  const cashflow = rows.reduce((sum, item) => sum + (item.out?.netMonthlyCashFlow ?? 0), 0);
  const avgYield = rows.length ? rows.reduce((sum, item) => sum + (item.out?.netYieldPct ?? 0), 0) / rows.length : 0;

  if (!assets.length) {
    return (
      <div className="view view-portfolio">
        <SectionHead eyebrow="PORTFOLIO" title="La cartera empieza después de comprar." copy="Este módulo no enseña oportunidades: solo activos adquiridos y su rendimiento frente a lo que Estate predijo." />
        <Panel className="portfolio-empty">
          <div className="flywheel">
            <div className="flywheel-core"><Wallet size={23} /><strong>Capital</strong></div>
            <span className="flywheel-node n1">Comprar</span><span className="flywheel-node n2">Mejorar</span><span className="flywheel-node n3">Alquilar</span><span className="flywheel-node n4">Ahorrar</span><span className="flywheel-node n5">Repetir</span>
          </div>
          <div className="portfolio-empty-copy"><span className="eyebrow">CAPITAL VELOCITY</span><h2>Todavía no hay activos.</h2><p>Cuando una operación pase a “Comprada”, aparecerá aquí con deuda, equity estimado, cash-flow y seguimiento real vs. previsto.</p><button className="primary-button" onClick={onOpportunities}>Volver al pipeline <ArrowRight size={14} /></button></div>
        </Panel>
      </div>
    );
  }

  const debtPct = totalValue > 0 ? Math.min(100, (totalDebt / totalValue) * 100) : 0;
  return (
    <div className="view view-portfolio">
      <SectionHead eyebrow="PORTFOLIO" title="Patrimonio y velocidad de capital." copy="Solo activos comprados. Las valoraciones siguen marcadas como estimaciones hasta disponer de una tasación o evidencia externa." />

      <div className="portfolio-kpis">
        <Metric label="Valor estimado" value={fmtMoney(totalValue)} note={`${assets.length} activos`} />
        <Metric label="Deuda" value={fmtMoney(totalDebt)} note={`${Math.round(debtPct)}% LTV agregado`} />
        <Metric label="Equity estimado" value={fmtMoney(totalEquity)} tone="accent" />
        <Metric label="Cash-flow" value={`${fmtMoney(cashflow)}/mes`} tone={cashflow >= 0 ? "good" : "bad"} />
        <Metric label="Yield media" value={fmtPct(avgYield)} />
      </div>

      <div className="portfolio-grid">
        <Panel className="equity-structure">
          <div className="panel-head"><div><span className="eyebrow">ESTRUCTURA</span><h3>Equity vs. deuda</h3></div><CircleDollarSign size={17} /></div>
          <div className="equity-hero"><strong>{fmtMoney(totalEquity)}</strong><span>equity estimado</span></div>
          <div className="equity-bar"><i className="equity-part" style={{ width: `${100 - debtPct}%` }} /><i className="debt-part" style={{ width: `${debtPct}%` }} /></div>
          <div className="equity-legend"><span><i className="equity-dot" />Equity {fmtMoney(totalEquity)}</span><span><i className="debt-dot" />Deuda {fmtMoney(totalDebt)}</span></div>
        </Panel>

        <Panel className="portfolio-performance">
          <div className="panel-head"><div><span className="eyebrow">PERFORMANCE</span><h3>Qué aporta cada activo</h3></div><LineChart size={17} /></div>
          <div className="performance-bars">
            {rows.map((item) => {
              const contribution = Math.max(0, item.out?.netMonthlyCashFlow ?? 0);
              const max = Math.max(1, ...rows.map((row) => Math.max(0, row.out?.netMonthlyCashFlow ?? 0)));
              return <button key={item.deal.id} onClick={() => onOpen(item.deal)}><div><strong>{item.deal.title}</strong><span>{item.deal.municipality || "Sin zona"}</span></div><div className="performance-track"><i style={{ width: `${(contribution / max) * 100}%` }} /></div><b>{fmtMoney(item.out?.netMonthlyCashFlow ?? 0)}</b></button>;
            })}
          </div>
        </Panel>
      </div>

      <Panel className="asset-table-panel">
        <div className="panel-head"><div><span className="eyebrow">ACTIVOS</span><h3>Cartera activa</h3></div><Building2 size={17} /></div>
        <div className="asset-table">
          <div className="asset-row asset-head"><span>Activo</span><span>Valor</span><span>Deuda</span><span>Equity</span><span>Yield</span><span>Cash-flow</span><span>Estado</span></div>
          {rows.map((item) => <button className="asset-row" key={item.deal.id} onClick={() => onOpen(item.deal)}><strong>{item.deal.title}<small>{item.deal.municipality || ""}</small></strong><span>{fmtMoney(item.value)}</span><span>{fmtMoney(item.debt)}</span><span>{fmtMoney(item.equity)}</span><span>{fmtPct(item.out?.netYieldPct)}</span><span className={(item.out?.netMonthlyCashFlow ?? 0) >= 0 ? "positive" : "negative"}>{fmtMoney(item.out?.netMonthlyCashFlow)}</span><span>{item.deal.stage === "managed" ? "Alquilado" : "Comprado"}</span></button>)}
        </div>
      </Panel>
    </div>
  );
}
