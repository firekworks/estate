export type DatedCashFlow={date:string;amount:number};
/** Annualized actual-date return, ACT/365. Refuse ambiguous multiple-sign-change flows. */
export function xirr(flows:DatedCashFlow[]):number|null{
 const byDate=new Map<number,number>();
 for(const f of flows){const t=Date.parse(f.date);if(!Number.isFinite(t)||!Number.isFinite(f.amount))return null;byDate.set(t,(byDate.get(t)??0)+f.amount);}
 const rows=[...byDate].sort((a,b)=>a[0]-b[0]).filter(r=>r[1]!==0);
 if(rows.length<2||rows[0][1]>=0||rows.at(-1)![1]<=0)return null;
 let changes=0;for(let i=1;i<rows.length;i++)if(Math.sign(rows[i][1])!==Math.sign(rows[i-1][1]))changes++;
 if(changes!==1)return null;
 const npv=(rate:number)=>rows.reduce((sum,[date,amount])=>sum+amount/Math.pow(1+rate,(date-rows[0][0])/86400000/365),0);
 let low=-.9999,high=1;while(npv(high)>0&&high<1e6)high=high*2+1;
 if(npv(low)*npv(high)>0)return null;
 for(let i=0;i<200;i++){const mid=(low+high)/2;if(npv(mid)>0)low=mid;else high=mid;}
 return (low+high)/2;
}
export function forecastError(predicted:number|null|undefined,actual:number|null|undefined){
 if(predicted==null||actual==null||!Number.isFinite(predicted)||!Number.isFinite(actual))return null;
 return {absolute:actual-predicted,relative:predicted===0?null:(actual-predicted)/Math.abs(predicted)};
}
