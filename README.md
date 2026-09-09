# Estate · Firekworks

**Real Estate Intelligence OS** para encontrar, contrastar, analizar, validar y operar inversiones inmobiliarias con trazabilidad.

Estate separa **hechos, estimaciones y supuestos**. Un dato ausente permanece ausente; la confianza forma parte del resultado.

## Estate v1.3

Stack:

- Next.js 16.3.4 / React 19 / TypeScript.
- Vercel para producción y CI.
- Supabase/PostgreSQL + Auth + RLS.
- Storage privado por usuario/propiedad para fotografías.
- Motor financiero determinista `estate_financial_v1.0.0`.
- Radar visual, scoring compuesto y workspaces por inmueble.
- Capa AI opcional para sourcing web, extracción de anuncios, microzona y visión de fotografías.

## Investment loop

`RADAR → CONTRASTAR → VALIDAR → ROMPER → NEGOCIAR → OPERAR`

Navegación:

1. **Inicio / Decidir** — centro de decisión y siguiente acción.
2. **Radar / Encontrar** — sourcing, filtros, CSV, URLs y señales web.
3. **Mercado / Contrastar** — €/m², yield, muestra y micromercados.
4. **Pipeline / Avanzar** — Radar → Análisis → Visita → Negociación → Compra → Cartera.
5. **Cartera / Medir** — equity, deuda, cash-flow, yield y rendimiento por activo.

La reforma no es un módulo global: vive dentro del inmueble.

## Radar

Entrada disponible:

- URL manual;
- formulario manual;
- CSV;
- operaciones ya guardadas;
- radar web asistido por IA cuando existe `OPENAI_API_KEY`;
- futuros feeds/APIs oficiales con credenciales.

El radar web busca oportunidades públicas actuales, incluyendo portales grandes, servicers y webs de inmobiliarias locales descubiertas durante la investigación. Los resultados se deduplican y conservan evidencia/URL. No se afirma cobertura exhaustiva cuando una fuente no ofrece acceso autorizado o API.

## Scoring

Estate v1.3 añade un ranking compuesto y consciente de la confianza:

- Finanzas: **40%**.
- Mercado: **15%**.
- Inquilino/zona: **15%**.
- Inmueble/fotos: **15%**.
- Riesgo: **15%**.

La puntuación se penaliza cuando falta evidencia. Un `Kill Switch` abierto impide avanzar la operación.

El motor financiero continúa siendo independiente y determinista; el score compuesto sirve para priorizar oportunidades, no para sustituir una tasación o due diligence profesional.

## Analizador

`Captura → Inmueble → Mercado → Compra → Operación → Decisión`

Incluye precio, valor estimado, alquiler, costes, financiación, cash-flow, yield, cash-on-cash, cap rate, DSCR, Capital Velocity, stress tests y precio máximo compatible con el objetivo.

## Workspace por inmueble

Cada propiedad dispone de:

- **Decisión** — siguiente acción, data debt, stress y bloqueantes.
- **Inmueble** — ficha física, instalaciones, comunidad y Photo Desk.
- **Zona** — movilidad, servicios, demanda, liquidez, ruido, evidencia e inquilino objetivo.
- **Rentabilidad** — waterfall renta → vacancia → OPEX → NOI → hipoteca → cash-flow.
- **Reforma** — partidas DIY / híbrido / PRO, coste y uplift.
- **Riesgos** — due diligence y Kill Switch.
- **Plan** — visita, negociación, compra, reforma, captación de inquilino y operación.

## Fotografías

Bucket privado: `estate-property-images`.

Al subir una fotografía, si `OPENAI_API_KEY` está configurada, Estate puede obtener:

- estancia probable;
- score visual de estado;
- señales positivas visibles;
- problemas visibles y severidad;
- partidas que conviene presupuestar;
- comprobaciones manuales recomendadas;
- confianza.

La visión no diagnostica instalaciones ocultas, defectos estructurales no visibles ni costes monetarios a partir de una foto.

Las imágenes encontradas en anuncios pueden conservarse como fuentes del inmueble; una URL de imagen ausente no se inventa.

## Microzona e inquilino

Con la capa AI activa, Estate puede investigar fuentes públicas para estimar:

- movilidad;
- servicios;
- demanda de alquiler;
- liquidez;
- ruido cuando exista evidencia;
- seguridad solo cuando haya una fuente pública razonable;
- perfiles de inquilino compatibles con el producto;
- canales de captación.

No se infieren atributos sensibles de residentes ni se generan distancias exactas sin proveedor geoespacial.

## Fuentes / conectores

Estado visible en `/api/sources/status`.

Preparado para:

- OpenAI web research / visión.
- idealista Search API, sujeto a acceso contractual.
- idealista/data para comparables/mercado, sujeto a acceso.
- pisos.com API, con clave.
- Inmovilla REST/XML, con token/feed de agencia.
- Google Places para POIs/distancias.

También puede investigar webs públicas de agencias locales mediante el radar web, sin simular un feed completo del portal.

## Variables de entorno

Variables públicas de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Capa AI, solo servidor:

```env
OPENAI_API_KEY=
OPENAI_ESTATE_MODEL=gpt-5.6-luna
OPENAI_ESTATE_RESEARCH_MODEL=gpt-5.6-luna
OPENAI_ESTATE_VISION_MODEL=gpt-5.6-luna
```

Conectores opcionales:

```env
IDEALISTA_API_KEY=
IDEALISTA_API_SECRET=
IDEALISTA_DATA_API_KEY=
PISOS_API_KEY=
INMOVILLA_TOKEN=
INMOVILLA_FEED_URL=
GOOGLE_MAPS_API_KEY=
```

Nunca exponer secretos mediante variables `NEXT_PUBLIC_*`.

## Modelo de datos

`PROPERTY ≠ LISTING ≠ ANALYSIS`

- `estate_properties` — inmueble físico.
- `estate_listings` — anuncios/fuentes.
- `estate_listing_history` — snapshots del anuncio/precio.
- `estate_deal_analyses` — versiones de underwriting.
- `estate_market_estimates` — estimaciones y confianza.
- `estate_property_images` — fotografías y análisis.
- `estate_renovation_items` — reforma por inmueble.
- `estate_risks` — due diligence/riesgos.
- `estate_financing_scenarios` — financiación.
- `estate_audit_events` — trazabilidad.

Reanalizar crea una nueva versión; no duplica el activo físico.

## Calidad

CI ejecuta:

```bash
npm run test
npm run lint
npm run typecheck
npx next build
```

Los tests cubren cuota hipotecaria, financiación al 0%, capital requerido, sensibilidad a renta, precio máximo, cobertura/confianza, stress y protección contra NaN/Infinity.

## Principios

1. No inventar datos.
2. Una cifra debe poder explicarse.
3. La confianza forma parte del resultado.
4. La interfaz guía el procedimiento visualmente.
5. Cada módulo responde una pregunta distinta.
6. Zona, fotos, reforma, riesgos e inquilino pertenecen al inmueble.
7. Guardar significa conservar historial y evidencia.
8. Antes de comprar, Estate intenta romper la tesis.
