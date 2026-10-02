import { LockKeyhole, ArrowRight, Loader2 } from "lucide-react";
const modules: Record<string, { title: string; items: string[] }> = {
  explore: {
    title: "Radar",
    items: ["Búsquedas guardadas", "Oportunidades", "Fuentes y límites"],
  },
  market: {
    title: "Mercado",
    items: [
      "Distribución de precios",
      "Calidad de muestra",
      "Comparables privados",
    ],
  },
  opportunities: {
    title: "Pipeline",
    items: ["Próxima acción", "Etapas de compra", "Riesgos y bloqueos"],
  },
  portfolio: {
    title: "Cartera",
    items: ["Capital y deuda", "Resultado real", "Estrategia por activo"],
  },
  property: {
    title: "Inmueble",
    items: ["Evidencias", "Análisis", "Operaciones"],
  },
};
export function AccessState({
  view,
  loading,
  onLogin,
}: {
  view: string;
  loading: boolean;
  onLogin: () => void;
}) {
  const m = modules[view] ?? {
    title: "Estate",
    items: ["Analizar", "Decidir", "Medir"],
  };
  return (
    <section className="access-state" aria-busy={loading}>
      <span className="eyebrow">ESPACIO PRIVADO</span>
      <h1>{m.title}</h1>
      <div className="access-layout">
        <div className="access-action">
          {loading ? (
            <Loader2 className="spin" size={28} />
          ) : (
            <LockKeyhole size={28} />
          )}
          <h2>{loading ? "Comprobando acceso" : "Tu espacio de inversión"}</h2>
          <p>
            {loading
              ? "Preparando tu sesión."
              : "Entra para consultar tus datos y continuar."}
          </p>
          {!loading && (
            <button className="primary-button" onClick={onLogin}>
              Iniciar sesión <ArrowRight size={16} />
            </button>
          )}
        </div>
        <div className="access-preview">
          {m.items.map((item, i) => (
            <div key={item}>
              <span>0{i + 1}</span>
              <strong>{item}</strong>
              <LockKeyhole size={14} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function DataLoading() {
  return (
    <div className="data-loading" role="status" aria-busy="true">
      <Loader2 size={20} className="spin" />
      <span>Cargando tu espacio</span>
      <div className="skeleton-grid">
        {[0, 1, 2].map((i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}
