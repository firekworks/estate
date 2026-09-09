import { NextResponse } from "next/server";
import { openAIStructured } from "@/lib/openai-estate";
import { requireEstateUser } from "@/lib/server-auth";
import type { ResearchCandidate, ResearchCriteria } from "@/lib/estate-research";

const PORTALS = [
  "idealista.com",
  "fotocasa.es",
  "pisos.com",
  "habitaclia.com",
  "yaencontre.com",
  "solvia.es",
  "servihabitat.com",
  "alisedainmobiliaria.com",
];

const candidateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          source: { type: "string" },
          portal: { type: ["string", "null"] },
          municipality: { type: ["string", "null"] },
          province: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          asking_price: { type: ["number", "null"] },
          built_area_m2: { type: ["number", "null"] },
          bedrooms: { type: ["number", "null"] },
          bathrooms: { type: ["number", "null"] },
          agency_name: { type: ["string", "null"] },
          monthly_rent_estimate: { type: ["number", "null"] },
          market_value_estimate: { type: ["number", "null"] },
          days_on_market: { type: ["number", "null"] },
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
        required: [
          "title", "url", "source", "portal", "municipality", "province", "address",
          "asking_price", "built_area_m2", "bedrooms", "bathrooms", "agency_name",
          "monthly_rent_estimate", "market_value_estimate", "days_on_market", "image_urls",
          "confidence", "evidence"
        ],
      },
    },
  },
  required: ["candidates"],
} as const;

function cleanCriteria(raw: ResearchCriteria): ResearchCriteria {
  return {
    municipalities: (raw.municipalities ?? []).map((value) => value.trim()).filter(Boolean).slice(0, 8),
    province: raw.province?.trim() || "Alicante",
    maxPrice: typeof raw.maxPrice === "number" ? Math.max(10000, Math.min(2000000, raw.maxPrice)) : 180000,
    minBedrooms: typeof raw.minBedrooms === "number" ? Math.max(0, Math.min(10, raw.minBedrooms)) : 0,
    minAreaM2: typeof raw.minAreaM2 === "number" ? Math.max(0, Math.min(1000, raw.minAreaM2)) : 0,
    strategy: raw.strategy ?? "long_term",
    maxResults: typeof raw.maxResults === "number" ? Math.max(1, Math.min(20, Math.round(raw.maxResults))) : 12,
  };
}

export async function POST(request: Request) {
  const user = await requireEstateUser(request);
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let body: { criteria?: ResearchCriteria };
  try {
    body = (await request.json()) as { criteria?: ResearchCriteria };
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  const criteria = cleanCriteria(body.criteria ?? { municipalities: [] });
  if (!criteria.municipalities.length) {
    return NextResponse.json({ error: "Añade al menos un municipio." }, { status: 400 });
  }

  const prompt = [
    "Busca oportunidades residenciales EN VENTA actuales para inversión en España.",
    `Municipios: ${criteria.municipalities.join(", ")} (${criteria.province}).`,
    `Precio máximo: ${criteria.maxPrice} EUR. Dormitorios mínimos: ${criteria.minBedrooms}. Superficie mínima: ${criteria.minAreaM2} m2.`,
    `Estrategia de salida: ${criteria.strategy}. Máximo ${criteria.maxResults} candidatos.`,
    `Explora portales grandes (${PORTALS.join(", ")}), servicers/bancos y, MUY IMPORTANTE, webs de inmobiliarias locales y agencias que descubras durante la búsqueda.`,
    "Amplía la búsqueda hasta que las nuevas consultas aporten poco valor, pero no inventes cobertura exhaustiva.",
    "Cada candidato debe corresponder a un anuncio real y actual encontrado en una fuente pública. Nunca reconstruyas URLs.",
    "Deduplica por URL y por inmueble cuando sea evidente que el mismo activo aparece republicado.",
    "asking_price, superficie, dormitorios, baños y agencia solo se rellenan si aparecen respaldados por fuente.",
    "Para monthly_rent_estimate y market_value_estimate busca comparables actuales de la misma microzona/tipología; si la evidencia no es suficiente devuelve null.",
    "Los image_urls deben ser URLs directas de imagen únicamente si aparecen realmente en la evidencia accesible; si no, array vacío.",
    "confidence mide la calidad conjunta de los campos extraídos, no lo atractivo de la inversión.",
    "evidence debe incluir URLs reales que permitan auditar los datos. Responde solo con el esquema solicitado.",
  ].join("\n");

  try {
    const result = await openAIStructured<{ candidates: ResearchCandidate[] }>({
      model: process.env.OPENAI_ESTATE_RESEARCH_MODEL,
      instructions:
        "Eres el agente de sourcing de Estate. Priorizas cobertura, trazabilidad y no inventar datos. Los resultados se usarán para tomar decisiones económicas: un dato ausente es preferible a una cifra plausible sin evidencia.",
      input: prompt,
      schemaName: "estate_research_candidates",
      schema: candidateSchema,
      webSearch: true,
      includeSources: true,
      maxOutputTokens: 9000,
    });

    const seen = new Set<string>();
    const candidates = result.candidates
      .filter((candidate) => candidate.url?.startsWith("http"))
      .filter((candidate) => {
        const key = candidate.url.replace(/[?#].*$/, "").replace(/\/$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, criteria.maxResults);

    return NextResponse.json({ criteria, candidates, generated_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo completar el radar web." },
      { status: 503 },
    );
  }
}
