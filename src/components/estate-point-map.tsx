"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MobilityPoint } from "@/lib/estate-mobility-store";
export function PointMap({
  center,
  points,
  comparisonPoints = [],
}: {
  center: { lat: number; lng: number };
  points: MobilityPoint[];
  comparisonPoints?: MobilityPoint[];
}) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!element.current) return;
    const m = L.map(element.current, {
      preferCanvas: false,
      zoomAnimation: false,
      fadeAnimation: false,
      scrollWheelZoom: false,
    }).setView([38.596, -0.672], 14);
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    map.current?.setView([center.lat, center.lng], 14);
  }, [center.lat, center.lng]);
  useEffect(() => {
    layer.current?.clearLayers();
    const max = Math.max(1, ...points.map((p) => p.value));
    for (const [dataset, rows] of [
      ["A", points],
      ["B", comparisonPoints],
    ] as const) {
      for (const p of rows) {
        const label = document.createElement("span");
        label.textContent = p.metadata?.asset
          ? `${p.label}`
          : `${dataset} · ${p.label ?? "Aforo"} · ${p.value.toLocaleString("es-ES")} ${p.metadata?.temporal_resolution === "annual" ? "vehículos/día · GVA / ICV" : "unidades"} · ${p.observed_at?.slice(0, 10) ?? "sin fecha"}`;
        const geometry = p.metadata?.geometry as
          { type?: string; coordinates?: number[][][] } | undefined;
        const intensity = p.value / max;
        const color =
          dataset === "B"
            ? "#5bcbd5"
            : intensity > 0.66
              ? "#ff7645"
              : intensity > 0.33
                ? "#f5b955"
                : "#8ccba6";
        if (
          geometry?.type === "MultiLineString" &&
          Array.isArray(geometry.coordinates)
        ) {
          L.polyline(
            geometry.coordinates.map((line) =>
              line.map((c) => [c[1], c[0]] as [number, number]),
            ),
            { color, weight: 4 + 3 * intensity, opacity: 0.95 },
          )
            .bindTooltip(label)
            .addTo(layer.current!);
          continue;
        }
        L.circleMarker([p.lat, p.lng], {
          radius: p.metadata?.asset ? 9 : 5 + 12 * Math.sqrt(intensity),
          weight: 2,
          color,
          fillColor: color,
          fillOpacity: 0.6,
        })
          .bindTooltip(label)
          .addTo(layer.current!);
      }
    }
  }, [points, comparisonPoints]);
  return (
    <div
      ref={element}
      className="estate-point-map"
      aria-label="Mapa de aforos agregados"
    />
  );
}
