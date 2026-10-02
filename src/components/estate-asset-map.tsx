"use client";
import dynamic from "next/dynamic";
import type { SavedDeal } from "@/lib/estate-store";
import { listingPrice, fmtMoney } from "./estate-primitives";
const PointMap = dynamic(
  () => import("./estate-point-map").then((m) => m.PointMap),
  { ssr: false },
);
export function AssetMap({
  deals,
  onOpen,
}: {
  deals: SavedDeal[];
  onOpen: (d: SavedDeal) => void;
}) {
  const located = deals.filter(
    (d) => d.latitude !== null && d.longitude !== null,
  );
  return (
    <section className="asset-map">
      <div className="asset-map-canvas">
        <PointMap
          center={
            located[0]
              ? { lat: located[0].latitude!, lng: located[0].longitude! }
              : { lat: 38.596, lng: -0.672 }
          }
          points={located.map((d) => ({
            lat: d.latitude!,
            lng: d.longitude!,
            value: 1,
            mode: "mixed" as const,
            label: `${d.title} · ${fmtMoney(listingPrice(d))}`,
            observed_at: null,
            metadata: { asset: true },
          }))}
        />
        <span className="map-caption">
          {located.length}/{deals.length} activos con coordenadas verificadas
        </span>
      </div>
      <div className="map-asset-list">
        {deals.map((d) => (
          <button key={d.id} onClick={() => onOpen(d)}>
            <strong>{d.title}</strong>
            <span>
              {d.municipality} · {fmtMoney(listingPrice(d))}
            </span>
            {d.latitude === null && <small>Ubicación pendiente</small>}
          </button>
        ))}
      </div>
    </section>
  );
}
