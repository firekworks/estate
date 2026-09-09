import { NextResponse } from "next/server";
import { ESTATE_ENGINE_VERSION } from "@/lib/estate-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      product: "Firekworks Estate",
      version: "0.1.0",
      engine: ESTATE_ENGINE_VERSION,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
