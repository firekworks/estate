import { NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox?: [string, string, string, string];
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Añade una ubicación." }, { status: 400 });
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "es");
  endpoint.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Firekworks-Estate/1.4 (internal real-estate analysis)",
        "Accept-Language": "es",
      },
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`Geocoder ${response.status}`);
    const results = (await response.json()) as NominatimResult[];
    const first = results[0];
    if (!first) return NextResponse.json({ error: "Ubicación no encontrada." }, { status: 404 });

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    const bounds = first.boundingbox?.map(Number);
    return NextResponse.json({
      lat,
      lng,
      label: first.display_name,
      bounds: bounds?.length === 4
        ? { south: bounds[0], north: bounds[1], west: bounds[2], east: bounds[3] }
        : null,
      provider: "OpenStreetMap Nominatim",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo geocodificar la ubicación." },
      { status: 503 },
    );
  }
}
