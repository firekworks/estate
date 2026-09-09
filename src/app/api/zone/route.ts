import { NextResponse } from "next/server";
import { openAIStructured } from "@/lib/openai-estate";
import { requireEstateUser } from "@/lib/server-auth";

const zoneSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mobility: { type: ["number", "null"], minimum: 0, maximum: 100 },
    amenities: { type: ["number", "null"], minimum: 0, maximum: 100 },
    safety: { type: ["number", "null"], minimum: 0, maximum: 100 },
    noise: { type: ["number", "null"], minimum: 0, maximum: 100 },
    rentalDemand: { type: ["number", "null"], minimum: 0, maximum: 100 },
    liquidity: { type: ["number", "null"], minimum: 0, maximum: 100 },
    nearby: { type: "array", items: { type: "string" }, maxItems: 14 },
    tenantProfiles: { type: "array", items: { type: "string" }, maxItems: 6 },
    tenantChannels: { type: "array", items: { type: "string" }, maxItems: 8 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, url: { type: "string" } },
        required: ["label", "url"],
      },
    },
    summary: { type: "string" },
  },
  required: ["mobility", "amenities", "safety", "noise", "rentalDemand", "liquidity", "nearby", "tenantProfiles", "tenantChannels", "confidence", "evidence", "summary"],
} as const;

export async function POST(request: Request) {
  const user = await requireEstateUser(request);
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let body: {
    address?: unknown;
    municipality?: unknown;
    province?: unknown;
    strategy?: unknown;
    rent?: unknown;
    bedrooms?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  const municipality = typeof body.municipality === "string" ? body.municipality.trim() : "";
  if (!municipality) return NextResponse.json({ error: "Falta el municipio." }, { status: 400 });
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const province = typeof body.province === "string" ? body.province.trim() : "Alicante";
  const strategy = typeof body.strategy === "string" ? body.strategy : "long_term";

  const prompt = [
    `Investiga la microzona de una vivienda en ${address ? `${address}, ` : ""}${municipality}, ${province}, España.`,
    `Estrategia de alquiler: ${strategy}. Dormitorios: ${typeof body.bedrooms === "number" ? body.bedrooms : "desconocido"}. Renta objetivo: ${typeof body.rent === "number" ? `${body.rent} EUR/mes` : "desconocida"}.`,
    "Busca fuentes actuales sobre transporte público, servicios básicos, comercio, educación/salud, zonas de empleo, mercado de alquiler, oferta inmobiliaria y señales de liquidez.",
    "Descubre también inmobiliarias/agentes locales si ayudan a entender demanda o captación de inquilinos.",
    "Los scores 0-100 son ESTIMACIONES explicables, no hechos. Usa null cuando no exista evidencia suficiente.",
    "safety solo puede puntuarse si encuentras una fuente pública razonable; no infieras seguridad por aspecto, renta, nacionalidad o perfil socioeconómico.",
    "noise solo puede puntuarse si existe evidencia de tráfico, ocio, infraestructuras o fuentes equivalentes; si no, null.",
    "nearby debe contener categorías/servicios encontrados, no distancias inventadas.",
    "tenantProfiles y tenantChannels son hipótesis comerciales basadas en la zona y estrategia, nunca atributos sensibles de residentes.",
    "summary: una frase corta. evidence: URLs auditables. Responde solo con el esquema solicitado.",
  ].join("\n");

  try {
    const zone = await openAIStructured<Record<string, unknown>>({
      model: process.env.OPENAI_ESTATE_RESEARCH_MODEL,
      instructions: "Eres el analista de microzona de Estate. Diferencias hechos, estimaciones y ausencia de evidencia. Investigas antes de puntuar.",
      input: prompt,
      schemaName: "estate_zone_intelligence",
      schema: zoneSchema,
      webSearch: true,
      includeSources: true,
      maxOutputTokens: 5000,
    });
    return NextResponse.json({ zone, researched_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo investigar la zona." }, { status: 503 });
  }
}
