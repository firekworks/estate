# Estate · Firekworks

**Real Estate Intelligence OS** para descubrir, filtrar, analizar, validar, negociar y operar inversiones inmobiliarias con trazabilidad.

Estate no intenta decir que un inmueble es un “chollo”. Separa **hechos, estimaciones y supuestos**, cuantifica capital/rentabilidad/riesgo, conserva versiones y obliga a reducir incertidumbre antes de avanzar una compra.

## Estate v1.2

Stack actual:

- Next.js 16.3.4 / React 19.2.8 / TypeScript.
- Vercel para CI de producción y despliegue.
- Supabase/PostgreSQL compartido de Firekworks, aislado mediante tablas `estate_*`.
- Supabase Auth + Row Level Security.
- Supabase Storage privado para fotografías por usuario/propiedad.
- Motor financiero determinista y versionado: `estate_financial_v1.0.0`.
- Importador de URLs con detección de fuente y **sin scraping no autorizado**.
- GitHub Actions: test + lint + typecheck + production build.

## Flujo de producto

Estate está diseñado alrededor del procedimiento real de inversión:

`Descubrir → Filtrar → Analizar → Validar → Visitar → Negociar → Comprar → Reformar → Alquilar → Medir`

La navegación principal evita mezclar fases distintas:

### Inicio

Centro de decisión, no dashboard de métricas. Muestra:

- qué operación merece atención;
- siguiente acción recomendada;
- deuda de datos / cobertura;
- señales críticas;
- cola de decisiones;
- estado resumido del capital y cartera.

### Explorar

Bandeja de oportunidades:

- búsqueda;
- filtros por precio, yield y score;
- ordenación;
- tarjetas comparables;
- comparación simultánea de hasta tres oportunidades;
- procedencia del dataset.

**Explorar contiene ofertas. Mercado no.**

### Mercado

Contexto del mercado y calidad de la evidencia:

- precio €/m² frente a yield;
- medianas por municipio;
- alquiler/m²;
- días de mercado;
- score mediano;
- tamaño/calidad de muestra;
- estado de fuentes.

Una muestra pequeña se etiqueta como insuficiente/orientativa; no se presenta como “precio de mercado”.

### Oportunidades

Pipeline de adquisición:

1. Radar — ¿merece tiempo?
2. Análisis — ¿cuadran los datos?
3. Visita — ¿la realidad confirma?
4. Negociación — ¿a qué precio entra?
5. Compra — ¿qué hay que ejecutar?
6. Cartera — ¿rinde como se esperaba?

Un **Legal/Risk Kill Switch** abierto impide avanzar automáticamente la operación.

### Cartera

Solo aparecen activos `purchased` o `managed`:

- valor estimado;
- deuda;
- equity estimado;
- cash-flow;
- yield;
- contribución de cada activo;
- seguimiento previsto vs. real conforme se incorporen datos operativos.

## Analizador

El underwriting inicial se divide en seis pasos para evitar una pared de formularios:

1. **Captura** — URL, nombre, ubicación y fuente.
2. **Inmueble** — superficies, dormitorios, baños, planta, edificio e instalaciones.
3. **Mercado** — precio, valor estimado, alquiler, confianza, días y estrategia de alquiler.
4. **Compra** — impuestos, costes y financiación.
5. **Operación** — comunidad, IBI, seguro, vacancia, mantenimiento y provisiones iniciales.
6. **Decisión** — score, fortalezas, debilidades, stress tests y precio máximo.

Los inputs recalculan el motor financiero en tiempo real.

## Workspace por propiedad

Después del underwriting, cada inmueble se convierte en un workspace propio. **Reforma ya no es un módulo global**.

### Decisión

- siguiente decisión;
- precio pedido vs. máximo;
- apertura orientativa;
- Data Debt: evidencias pendientes;
- stress test;
- riesgos bloqueantes.

### Inmueble

- ficha física;
- instalaciones eléctricas/fontanería/calefacción/agua/gas/internet;
- comunidad y estado;
- fotografías privadas;
- etiquetado de estancia;
- valoración manual de estado por imagen;
- enlace geográfico por dirección.

### Zona

- movilidad;
- servicios;
- seguridad percibida;
- demanda de alquiler;
- liquidez de salida;
- luz y ruido;
- servicios cercanos;
- notas/evidencias;
- encaje con inquilino objetivo.

Hasta disponer de proveedores geoespaciales, estos valores son evaluación manual trazable; Estate **no inventa distancias ni índices de seguridad**.

### Rentabilidad

- waterfall alquiler → vacancia → OPEX → NOI → hipoteca → cash-flow;
- yield bruta/neta;
- cash-on-cash;
- cap rate;
- DSCR;
- Capital Velocity;
- capital stack;
- disciplina de precio.

### Reforma

Desglose específico del inmueble:

- partidas;
- modo DIY / híbrido / PRO;
- coste por partida;
- profesional obligatorio;
- uplift estimado de alquiler;
- confianza de la estimación.

La provisión inicial del underwriting no se confunde con un presupuesto real.

### Riesgos

- registro de riesgos;
- severidad y confianza;
- estado abierto/resuelto;
- Legal Kill Switch;
- due diligence mínima: titularidad, cargas, comunidad, edificio, electricidad, fontanería, ocupación, etc.

### Plan

- timeline de ejecución;
- estrategia de negociación;
- precio pedido / apertura / máximo;
- perfil de inquilino;
- canales de captación;
- salida a alquiler;
- seguimiento posterior.

## Modelo de datos

Regla estructural:

`PROPERTY ≠ LISTING ≠ ANALYSIS`

- `estate_properties`: activo físico.
- `estate_listings`: anuncios/fuentes de comercialización.
- `estate_listing_history`: snapshots del anuncio/precio.
- `estate_deal_analyses`: versiones del underwriting.
- `estate_market_estimates`: estimaciones de mercado con confianza/procedencia.
- `estate_property_images`: fotos del inmueble.
- `estate_renovation_items`: partidas de reforma por inmueble.
- `estate_risks`: riesgos/due diligence.
- `estate_financing_scenarios`: escenarios de financiación.
- `estate_audit_events`: trazabilidad.

Reanalizar una propiedad crea una **nueva versión** del análisis; no duplica el inmueble físico.

## Hecho · Estimación · Supuesto

Estate trata la procedencia como parte del dato:

- **Hecho**: dato observado/verificado.
- **Estimación**: valor inferido a partir de evidencia disponible.
- **Supuesto**: hipótesis necesaria para modelar el escenario.

La confianza del score depende de la calidad/cobertura de datos. Un dato desconocido permanece desconocido.

## Fotografías

Bucket privado: `estate-property-images`.

- límite: 10 MB por archivo;
- JPEG / PNG / WebP / HEIC / HEIF;
- rutas segregadas por `auth.uid()`;
- políticas SELECT/INSERT/UPDATE/DELETE para el propietario;
- URLs firmadas temporales para preview.

El Photo Desk ya permite guardar/revisar fotos. El **análisis visual automático** no se simula: requiere configurar un proveedor de visión antes de activar scoring automático de estado/reforma.

## Datos externos

La arquitectura está preparada para adaptadores de proveedores, pero una integración solo debe activarse cuando exista fuente/licencia/credenciales reales.

Pendiente de proveedor externo:

- inventario de portales en tiempo real;
- comparables de venta/alquiler licenciados;
- tiempos de transporte y POIs;
- indicadores objetivos de seguridad;
- demanda/absorción de alquiler;
- análisis AI de fotografías;
- valoración AVM profesional.

Hasta entonces, Estate trabaja con datos propios/manuales y deja visible su nivel de confianza.

## Seguridad

- tablas Estate con RLS;
- Storage de fotos privado;
- separación por `auth.uid()`;
- auditoría de cambios de etapa/análisis;
- timestamps `updated_at` mediante trigger en entidades editables;
- no se almacenan service-role keys en cliente.

El proyecto Supabase es compartido con otras herramientas de Firekworks; los advisories globales ajenos a `estate_*` deben corregirse en sus propios módulos y no mediante migraciones invasivas desde Estate.

## Calidad

Antes de producción:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

El motor tiene tests deterministas sobre:

- cuota hipotecaria;
- financiación al 0%;
- capital requerido;
- sensibilidad a alquiler;
- precio máximo;
- cobertura/confianza;
- stress scenarios;
- protección contra NaN/Infinity.

## Principios de producto

1. **No inventar datos.**
2. **Una cifra debe poder explicarse.**
3. **La confianza forma parte del resultado.**
4. **La interfaz guía el procedimiento; no exhibe métricas porque sí.**
5. **Cada módulo responde una pregunta distinta.**
6. **La reforma, zona, fotos, riesgos y plan pertenecen al inmueble.**
7. **Guardar una operación significa conservar su historia, no sobrescribirla.**
8. **Antes de comprar, Estate intenta romper la tesis con evidencia y stress.**
