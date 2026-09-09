import { NextResponse } from "next/server";

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

  return NextResponse.json({
    url: parsed.toString(),
    portal: match?.portal ?? "other",
    host: parsed.hostname,
    extraction: {
      status: "manual_required",
      reason:
        "Estate V1 identifica la fuente y conserva la procedencia, pero no extrae contenido mediante scraping no autorizado. Los conectores API/licenciados se añadirán por proveedor.",
    },
  });
}
