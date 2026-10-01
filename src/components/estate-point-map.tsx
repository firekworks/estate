"use client";
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MobilityPoint } from '@/lib/estate-mobility-store';
export function PointMap({center,points}:{center:{lat:number;lng:number};points:MobilityPoint[]}){
 const element=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null);
 useEffect(()=>{if(!element.current)return;const m=L.map(element.current,{preferCanvas:true,scrollWheelZoom:false}).setView([38.596,-.672],14);map.current=m;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);layer.current=L.layerGroup().addTo(m);
 const observer=new ResizeObserver(()=>m.invalidateSize());observer.observe(element.current);return()=>{observer.disconnect();m.remove();map.current=null;};},[]);
 useEffect(()=>{map.current?.setView([center.lat,center.lng],14);},[center.lat,center.lng]);
 useEffect(()=>{layer.current?.clearLayers();const max=Math.max(1,...points.map(p=>p.value));for(const p of points){const label=document.createElement('span');label.textContent=`${p.label??'Aforo'} · ${p.value} · ${p.observed_at??'sin fecha'}`;const geometry=p.metadata?.geometry as {type?:string;coordinates?:number[][][]}|undefined;if(geometry?.type==='MultiLineString'&&Array.isArray(geometry.coordinates)){L.polyline(geometry.coordinates.map(line=>line.map(c=>[c[1],c[0]] as [number,number])),{color:'#ed8746',weight:3+5*p.value/max,opacity:.8}).bindTooltip(label).addTo(layer.current!);continue;}L.circleMarker([p.lat,p.lng],{radius:5+15*Math.sqrt(p.value/max),weight:1,color:'#efaa6b',fillColor:'#e78c49',fillOpacity:.45}).bindTooltip(label).addTo(layer.current!);}},[points]);
 return <div ref={element} className="estate-point-map" aria-label="Mapa de aforos agregados"/>;
}
