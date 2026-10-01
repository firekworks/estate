import { NextResponse } from "next/server";
import type { SourceStatus } from "@/lib/estate-research";

export async function GET() {
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const sources: SourceStatus[] = [
    { key: "manual", label: "URL / manual", kind: "manual", status: "ready", detail: "Entrada directa y CSV." },
    { key: "web_agent", label: "Radar web IA", kind: "agent", status: openai ? "needs_setup" : "needs_key", detail: openai ? "Clave presente; requiere presupuesto y validación." : "Requiere OPENAI_API_KEY." },
    { key: "vision", label: "Visión de fotos", kind: "agent", status: openai ? "needs_setup" : "needs_key", detail: openai ? "Clave presente; requiere presupuesto y validación." : "Requiere OPENAI_API_KEY." },
    { key: "zone", label: "Microzona IA", kind: "agent", status: openai ? "needs_setup" : "needs_key", detail: openai ? "Clave presente; requiere presupuesto y validación." : "Requiere OPENAI_API_KEY." },
    { key: "idealista_search", label: "idealista Search API", kind: "api", status: "available_on_request", detail: "Acceso contractual / API oficial." },
    { key: "idealista_data", label: "idealista/data", kind: "api", status: "available_on_request", detail: "Comparables, métricas y valoración." },
    { key: "pisos", label: "pisos.com API", kind: "api", status: "available_on_request", detail: "API con clave." },
    { key: "inmovilla", label: "Inmovilla API/XML", kind: "feed", status: "available_on_request", detail: "Token de agencia o feed XML." },
    { key: "google_places", label: "Google Places", kind: "geo", status: process.env.GOOGLE_MAPS_API_KEY ? "needs_setup" : "needs_key", detail: "POIs y distancias precisas." },
  ];

  return NextResponse.json({ version: "1.4", sources });
}
