"use client";
import { useState } from 'react';
import type { SavedDeal } from '@/lib/estate-store';
import { SectionHead, Panel, Metric, fmtMoney, fmtPct, dealOutput } from './estate-primitives';
export function PortfolioView({deals,onOpen,onOpportunities}:{deals:SavedDeal[];onOpen:(d:SavedDeal)=>void;onOpportunities:()=>void}){
 const assets=deals.filter(d=>['purchased','rehab','marketing','managed'].includes(d.stage));
 const periods=[...new Set(assets.flatMap(d=>(d.estate_actual_performance??[]).map(r=>r.period)))].sort().reverse();
 const [selected,setSelected]=useState('');const period=selected||periods[0]||'';
 const rows=assets.map(deal=>({deal,actual:deal.estate_actual_performance?.find(r=>r.period===period)}));
 const covered=rows.filter(r=>r.actual),total=(key:'valuation'|'debt_balance')=>covered.length===assets.length&&covered.every(r=>r.actual![key]!==null)?covered.reduce((s,r)=>s+r.actual![key]!,0):null;
 const value=assets.length?total('valuation'):null,debt=assets.length?total('debt_balance'):null;
 const cf=covered.length?covered.reduce((s,r)=>s+r.actual!.rent_received-r.actual!.operating_expenses-r.actual!.debt_payment-r.actual!.capex,0):null;
 return <div className="view"><SectionHead eyebrow="06 / MEDIR" title="Cartera" action={periods.length?<label>Periodo <select value={period} onChange={e=>setSelected(e.target.value)}>{periods.map(p=><option key={p}>{p}</option>)}</select></label>:undefined}/>
 {!assets.length?<Panel className="onboarding-compact"><div><h2>Todavía no hay activos comprados</h2><p>La cartera se activa al registrar una compra en Pipeline.</p><button className="primary-button" onClick={onOpportunities}>Abrir Pipeline</button></div></Panel>:<>
 <div className="portfolio-kpis"><Metric label="Valor documentado" value={fmtMoney(value)}/><Metric label="Deuda actual" value={fmtMoney(debt)}/><Metric label="Equity" value={fmtMoney(value===null||debt===null?null:value-debt)}/><Metric label="LTV" value={fmtPct(value&&debt!==null?debt/value*100:null)}/><Metric label="Cash-flow real registrado" value={fmtMoney(cf)} note={`${covered.length}/${assets.length} activos · ${period||'sin cierres'}`}/></div>
 <Panel><h2>Previsión frente a realidad</h2><p>Importes mensuales. Sin cierre registrado se muestra «Sin datos».</p><div className="portfolio-table"><div className="portfolio-table-row"><b>Activo</b><b>Previsto</b><b>Real</b><b>Desviación</b><b>CAPEX</b></div>{rows.map(({deal,actual})=>{const forecast=actual?.forecast?.outputs as {netMonthlyCashFlow?:number}|undefined;const predicted=forecast?.netMonthlyCashFlow??dealOutput(deal)?.netMonthlyCashFlow;const real=actual?actual.rent_received-actual.operating_expenses-actual.debt_payment-actual.capex:null;return <button className="portfolio-table-row" key={deal.id} onClick={()=>onOpen(deal)}><strong>{deal.title}<small>{deal.municipality}</small></strong><span>{fmtMoney(predicted)}</span><span>{real===null?'Sin datos':fmtMoney(real)}</span><span>{real===null||predicted===undefined?'—':fmtMoney(real-predicted)}</span><span>{fmtMoney(actual?.capex)}</span></button>;})}</div></Panel></>}
 </div>;
}
