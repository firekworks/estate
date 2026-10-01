export type ProviderState='ready'|'needs_key'|'needs_setup'|'license_required'|'unverified';
export interface ProviderAdapter {
 key:string; capabilities:string[]; status:ProviderState; cost:string; rateLimit:string; evidence:string[];
 search(criteria:unknown):Promise<unknown[]>; fetchListing(url:string):Promise<unknown>; refresh(id:string):Promise<unknown>;
}
export interface MarketDataProvider extends ProviderAdapter { capabilities:Array<'comparables'|'valuation'|'history'>; }
export function unavailableProvider(key:string,capabilities:string[],status:ProviderState,evidence:string[]=[]):ProviderAdapter{
 const unavailable=async()=>{throw new Error(`${key}: proveedor no conectado (${status}).`);};
 return {key,capabilities,status,evidence,cost:'Según contrato; sin llamadas activadas',rateLimit:'0 hasta configuración',search:unavailable,fetchListing:unavailable,refresh:unavailable};
}
