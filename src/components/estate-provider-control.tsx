"use client";
import { useEffect,useState } from 'react';
import { supabase } from '@/lib/supabase';
export function ProviderControl(){
 const [rows,setRows]=useState<Array<{provider:string;monthly_request_limit:number;monthly_budget_eur:number;reserve_per_request_eur:number;calls:number;reserved:number}>>([]),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void Promise.all([supabase.from('estate_provider_budgets').select('*'),supabase.from('estate_provider_usage').select('provider,reserved_cost_eur').gte('created_at',new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString())]).then(([budgets,usage])=>{if(!active)return;if(budgets.error||usage.error){setMessage('Inicia sesión para consultar los límites.');return;}setRows((budgets.data??[]).map(b=>({...b,calls:(usage.data??[]).filter(u=>u.provider===b.provider).length,reserved:(usage.data??[]).filter(u=>u.provider===b.provider).reduce((s,u)=>s+Number(u.reserved_cost_eur),0)})));});return()=>{active=false;};},[]);
 return <details className="provider-control panel"><summary>Control de proveedores y gasto</summary><p>{message||'Las llamadas de pago requieren presupuesto configurado. Las reservas son estimaciones conservadoras; no son facturas del proveedor.'}</p>{rows.length?rows.map(r=><p key={r.provider}><b>{r.provider}</b> · {r.calls}/{r.monthly_request_limit} solicitudes · reservado {r.reserved.toFixed(2)} € / {r.monthly_budget_eur} € · {r.reserve_per_request_eur} €/llamada</p>):<p>Sin presupuesto habilitado: llamadas de pago bloqueadas.</p>}</details>;
}
