"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleHelp,
  Database,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { DealAnalysis, DealInputs } from "@/lib/estate-engine";
import type { EvidenceKind, SavedDeal } from "@/lib/estate-store";

export const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
export const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
export const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

export function fmtMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? money.format(value) : "—";
}

export function fmtPct(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${number.format(value)}%` : "—";
}

export function latestAnalysis(deal: SavedDeal) {
  return deal.estate_deal_analyses?.[0] ?? null;
}

export function dealOutput(deal: SavedDeal): DealAnalysis | null {
  return latestAnalysis(deal)?.outputs ?? null;
}

export function dealInput(deal: SavedDeal): DealInputs | null {
  return latestAnalysis(deal)?.inputs ?? null;
}

export function listingPrice(deal: SavedDeal) {
  return deal.estate_listings?.[0]?.asking_price ?? dealInput(deal)?.purchasePrice ?? 0;
}

export function completenessForDeal(deal: SavedDeal) {
  const input = dealInput(deal);
  const zone = deal.features?.zone;
  const checks = [
    Boolean(deal.municipality),
    Boolean(deal.built_area_m2),
    deal.bedrooms !== null,
    deal.bathrooms !== null,
    Boolean(deal.floor_label),
    deal.has_elevator !== null,
    Boolean(deal.condition && deal.condition !== "unknown"),
    Boolean(input?.purchasePrice),
    Boolean(input?.monthlyRent),
    Boolean(input?.marketValueEstimate),
    Boolean(input?.communityMonthly),
    Boolean(input?.ibiAnnual),
    Boolean(deal.features?.heating),
    Boolean(deal.features?.electricity),
    Boolean(deal.features?.plumbing),
    typeof zone?.mobility === "number",
    typeof zone?.amenities === "number",
    typeof zone?.rentalDemand === "number",
    (deal.estate_property_images?.length ?? 0) > 0,
    (deal.estate_risks?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function confidenceLabel(value: number) {
  if (value >= 80) return "Alta";
  if (value >= 55) return "Media";
  return "Baja";
}

export function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    watchlist: "Radar",
    analyzing: "Análisis",
    visit: "Visita",
    negotiating: "Negociación",
    discarded: "Descartada",
    purchased: "Comprada",
    managed: "En cartera",
    sold: "Vendida",
  };
  return labels[stage] ?? stage;
}

export function stageTone(stage: string) {
  if (stage === "purchased" || stage === "managed") return "good";
  if (stage === "discarded") return "bad";
  if (stage === "visit" || stage === "negotiating") return "accent";
  return "neutral";
}

export function ScoreDial({ score, label, size = "md" }: { score: number; label?: string; size?: "sm" | "md" | "lg" }) {
  const safe = Math.max(0, Math.min(100, score || 0));
  return (
    <div
      className={`score-dial score-${size}`}
      style={{ "--score": `${safe * 3.6}deg` } as CSSProperties}
      aria-label={`Score ${number.format(safe)} de 100`}
    >
      <div className="score-dial-inner">
        <strong>{number.format(safe)}</strong>
        <small>/100</small>
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}

export function DataMeter({ value, label = "Cobertura" }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="data-meter">
      <div className="data-meter-head"><span>{label}</span><strong>{Math.round(safe)}%</strong></div>
      <div className="data-meter-track"><i style={{ width: `${safe}%` }} /></div>
    </div>
  );
}

export function Metric({ label, value, note, tone = "default" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "default" | "good" | "bad" | "accent" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function SectionHead({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {action && <div className="section-head-action">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function EvidenceChip({ kind, source }: { kind: EvidenceKind; source?: string }) {
  const labels: Record<EvidenceKind, string> = { fact: "Hecho", estimate: "Estimación", assumption: "Supuesto" };
  return (
    <span className={`evidence-chip evidence-${kind}`} title={source || undefined}>
      {kind === "fact" ? <ShieldCheck size={12} /> : kind === "estimate" ? <Database size={12} /> : <CircleHelp size={12} />}
      {labels[kind]}
    </span>
  );
}

export function StatusPill({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral" | "accent"; children: ReactNode }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export function EmptyBlock({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="empty-block">
      <div className="empty-icon">{icon}</div>
      <div><strong>{title}</strong><p>{copy}</p></div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function KpiBar({ items }: { items: Array<{ label: string; value: number | null; max?: number; invert?: boolean }> }) {
  return (
    <div className="kpi-bars">
      {items.map((item) => {
        const safe = item.value === null ? 0 : Math.max(0, Math.min(item.max ?? 100, item.value));
        const pct = item.value === null ? 0 : (safe / (item.max ?? 100)) * 100;
        return (
          <div className="kpi-bar" key={item.label}>
            <div><span>{item.label}</span><strong>{item.value === null ? "Sin dato" : Math.round(item.value)}</strong></div>
            <div className="kpi-bar-track"><i style={{ width: `${item.invert ? 100 - pct : pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function RiskFlag({ title, kill, severity, resolved }: { title: string; kill?: boolean; severity: number; resolved?: boolean }) {
  return (
    <div className={`risk-flag ${kill ? "risk-kill" : ""} ${resolved ? "resolved" : ""}`}>
      {resolved ? <Check size={15} /> : <AlertTriangle size={15} />}
      <span>{title}</span>
      <small>{resolved ? "Resuelto" : kill ? "Bloqueante" : `${severity}/100`}</small>
    </div>
  );
}

export function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  return <a className="text-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} /></a>;
}

export function ActionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="text-link button-link" onClick={onClick}>{children}<ArrowUpRight size={13} /></button>;
}

export function median(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}
