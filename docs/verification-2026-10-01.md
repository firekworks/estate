# Estate 2.0 — estado de verificación

## Medido

- Repositorio independiente `firekworks/estate`, rama `codex/estate-decision-os`.
- Motor `estate_financial_v2.0.0`; Next.js 16.3.8; compilación con Node 24.19.0.
- 23 pruebas unitarias pasan: amortización, capital, rentas, yield, techos, contado, financiación vendedor amortizable, stress, CSV, percentiles, riesgo bloqueante y score.
- Migraciones `estate_decision_operations`, `estate_saved_searches`, `estate_strategy_and_capital` aplicadas al proyecto Supabase compartido, únicamente entidades Estate.
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
- GVA: enlace y contrato de estado disponibles; ingesta automática WFS/GPKG no implementada. No requiere una clave del usuario: es trabajo de integración pendiente.
- Deduplicación física entre distintas URL, sugerencias de fusión, seguimiento automático de retirada/republicación y alertas por umbral: pendientes. La URL exacta normalizada conserva propiedad e historial al guardar.
- Series geográficas avanzadas, isócronas, comparación A/B y time slider: pendientes. Los aforos CSV son agregados y no se mezclan con peatones.
- Reforma: campos de desglose añadidos en BD; formulario avanzado y matriz ROI completos pendientes. No asumir que columnas equivalen a funcionalidad UI.
- IRR/XIRR, series de cartera y calibración agrupada de modelos: pendientes. No se muestran métricas inventadas.
- Recalcular automáticamente todos los supuestos tras visita requiere presupuestos/evidencias: la visita registra riesgos y tarea; no inventa costes ni altera el análisis silenciosamente.
- Escenarios de estrategia se guardan pero falta listado de versiones en UI y proyecciones hold con apreciación/coste oportunidad.
- Auditoría Axe exhaustiva, todas las pantallas pobladas a seis resoluciones y logs productivos posteriores al despliegue: pendientes.

## Configuración y costes

- Vercel Estate no tenía variables de entorno configuradas al inspeccionarlo. La conexión Supabase pública existente se comparte ahora entre cliente y validación server-side; no se usa service role.
- Para IA: `OPENAI_API_KEY` y modelos explícitos, más fila administrativa en `estate_provider_budgets` por usuario/proveedor con límite de llamadas, presupuesto mensual EUR y reserva conservadora por llamada. Valor cero o ausencia bloquea la ejecución.
- La reserva no equivale a factura real ni garantiza tarifa de proveedor: configurar según precios/uso máximos y revisar consumo. Aún falta conciliación exacta de tokens, errores y latencia.
- Google requiere clave y activación del servicio correspondiente; los proveedores comerciales requieren contrato/licencia y validación técnica.
- Sin nuevas suscripciones, compras ni activaciones de proveedores en este trabajo.
