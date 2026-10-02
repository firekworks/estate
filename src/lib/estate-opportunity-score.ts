import type { SavedDeal } from "./estate-store";
export type OpportunityScoreComponent = { key: string; label: string; score: number | null; confidence: number; weight: number; reason: string };
export type OpportunityScore = { score: number; rankScore: number; coverage: number; blocked: boolean; components: OpportunityScoreComponent[] };
const clamp = (v:number)=>Math.max(0,Math.min(100,Number.isFinite(v)?v:0));
export function opportunityScore(deal: SavedDeal): OpportunityScore {
  const latest = deal.estate_deal_analyses?.[0], input=latest?.inputs, out=latest?.outputs, zone=deal.features?.zone;
  const confidence = Math.max(0,Math.min(1,latest?.data_confidence ?? 0));
  const zc = Math.max(0,Math.min(1,zone?.confidence ?? 0));
  const risks=deal.estate_risks ?? [];
  const blocked=risks.some(r=>r.is_kill_switch && !r.resolved_at);
  const condition:Record<string,number>={new:100,renovated:95,good:80,dated:45,light_renovation:50,medium_renovation:35,full_renovation:20};
  const items=deal.estate_renovation_items ?? [];
  const cost=items.reduce((sum,r)=>sum+(r.mode==='pro'?r.pro_cost:r.mode==='diy'?r.diy_material_cost:r.hybrid_cost),0);
  const uplift=items.reduce((sum,r)=>sum+r.estimated_value_uplift,0);
  const component=(key:string,label:string,score:number|null|undefined,conf:number,weight:number,reason:string):OpportunityScoreComponent=>({key,label,score:typeof score==='number'?clamp(score):null,confidence:typeof score==='number'?conf:0,weight,reason});
  const riskComponent=(key:string,label:string,categories:string[])=>{
    const scoped=risks.filter(r=>categories.includes(r.category));
    return component(key,label,scoped.length?100-Math.max(0,...scoped.filter(r=>!r.resolved_at).map(r=>r.severity)):null,scoped.length?Math.min(...scoped.map(r=>r.confidence)):0,0,'Registro de hallazgos; sin revisión no significa sin riesgo.');
  };
  const commercial=['commercial','office'].includes(deal.property_type);
  const components = [
    component('finance','Finanzas',out?.score,confidence,40,'Motor financiero determinista; sujeto a supuestos.'),
    component('market','Mercado',input?.marketValueEstimate && input.purchasePrice?50+(input.marketValueEstimate-input.purchasePrice)/input.marketValueEstimate*200:null,confidence,15,'Descuento frente al valor introducido; verificar comparables.'),
    component('demand','Demanda alquiler',zone?.rentalDemand,zc,10,'Evidencia de demanda de la zona.'),
    component('liquidity','Liquidez',zone?.liquidity,zc,10,'Evidencia de salida; no se infiere del estado físico.'),
    component('condition','Estado físico',condition[deal.condition ?? ''],.5,0,'Diagnóstico separado: no penaliza la inversión otra vez.'),
    component('value_add','Value-add',cost>0 && uplift>0?50+(uplift-cost)/cost*25:null,items.length?Math.min(...items.map(r=>r.confidence)):0,10,'Uplift de valor frente a coste; ambos requieren evidencia.'),
    component('tenant','Tenant fit',null,0,0,'Sin evaluación económica contrastada.'),
    component('location','Ubicación',zone?.amenities,zc,commercial?5:15,'Accesibilidad y servicios; no atributos sensibles.'),
    component('mobility','Movilidad',commercial?deal.features?.commercial?.flowScore:null,commercial?(deal.features?.commercial?.flowConfidence ?? 0):0,commercial?10:0,'Comercial: aforo validado. Vivienda: contexto, no premio al tráfico.'),
    component('financeability','Financiabilidad',null,0,0,'Requiere condiciones verificadas de prestamista.'),
    riskComponent('technical','Riesgo técnico',['technical','building']),
    riskComponent('legal','Riesgo legal',['legal','occupancy']),
    component('data','Confianza datos',confidence*100,1,0,'Confianza declarada; cobertura incluye dimensiones ausentes.'),
  ];
  const nominal=components.reduce((s,c)=>s+c.weight,0);
  const effective=components.reduce((s,c)=>s+(c.score===null?0:c.weight*c.confidence),0);
  const coverage=nominal?effective/nominal:0;
  const raw=effective?components.reduce((s,c)=>s+(c.score ?? 0)*c.weight*c.confidence,0)/effective:0;
  const score=blocked?0:Math.round(raw*10)/10;
  return {score,rankScore:blocked?0:Math.round(score*coverage*10)/10,coverage:Math.round(coverage*100),blocked,components};
}
