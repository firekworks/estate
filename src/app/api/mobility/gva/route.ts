import {NextResponse} from 'next/server';
const SOURCE='https://terramapas.icv.gva.es/0902_Aforos';
type Feature={properties:Record<string,string>;geometry:{type:string;coordinates:number[][][]}};
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,lat=Number(q.get('lat')),lng=Number(q.get('lng')),year=Number(q.get('year')??2025);
 if(!q.has('lat')||!q.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<37||lat>41.2||lng< -2||lng>1.1||!Number.isInteger(year)||year<2009||year>2025)return NextResponse.json({error:'Coordenadas fuera de la Comunitat Valenciana o año no disponible (2009–2025).'},{status:400});
 const params=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:`ms:Aforos${year}`,outputFormat:'application/json; subtype=geojson',srsName:'urn:ogc:def:crs:EPSG::4326',count:'300',bbox:`${lat-.05},${lng-.05},${lat+.05},${lng+.05},urn:ogc:def:crs:EPSG::4326`});
 try{const response=await fetch(`${SOURCE}?${params}`,{next:{revalidate:86400},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`GVA respondió HTTP ${response.status}`);
 const data=await response.json() as {features:Feature[]};if(!Array.isArray(data.features))throw new Error('Respuesta GVA no válida.');
 const points=data.features.flatMap(f=>{if(f.geometry?.type!=='MultiLineString')return [];const coords=f.geometry.coordinates.flat();const value=Number(f.properties.imd);if(!coords.length||!Number.isFinite(value)||value<0)return [];const c=coords[Math.floor(coords.length/2)];return [{lat:c[1],lng:c[0],value,mode:'drive',label:`${f.properties.carretera} · ${f.properties.pk_inicio}–${f.properties.pk_fin} · IMD ${year}`,observed_at:`${year}-12-31T00:00:00Z`,metadata:{geometry:f.geometry,year,temporal_resolution:'annual',source:SOURCE,license:'CC BY — Generalitat Valenciana / ICV',segment:f.properties.clau_tramo,measurement_type:f.properties.tipo_medida_trafico,location_method:'representative vertex of road segment; not station coordinate'}}];});
 return NextResponse.json({points,source:SOURCE,year,license:'CC BY — Generalitat Valenciana / ICV',retrieved_at:new Date().toISOString(),truncated:data.features.length>=300,note:'IMD anual de vehículos por tramo. No peatones ni tiempo real. No sumar tramos para estimar personas.'});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'GVA no disponible'},{status:503});}
}
