import { estateSupabaseUrl, estateSupabasePublishableKey } from "./supabase-config";
/** Reserves the configured conservative per-call allowance before any external spend. */
export async function reserveProvider(request:Request,provider='openai'){
 if(provider==='openai'&&!process.env.OPENAI_API_KEY)throw new Error('OpenAI no configurado. La solicitud no ha generado consumo.');
 const url=estateSupabaseUrl,key=estateSupabasePublishableKey;
 if(!url||!key)throw new Error('Presupuesto no disponible.');
 const response=await fetch(`${url}/rest/v1/rpc/estate_reserve_provider`,{method:'POST',headers:{apikey:key,Authorization:request.headers.get('authorization')??'', 'Content-Type':'application/json'},body:JSON.stringify({p_provider:provider}),cache:'no-store'});
 if(!response.ok){const data=await response.json();throw new Error(data.message??'Proveedor bloqueado por presupuesto.');}
 return response.json();
}
