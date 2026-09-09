"use client";

import { ArrowRight, Building2, CircleDollarSign, LineChart, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import type { SavedDeal } from "@/lib/estate-store";
import { dealInput, dealOutput, fmtMoney, fmtPct, Metric, Panel, SectionHead } from "@/components/estate-primitives";

export function PortfolioView({ deals, onOpen, onOpportunities }: { deals: SavedDeal[]; onOpen: (deal: SavedDeal) => void; onOpportunities: () => void }) {
  const assets = deals.filter((deal) => deal.stage === "purchased" || deal.stage === "managed");
  const rows = assets.map((deal) => {
    const input = dealInput(deal); const out = dealOutput(deal);
    const value = input?.marketValueEstimate || input?.purchasePrice || 0; const debt = out?.loanAmount ?? 0; const equity = Math.max(0, value - debt);
    return { deal, input, out, value, debt, equity };
  });
  const totalValue = rows.reduce((sum, item) => sum + item.value, 0);
  const totalDebt = rows.reduce((sum, item) => sum + item.debt, 0);
  const totalEquity = rows.reduce((sum, item) => sum + item.equity, 0);
  const cashflow = rows.reduce((sum, item) => sum + (item.out?.netMonthlyCashFlow ?? 0), 0);
  const avgYield = rows.length ? rows.reduce((sum, item) => sum + (item.out?.netYieldPct ?? 0), 0) / rows.length : 0;

  if (!assets.length) {
    return <div className="view view-portfolio visual-first"><SectionHead eyebrow="PORTFOLIO" title="Cartera." /><Panel className="portfolio-loop-empty">
      <div className="portfolio-loop-graphic"><div className="loop-core"><Wallet size={24} /><strong>CAPITAL</strong></div><div className="loop-node l1">COMPRAR</div><ArrowRight className="loop-arrow a1" size={15} /><div className="loop-node l2">MEJORAR</div><ArrowRight className="loop-arrow a2" size={15} /><div className="loop-node l3">ALQUILAR</div><ArrowRight className="loop-arrow a3" size={15} /><div className="loop-node l4">MEDIR</div><RefreshCw className="loop-arrow a4" size={15} /></div>
      <button className="primary-button" onClick={onOpportunities}>Pipeline <ArrowRight size={14} /></button>
    </Panel></div>;
  }

  const debtPct = totalValue > 0 ? Math.min(100, (totalDebt / totalValue) * 100) : 0;
  return (
    <div className="view view-portfolio visual-first">
      <SectionHead eyebrow="PORTFOLIO" title="Cartera." />
      <div className="portfolio-kpis visual-portfolio-kpis"><Metric label="VALOR" value={fmtMoney(totalValue)} /><Metric label="DEUDA" value={fmtMoney(totalDebt)} /><Metric label="EQUITY" value={fmtMoney(totalEquity)} tone="accent" /><Metric label="CASH-FLOW" value={`${fmtMoney(cashflow)}/m`} tone={cashflow >= 0 ? "good" : "bad"} /><Metric label="YIELD" value={fmtPct(avgYield)} /></div>

      <div className="portfolio-grid visual-portfolio-grid">
        <Panel className="equity-structure"><div className="visual-panel-head"><span><CircleDollarSign size={15} /> CAPITAL STACK</span><strong>{Math.round(debtPct)}% LTV</strong></div><div className="equity-donut" style={{ "--debt": `${debtPct * 3.6}deg` } as React.CSSProperties}><div><strong>{fmtMoney(totalEquity)}</strong><span>equity</span></div></div><div className="equity-legend"><span><i className="equity-dot" />Equity {fmtMoney(totalEquity)}</span><span><i className="debt-dot" />Deuda {fmtMoney(totalDebt)}</span></div></Panel>
        <Panel className="portfolio-performance"><div className="visual-panel-head"><span><LineChart size={15} /> CASH-FLOW / ACTIVO</span></div><div className="performance-bars">{rows.map((item) => { const contribution = Math.max(0, item.out?.netMonthlyCashFlow ?? 0); const max = Math.max(1, ...rows.map((row) => Math.max(0, row.out?.netMonthlyCashFlow ?? 0))); return <button key={item.deal.id} onClick={() => onOpen(item.deal)}><div><strong>{item.deal.title}</strong><span>{item.deal.municipality || "—"}</span></div><div className="performance-track"><i style={{ width: `${(contribution / max) * 100}%` }} /></div><b>{fmtMoney(item.out?.netMonthlyCashFlow ?? 0)}</b></button>; })}</div></Panel>
      </div>

      <Panel className="asset-table-panel"><div className="visual-panel-head"><span><Building2 size={15} /> ACTIVOS</span><TrendingUp size={15} /></div><div className="asset-table"><div className="asset-row asset-head"><span>Activo</span><span>Valor</span><span>Equity</span><span>Yield</span><span>Cash-flow</span><span>Estado</span></div>{rows.map((item) => <button className="asset-row" key={item.deal.id} onClick={() => onOpen(item.deal)}><strong>{item.deal.title}<small>{item.deal.municipality || ""}</small></strong><span>{fmtMoney(item.value)}</span><span>{fmtMoney(item.equity)}</span><span>{fmtPct(item.out?.netYieldPct)}</span><span className={(item.out?.netMonthlyCashFlow ?? 0) >= 0 ? "positive" : "negative"}>{fmtMoney(item.out?.netMonthlyCashFlow)}</span><span>{item.deal.stage === "managed" ? "Alquilado" : "Comprado"}</span></button>)}</div></Panel>
    </div>
  );
}
