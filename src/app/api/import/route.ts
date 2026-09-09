import { NextResponse } from "next/server";
import { hasOpenAIKey, openAIStructured } from "@/lib/openai-estate";
import { requireEstateUser } from "@/lib/server-auth";

const PORTALS: Array<{ portal: string; hosts: string[] }> = [
  { portal: "idealista", hosts: ["idealista.com", "www.idealista.com"] },
  { portal: "fotocasa", hosts: ["fotocasa.es", "www.fotocasa.es"] },
  { portal: "habitaclia", hosts: ["habitaclia.com", "www.habitaclia.com"] },
  { portal: "yaencontre", hosts: ["yaencontre.com", "www.yaencontre.com"] },
  { portal: "pisos.com", hosts: ["pisos.com", "www.pisos.com"] },
  { portal: "milanuncios", hosts: ["milanuncios.com", "www.milanuncios.com"] },
  { portal: "solvia", hosts: ["solvia.es", "www.solvia.es"] },
  { portal: "servihabitat", hosts: ["servihabitat.com", "www.servihabitat.com"] },
  { portal: "aliseda", hosts: ["alisedainmobiliaria.com", "www.alisedainmobiliaria.com"] },
];

const listingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: ["string", "null"] },
    municipality: { type: ["string", "null"] },
    province: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    asking_price: { type: ["number", "null"] },
    built_area_m2: { type: ["number", "null"] },
    usable_area_m2: { type: ["number", "null"] },
    bedrooms: { type: ["number", "null"] },
    bathrooms: { type: ["number", "null"] },
    floor_label: { type: ["string", "null"] },
    has_elevator: { type: ["boolean", "null"] },
    has_terrace: { type: ["boolean", "null"] },
    has_garage: { type: ["boolean", "null"] },
    year_built: { type: ["number", "null"] },
    condition: { type: ["string", "null"] },
    agency_name: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    image_urls: { type: "array", items: { type: "string" }, maxItems: 12 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, url: { type: "string" } },
        required: ["label", "url"],
      },
    },
  },
  required: ["title", "municipality", "province", "address", "asking_price", "built_area_m2", "usable_area_m2", "bedrooms", "bathrooms", "floor_label", "has_elevator", "has_terrace", "has_garage", "year_built", "condition", "agency_name", "description", "image_urls", "confidence", "evidence"],
} as const;

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Falta la URL del anuncio." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url.trim());
  } catch {
    return NextResponse.json({ error: "La URL no es válida." }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Solo se admiten URLs HTTP/HTTPS." }, { status: 400 });
  }

  const match = PORTALS.find((item) => item.hosts.includes(parsed.hostname.toLowerCase()));
  const user = await requireEstateUser(request);

  if (!user || !hasOpenAIKey()) {
    return NextResponse.json({
      url: parsed.toString(),
      portal: match?.portal ?? "other",
      host: parsed.hostname,
      extraction: {
        status: "manual_required",
        reason: user ? "Fuente guardada. Configura OPENAI_API_KEY para extracción asistida." : "Fuente guardada. Inicia sesión para extracción asistida.",
      },
      listing: null,
    });
  }

  try {
    const listing = await openAIStructured<Record<string, unknown>>({
      model: process.env.OPENAI_ESTATE_RESEARCH_MODEL,
      instructions: "Extrae datos de un anuncio inmobiliario con máxima trazabilidad. Si un campo no está respaldado por la URL o fuentes públicas inequívocas, devuelve null. Nunca inventes valores.",
      input: `Investiga exclusivamente este anuncio y sus datos públicos: ${parsed.toString()}\nDevuelve la ficha del inmueble. No estimes alquiler ni valor de mercado en este paso. evidence debe contener URLs reales.`,
      schemaName: "estate_listing_import",
      schema: listingSchema,
      webSearch: true,
      includeSources: true,
      maxOutputTokens: 4500,
    });

    return NextResponse.json({
      url: parsed.toString(),
      portal: match?.portal ?? "other",
      host: parsed.hostname,
      extraction: { status: "enriched", reason: "Datos extraídos con evidencia pública; revisa antes de guardar." },
      listing,
    });
  } catch (error) {
    return NextResponse.json({
      url: parsed.toString(),
      portal: match?.portal ?? "other",
      host: parsed.hostname,
      extraction: { status: "manual_required", reason: error instanceof Error ? error.message : "No se pudo enriquecer la URL." },
      listing: null,
    });
  }
}
