"use client";
import { ArrowRight, Compass, ShieldAlert, Plus, Clock3 } from 'lucide-react';
import type { SavedDeal } from '@/lib/estate-store';
import { opportunityScore } from '@/lib/estate-opportunity-score';
import { completenessForDeal, fmtMoney, Panel, SectionHead, ScoreDial, listingPrice, stageLabel } from './estate-primitives';
export function HomeView({deals,onNew,onExplore,onOpen,onOpportunities}:{deals:SavedDeal[];onNew:()=>void;onExplore:()=>void;onOpen:(deal:SavedDeal)=>void;onOpportunities:()=>void}){
 const active=deals.filter(d=>!['discarded','sold','purchased','rehab','marketing','managed'].includes(d.stage));
 const ranked=[...active].sort((a,b)=>opportunityScore(b).rankScore-opportunityScore(a).rankScore).slice(0,3);
 const tasks=deals.flatMap(deal=>(deal.estate_tasks??[]).filter(t=>t.status==='open').map(task=>({deal,task}))).sort((a,b)=>(a.task.due_at??'9999').localeCompare(b.task.due_at??'9999'));
 const blockers=deals.flatMap(deal=>(deal.estate_risks??[]).filter(r=>r.is_kill_switch&&!r.resolved_at).map(risk=>({deal,risk})));
 return <div className="view decision-cockpit"><SectionHead eyebrow="01 / DECIDIR" title="Qué hacer hoy" action={<button className="primary-button" onClick={onNew}><Plus size={16}/> Nueva oportunidad</button>}/>
 {!deals.length?<Panel className="onboarding-compact"><Compass size={32}/><div><h2>Empieza por un activo real</h2><p>Añade una URL, importa un CSV o registra un inmueble. Precio, evidencia y siguiente acción quedarán juntos.</p><button className="ghost-button" onClick={onExplore}>Abrir Radar <ArrowRight size={14}/></button></div></Panel>:<>
 <div className="cockpit-summary"><span><b>{active.length}</b> oportunidades abiertas</span><span><b>{blockers.length}</b> bloqueos</span><span><b>{tasks.length}</b> acciones pendientes</span></div>
 <div className="cockpit-grid"><Panel><div className="panel-head"><h2>Necesita atención</h2><ShieldAlert size={18}/></div>
 {blockers.slice(0,5).map(({deal,risk})=><button className="attention-row" key={risk.id} onClick={()=>onOpen(deal)}><span className="status-pill status-bad">Bloqueada</span><span><strong>{risk.title}</strong><small>{deal.title}</small></span><ArrowRight size={16}/></button>)}
 {tasks.slice(0,6).map(({deal,task})=><button className="attention-row" key={task.id} onClick={()=>onOpen(deal)}><Clock3 size={17}/><span><strong>{task.title}</strong><small>{deal.title} · {task.due_at?new Date(task.due_at).toLocaleDateString('es-ES'):'Sin fecha'}</small></span><ArrowRight size={16}/></button>)}
 {!blockers.length&&!tasks.length&&<p>Sin acciones registradas. Abre un inmueble para definir su siguiente paso.</p>}</Panel>
 <Panel><h2>Mejores oportunidades</h2><p>Prioridad ajustada por evidencia. Un bloqueo no puede compensarse con rentabilidad.</p>{ranked.map(deal=>{const score=opportunityScore(deal);return <button className="attention-row" key={deal.id} onClick={()=>onOpen(deal)}><ScoreDial score={score.score} size="sm"/><span><strong>{deal.title}</strong><small>{deal.municipality} · {stageLabel(deal.stage)} · {score.coverage}% cobertura</small></span><strong>{fmtMoney(listingPrice(deal))}</strong></button>;})}</Panel>
 <Panel><h2>Datos por validar</h2>{active.filter(d=>completenessForDeal(d)<70).slice(0,5).map(deal=><button className="attention-row" key={deal.id} onClick={()=>onOpen(deal)}><span><strong>{deal.title}</strong><small>Revisar hechos, comparables y riesgos</small></span><b>{completenessForDeal(deal)}% ficha</b></button>)}</Panel>
 <Panel><h2>Capital y resultados</h2><p>Registra el cierre mensual de cada activo comprado para medir resultados reales. Las previsiones permanecen separadas.</p><button className="ghost-button" onClick={onOpportunities}>Revisar operaciones <ArrowRight size={14}/></button></Panel></div></>}
 </div>;
}
