"use client";

import type { ReactNode } from "react";
import {
  Activity,
  Building2,
  ChevronRight,
  Compass,
  Home,
  Landmark,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Radar,
  X,
} from "lucide-react";

export type View = "home" | "explore" | "market" | "opportunities" | "portfolio" | "analyze" | "property";

const NAV: Array<{ key: Exclude<View, "analyze" | "property">; label: string; icon: ReactNode; description: string }> = [
  { key: "home", label: "Inicio", icon: <Home size={17} />, description: "Decidir" },
  { key: "explore", label: "Radar", icon: <Compass size={17} />, description: "Encontrar" },
  { key: "market", label: "Mercado", icon: <Landmark size={17} />, description: "Contrastar" },
  { key: "opportunities", label: "Pipeline", icon: <Radar size={17} />, description: "Avanzar" },
  { key: "portfolio", label: "Cartera", icon: <Building2 size={17} />, description: "Medir" },
];

const NAMES: Record<View, string> = {
  home: "Inicio",
  explore: "Radar",
  market: "Mercado",
  opportunities: "Pipeline",
  portfolio: "Cartera",
  analyze: "Analizar",
  property: "Workspace",
};

export function EstateSidebar({ view, open, dealCount, onSelect, onClose }: {
  view: View;
  open: boolean;
  dealCount: number;
  onSelect: (view: View) => void;
  onClose: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand-row"><div className="brand-mark"><Building2 size={17} /></div><div className="brand-copy"><strong>Estate</strong><span>Investment OS</span></div><button className="icon-button sidebar-close" onClick={onClose} aria-label="Cerrar menú"><X size={17} /></button></div>
      <div className="nav-caption">INVESTMENT LOOP</div>
      <nav className="nav-stack" aria-label="Navegación principal">
        {NAV.map((item, index) => (
          <button key={item.key} className={`nav-item ${view === item.key ? "active" : ""}`} onClick={() => onSelect(item.key)} title={item.description}>
            <span className="nav-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
            {item.key === "opportunities" && dealCount > 0 ? <span className="nav-count">{dealCount}</span> : <ChevronRight size={13} className="nav-chevron" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-rule" />
      <div className="sidebar-flow-icons" aria-label="Encontrar, validar, comprar, operar"><span>◎</span><i /><span>◈</span><i /><span>◆</span><i /><span>↻</span></div>
      <div className="sidebar-foot"><div className="system-status"><span className="live-dot" /><span>Estate v1.3</span><small>online</small></div></div>
    </aside>
  );
}

export function EstateTopbar({ view, propertyTitle, authReady, signedIn, onMenu, onLogin, onLogout, onNew }: {
  view: View;
  propertyTitle?: string | null;
  authReady: boolean;
  signedIn: boolean;
  onMenu: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onNew: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left"><button className="icon-button mobile-menu" onClick={onMenu} aria-label="Abrir menú"><Menu size={18} /></button><div className="breadcrumb"><span>Estate</span><ChevronRight size={12} /><strong>{view === "property" && propertyTitle ? propertyTitle : NAMES[view]}</strong></div></div>
      <div className="topbar-actions"><span className="engine-pill"><Activity size={12} /> v1.3</span>{authReady && (signedIn ? <button className="icon-button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button> : <button className="ghost-button" onClick={onLogin}><LogIn size={14} /> Entrar</button>)}<button className="primary-button compact" onClick={onNew}><Plus size={15} /> Analizar</button></div>
    </header>
  );
}
