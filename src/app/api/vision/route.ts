import { NextResponse } from "next/server";
import { openAIStructured } from "@/lib/openai-estate";
import { requireEstateUser } from "@/lib/server-auth";

const imageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    room_type: { type: "string", enum: ["unknown", "living_room", "kitchen", "bedroom", "bathroom", "facade", "common_area", "terrace", "hallway", "utility", "garage"] },
    condition_score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    positives: { type: "array", items: { type: "string" }, maxItems: 6 },
    issues: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          severity: { type: "number", minimum: 0, maximum: 100 },
          evidence: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["category", "severity", "evidence", "confidence"],
      },
    },
    renovation_signals: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          reason: { type: "string" },
        },
        required: ["category", "priority", "reason"],
      },
    },
    manual_checks: { type: "array", items: { type: "string" }, maxItems: 8 },
    summary: { type: "string" },
  },
  required: ["room_type", "condition_score", "confidence", "positives", "issues", "renovation_signals", "manual_checks", "summary"],
} as const;

export async function POST(request: Request) {
  const user = await requireEstateUser(request);
  if (!user) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  let body: { imageUrl?: unknown };
  try {
    body = (await request.json()) as { imageUrl?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }
  if (typeof body.imageUrl !== "string" || !body.imageUrl.startsWith("http")) {
    return NextResponse.json({ error: "Falta una URL de imagen válida." }, { status: 400 });
  }

  try {
    const analysis = await openAIStructured<Record<string, unknown>>({
      model: process.env.OPENAI_ESTATE_VISION_MODEL,
      instructions: [
        "Analiza fotografías inmobiliarias para underwriting, no para decoración.",
        "Solo describe señales VISIBLES. Nunca diagnostiques defectos estructurales, instalaciones ocultas, humedades internas o cumplimiento normativo sin evidencia visual clara.",
        "No estimes costes monetarios a partir de una foto. Señala partidas que conviene presupuestar y comprobaciones manuales.",
        "condition_score: 100 = aspecto excelente/reciente; 0 = deterioro visual extremo. No confundas estilo antiguo con defecto técnico.",
        "summary debe ser una sola frase corta. Responde solo con el esquema solicitado.",
      ].join("\n"),
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analiza esta foto del inmueble y devuelve señales auditables para Estate." },
            { type: "input_image", image_url: body.imageUrl, detail: "high" },
          ],
        },
      ],
      schemaName: "estate_property_image_analysis",
      schema: imageSchema,
      maxOutputTokens: 3000,
    });
    return NextResponse.json({ analysis, model: process.env.OPENAI_ESTATE_VISION_MODEL ?? process.env.OPENAI_ESTATE_MODEL ?? "gpt-5.6-luna" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar la imagen." }, { status: 503 });
  }
}
