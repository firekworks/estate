export type ComparableSample={price:number;area_m2:number;observed_at:string;similarity:number|null;url:string};
export function marketDistribution(samples:ComparableSample[],now=new Date(),minimum=3,useful=10){
 const unique=new Map<string,ComparableSample>();
 for(const s of samples) if(s.price>0 && s.area_m2>0 && Date.parse(s.observed_at)<=now.getTime() && now.getTime()-Date.parse(s.observed_at)<=180*86400000) { const previous=unique.get(s.url); if(!previous || Date.parse(s.observed_at)>Date.parse(previous.observed_at)) unique.set(s.url,s); }
 const rows=[...unique.values()]; const values=rows.map(s=>s.price).sort((a,b)=>a-b);
 const quantile=(q:number)=>{const x=(values.length-1)*q,l=Math.floor(x);return values[l]+(values[Math.ceil(x)]-values[l])*(x-l);};
 const enough=rows.length>=minimum;
 return {n:rows.length,status:!enough?'insufficient':rows.length<useful?'indicative':'useful',p25:enough?quantile(.25):null,p50:enough?quantile(.5):null,p75:enough?quantile(.75):null,range:enough?[values[0],values.at(-1)!]:null,dispersion:enough?(quantile(.75)-quantile(.25))/quantile(.5):null,similarity:rows.length && rows.every(r=>r.similarity!==null)?rows.reduce((s,r)=>s+r.similarity!,0)/rows.length:null,model:'estate_comps_v1',maxAgeDays:180};
}
export function refinance(appraisal:number,ltv:number,debt:number,fees:number){return appraisal*ltv/100-debt-fees;}
export function saleProceeds(price:number,debt:number,taxes:number,agency:number,costs:number){return price-debt-taxes-agency-costs;}
