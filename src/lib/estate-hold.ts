import { mortgagePayment } from './estate-engine.ts';
export type HoldInputs = {
 value:number;debt:number;annualRatePct:number;remainingTermYears:number;
 horizonYears:number;appreciationPct:number;discountPct:number;monthlyNoi:number;
 saleCosts:number;annualCapex:number;
};
/** Constant NOI and explicit annual CAPEX; nominal property growth; yearly discounted cash. */
export function projectHold(input:HoldInputs){
 if(Object.values(input).some(v=>!Number.isFinite(v))||input.value<=0||input.debt<0||input.annualRatePct<0||input.horizonYears<1||input.horizonYears>50||!Number.isInteger(input.horizonYears)||input.appreciationPct<=-100||input.discountPct<=-100||input.saleCosts<0||input.annualCapex<0||(input.debt>0&&input.remainingTermYears<=0))return null;
 const payment=mortgagePayment(input.debt,input.annualRatePct,input.remainingTermYears);
 const rate=input.annualRatePct/1200;let debt=input.debt,totalCash=0,presentCash=0;
 const rows=[];
 for(let year=1;year<=input.horizonYears;year++){
  let debtService=0;
  for(let month=0;month<12;month++){const interest=debt*rate;const paid=Math.min(payment,debt+interest);debt=Math.max(0,debt+interest-paid);debtService+=paid;}
  const cash=input.monthlyNoi*12-debtService-input.annualCapex;
  const value=input.value*Math.pow(1+input.appreciationPct/100,year);
  totalCash+=cash;presentCash+=cash/Math.pow(1+input.discountPct/100,year);
  rows.push({year,value,debt,cash,equity:value-debt});
 }
 const last=rows.at(-1)!;
 const terminalNet=last.value-last.debt-input.saleCosts;
 const sellNow=input.value-input.debt-input.saleCosts;
 const holdPresentValue=presentCash+terminalNet/Math.pow(1+input.discountPct/100,input.horizonYears);
 return {rows,totalCash,terminalNet,sellNow,holdPresentValue,advantagePresentValue:holdPresentValue-sellNow};
}
