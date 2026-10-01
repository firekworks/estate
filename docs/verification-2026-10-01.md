# Estate 2.0 — estado de verificación

## Medido

- Repositorio independiente `firekworks/estate`, rama `codex/estate-decision-os`.
- Motor `estate_financial_v2.0.0`; Next.js 16.3.8; compilación con Node 24.19.0.
- 31 pruebas unitarias pasan: amortización, capital, rentas, yield, techos, contado, financiación vendedor amortizable, stress, CSV, percentiles, riesgo bloqueante y score.
- Migraciones `estate_decision_operations`, `estate_saved_searches`, `estate_strategy_and_capital`, `estate_investor_cashflows` aplicadas al proyecto Supabase compartido, únicamente entidades Estate.
- Prueba SQL transaccional con rol authenticated y dos identidades: guardado atómico, dos análisis de una propiedad, deduplicación URL, caída de precio, visita que crea riesgo, bloqueo de compra, resolución y transición, cierre mensual, aislamiento RLS, FK de propietario y bloqueo de proveedor sin presupuesto. ROLLBACK de todos los registros de prueba.
- Advisor de seguridad: ningún hallazgo asociado a entidades `estate_*`. Avisos de otras aplicaciones conservados sin modificación.
- API local: health/status 200; research/vision/zone sin sesión 401; import sin URL 400.
- Navegador: Inicio, Mercado, Movilidad y analizador comercial renderizan. Simulación no guardada de local 340 m² en Castalla.
- Capturas del analizador: 1440×900, 1512×982, 1728×1117, 1280×800, 768×1024, 390×844. Medida de overflow negativa en seis; revisión visual detectó superposición móvil y se corrigió. Captura posterior en `docs/qa/analyzer-mobile-fixed.png`.
- `npm audit --omit=dev`: 0 vulnerabilidades.

## Implementado

Inicio por excepciones, Cartera basada en cierres reales, Mercado independiente mediante comparables CSV, muestras mínimas configurables, percentiles, comparación homogénea de hasta tres operaciones, búsquedas persistidas, tipologías incl. local/garaje/suelo, siete techos de precio, cap rate separado de yield on cost, stress ampliado, score desglosado con cobertura y kill switches, pipeline ampliado, tareas/visitas/ofertas/documentos por URL/evidencias/alquiler, snapshots de estrategia, control conservador de llamadas de pago, revisión de fotos y reintento IA, mapa Leaflet con aforos ligados a coordenadas y modos separados.

## No demostrado / trabajo pendiente

- Recorrido UI autenticado completo y estado poblado con la sesión del usuario. La prueba SQL no sustituye esta prueba.
- Invocaciones reales OpenAI: sin clave ni presupuesto. Places/Routes y feeds contractuales no conectados. No se factura ni se afirma conexión por tener una clave.
- GVA WFS conectado y probado: consulta Castalla 2025 devuelve cuatro tramos (CV-80, CV-799, CV-806), representados como geometría real. HTTP 400 para coordenadas/años inválidos. Licencia CC BY y año conservados; ingesta diaria/GPKG pendiente.
- Coincidencias de dirección sugieren vinculación manual; no se fusiona con baja confianza. Deduplicación por fotos/coordenadas, seguimiento automático de retirada/republicación y alertas por umbral: pendientes. La URL normalizada conserva propiedad e historial.
- Filtros temporales, hora, laborable/fin de semana y comparación A/B de datasets implementados; isócronas y análisis espacial avanzado pendientes. A/B advierte metodología/unidades; no prueba causalidad.
- Reforma: formulario avanzado y matriz ROI implementados (cantidades, unitarios, materiales, mano de obra, contingencia, fuente, mejoras estimadas y techo orientativo). Pendiente prueba UI autenticada.
- XIRR ACT/365 implementada sobre movimientos reales de inversor, con rechazo de flujos ambiguos. NOI, ocupación, serie de cash-flow y error medio agrupado implementados. Calibración automática no activada; faltan análisis de reforma/días de alquiler y parámetros de calibración versionados.
- Recalcular automáticamente todos los supuestos tras visita requiere presupuestos/evidencias: la visita registra riesgos y tarea; no inventa costes ni altera el análisis silenciosamente.
- Escenarios de estrategia se guardan y se listan por fecha/versión. Proyección de mantener con amortización, apreciación, CAPEX, descuento por coste de oportunidad y comparación con venta actual implementada y cubierta por tres pruebas; pendiente recorrido UI autenticado.
- Auditoría Axe exhaustiva, todas las pantallas pobladas a seis resoluciones y logs productivos posteriores al despliegue: pendientes.

## Configuración y costes

- Vercel Estate no tenía variables de entorno configuradas al inspeccionarlo. La conexión Supabase pública existente se comparte ahora entre cliente y validación server-side; no se usa service role.
- Para IA: `OPENAI_API_KEY` y modelos explícitos, más fila administrativa en `estate_provider_budgets` por usuario/proveedor con límite de llamadas, presupuesto mensual EUR y reserva conservadora por llamada. Valor cero o ausencia bloquea la ejecución.
- La reserva no equivale a factura real ni garantiza tarifa de proveedor: configurar según precios/uso máximos y revisar consumo. Aún falta conciliación exacta de tokens, errores y latencia.
- Google requiere clave y activación del servicio correspondiente; los proveedores comerciales requieren contrato/licencia y validación técnica.
- Sin nuevas suscripciones, compras ni activaciones de proveedores en este trabajo.

## Ampliación posterior

Migración estate_investor_cashflows aplicada; historial de propiedad y escenarios visible; riesgo con responsable/plazo/fuente; 31 tests pasan. PR #4 y preview dpl_6v7SjbwWSPXKM7rXUpEQcRAtF3mD READY corresponden a la primera entrega; actualizar despliegue para incorporar esta ampliación.

## Validación de esta ampliación

31 pruebas pasan. Financiación total sin impuestos no emite Infinity; una tasación inferior sustituye deuda por aportación sin tratarla como gasto. Revisión de seguridad después de las cuatro migraciones: cero hallazgos Estate. Analizador sin overflow en las seis resoluciones sobre compilación de producción local; capturas `release-analyzer-*` y medidas `release-responsive.json`. Esto no sustituye las pantallas privadas pobladas.
