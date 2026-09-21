import { NextResponse } from "next/server";

export async function GET() {
  const google = Boolean(process.env.GOOGLE_MAPS_API_KEY);
  return NextResponse.json({
    version: "1.4",
    sources: [
      { key: "manual_csv", label: "CSV / aforo propio", modes: ["walk","drive","bike","transit"], status: "ready", access: "free", resolution: "depende de la fuente" },
      { key: "gva_imd", label: "GVA · IMD carreteras", modes: ["drive"], status: "ready", access: "open_data", resolution: "tramos de carretera", freshness: "anual · 2009-2025" },
      { key: "google_traffic", label: "Google Traffic", modes: ["drive"], status: google ? "key_available" : "needs_key", access: "api", resolution: "tramos / rutas", note: "tráfico actual y ETA; no es afluencia peatonal" },
      { key: "mytraffic", label: "MyTraffic", modes: ["walk","drive"], status: "license_required", access: "commercial", resolution: "hasta ~10 m según proveedor" },
      { key: "mapbox_movement", label: "Mapbox Movement", modes: ["walk","drive"], status: "license_required", access: "enterprise", resolution: "agregada" },
      { key: "carto_vodafone", label: "CARTO · Vodafone Spain", modes: ["mixed"], status: "license_required", access: "premium", resolution: "grid 250 m", freshness: "mensual" },
      { key: "kido", label: "Kido Dynamics", modes: ["walk","drive","mixed"], status: "license_required", access: "commercial", resolution: "configurable" },
      { key: "nommon", label: "Nommon", modes: ["walk","drive","bike","transit","mixed"], status: "license_required", access: "commercial", resolution: "configurable" },
    ],
  });
}
