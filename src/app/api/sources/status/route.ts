import { NextResponse } from "next/server";
import type { SourceStatus } from "@/lib/estate-research";

export async function GET() {
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const sources: SourceStatus[] = [
    { key: "manual", label: "URL / manual", kind: "manual", status: "ready", detail: "Entrada directa y CSV." },
    { key: "web_agent", label: "Radar web IA", kind: "agent", status: openai ? "ready" : "needs_key", detail: openai ? "Búsqueda web bajo demanda." : "Requiere OPENAI_API_KEY." },
    { key: "vision", label: "Visión de fotos", kind: "agent", status: openai ? "ready" : "needs_key", detail: openai ? "Analiza fotos al subirlas." : "Requiere OPENAI_API_KEY." },
    { key: "zone", label: "Microzona IA", kind: "agent", status: openai ? "ready" : "needs_key", detail: openai ? "Investiga servicios, movilidad y demanda." : "Requiere OPENAI_API_KEY." },
    { key: "idealista_search", label: "idealista Search API", kind: "api", status: process.env.IDEALISTA_API_KEY ? "ready" : "available_on_request", detail: "Acceso contractual / API oficial." },
    { key: "idealista_data", label: "idealista/data", kind: "api", status: process.env.IDEALISTA_DATA_API_KEY ? "ready" : "available_on_request", detail: "Comparables, métricas y valoración." },
    { key: "pisos", label: "pisos.com API", kind: "api", status: process.env.PISOS_API_KEY ? "ready" : "available_on_request", detail: "API con clave." },
    { key: "inmovilla", label: "Inmovilla API/XML", kind: "feed", status: process.env.INMOVILLA_TOKEN || process.env.INMOVILLA_FEED_URL ? "ready" : "available_on_request", detail: "Token de agencia o feed XML." },
    { key: "google_places", label: "Google Places", kind: "geo", status: process.env.GOOGLE_MAPS_API_KEY ? "ready" : "needs_key", detail: "POIs y distancias precisas." },
  ];

  return NextResponse.json({ version: "1.3", sources });
}
