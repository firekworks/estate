import { supabase } from './supabase';
export const operationTables = ['estate_tasks','estate_visits','estate_offers','estate_actual_performance','estate_comparables','estate_evidence','estate_documents','estate_tenancies'] as const;
export type OperationTable = typeof operationTables[number];
export type OperationalRecord = {id:string;property_id:string;created_at:string;[key:string]:unknown};
export async function loadOperations(propertyId:string) {
 const results=await Promise.all(operationTables.map(async table=>{
 const {data,error}=await supabase.from(table).select('*').eq('property_id',propertyId).order('created_at',{ascending:false}).limit(200);
 if(error) throw new Error(`${table}: ${error.message}`); return [table,data ?? []] as const;
 }));
 return Object.fromEntries(results) as Record<OperationTable,OperationalRecord[]>;
}
export async function saveOperation(table:OperationTable,userId:string,propertyId:string,values:Record<string,unknown>,id?:string){
 const payload={...values,user_id:userId,property_id:propertyId};
 const query=id?supabase.from(table).update(payload).eq('id',id).eq('user_id',userId):supabase.from(table).insert(payload);
 const {error}=await query; if(error)throw new Error(error.message);
}
