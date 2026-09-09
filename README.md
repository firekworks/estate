# Estate · Firekworks

**Real Estate Intelligence OS** para analizar operaciones inmobiliarias de forma auditable, explicable y orientada a reducir errores.

Estate no es una inmobiliaria ni una calculadora que marque un inmueble como “chollo”. Su función es separar **hechos, estimaciones y supuestos**, cuantificar capital, rentabilidad y riesgo, y conservar el histórico para aprender con datos reales.

## Estado actual

V1 interna operativa sobre:

- Next.js 16.3.4 / React 19.2.8.
- Vercel para build y producción.
- Supabase/PostgreSQL compartido de Firekworks, aislado mediante tablas `estate_*`.
- Supabase Auth + Row Level Security.
- Motor financiero determinista y versionado: `estate_financial_v1.0.0`.
- Importador de URLs con detección de fuente y **sin scraping no autorizado**.
- Dashboard, analizador, stress test, scoring explicable y watchlist persistente.

## Principios de producto

1. **No inventar datos.** Si una variable de mercado no está verificada, se reduce su confidence.
2. **Explicar cada score.** Una puntuación debe mostrar sus componentes y por qué existen.
3. **Intentar romper cada operación.** El stress test forma parte del análisis, no es un extra.
4. **Trazabilidad.** Inputs, outputs, fuente, versión del motor y fecha se conservan.
5. **Property != Listing.** El inmueble físico y cada anuncio son entidades distintas.
6. **Legal first.** Estrategias no válidas deben poder bloquearse en fases posteriores mediante Legal Kill Switch.
7. **Capital Velocity.** La velocidad a la que el capital vuelve a estar disponible es una métrica central.
8. **Internal first.** Estate se valida primero con operaciones reales de Firekworks antes de plantearse como SaaS.

## V1 implementada

### Deal Analyzer

Inputs actuales:

- precio de compra;
- valor de mercado introducido;
- alquiler mensual;
- superficie;
- impuesto de compra configurable;
- LTV, interés y plazo;
- costes de notaría/registro, tasación y financiación;
- reforma, mobiliario y colchón;
- comunidad, IBI, seguro, mantenimiento, gestión, vacancia y otros gastos;
- ahorro mensual externo;
- capital recuperable y objetivo de siguiente entrada;
- rentabilidad neta objetivo;
- días en mercado y bajadas de precio;
- Data Confidence.

Resultados:

- préstamo y entrada;
- cuota hipotecaria;
- capital total requerido;
- €/m²;
- renta efectiva tras vacancia;
- gastos operativos;
- NOI;
- cash-flow mensual neto;
- rentabilidad bruta y neta;
- cash-on-cash;
- cap rate;
- DSCR;
- máximo precio de compra según rentabilidad objetivo;
- oferta inicial orientativa;
- Capital Velocity;
- Deal Score explicable;
- Stress Status y Deal Verdict.

### Stress test V1

Se recalcula la operación con:

- alquiler -10%;
- alquiler -20%;
- interés +2 puntos porcentuales;
- reforma +30%.

`green` significa que los cuatro escenarios adversos mantienen cash-flow >= 0 y, cuando existe deuda, DSCR >= 1. `orange` significa que sobreviven al menos dos. `red` indica fragilidad y fuerza un veredicto conservador.

## Fórmulas clave

### Hipoteca

Cuota francesa estándar:

```text
M = P * [r(1+r)^n] / [(1+r)^n - 1]
```

Con `P` principal, `r` interés mensual y `n` meses. Si el interés es 0, se divide principal entre meses.

### Capital requerido

```text
entrada
+ impuesto compra
+ notaría/registro
+ tasación
+ costes financiación
+ reforma
+ mobiliario
+ colchón
= capital requerido
```

### NOI mensual

```text
renta efectiva tras vacancia
- comunidad
- IBI/12
- seguro/12
- mantenimiento
- gestión
- otros gastos
= NOI mensual
```

### Cash-flow

```text
NOI mensual - cuota hipotecaria = cash-flow mensual neto
```

### Rentabilidad neta V1

```text
NOI anual / coste total del proyecto
```

El coste total de proyecto incluye compra, impuesto, costes fijos de adquisición, reforma y mobiliario. El colchón no se considera coste del activo.

### Máximo precio de compra

Dado un objetivo de rentabilidad neta:

```text
Pmax = [(NOI anual / rentabilidad objetivo) - costes fijos no ligados al precio]
       / (1 + tipo de impuesto de compra)
```

Es una disciplina de precio, no una tasación oficial.

### Capital Velocity V1

```text
capital pendiente para siguiente objetivo
/
(ahorro mensual externo + cash-flow mensual positivo)
```

El modelo permite descontar capital recuperable. Refinanciación, amortización de principal y revalorización se incorporarán en una versión posterior.

## Deal Score V1

No existe un score “mágico”. Se agregan componentes con `weight × confidence` y se renormalizan:

- cash-flow;
- rentabilidad neta;
- DSCR;
- Capital Velocity;
- resistencia al stress;
- calidad de datos;
- negociación, solo si hay señales;
- precio vs. valor, solo si existe valoración introducida.

La UI muestra además **score coverage/confidence** para evitar una precisión falsa.

## Base de datos

Tablas V1:

- `estate_investor_profiles`
- `estate_properties`
- `estate_listings`
- `estate_listing_history`
- `estate_property_images`
- `estate_market_estimates`
- `estate_financing_scenarios`
- `estate_renovation_items`
- `estate_deal_analyses`
- `estate_risks`
- `estate_audit_events`

Todos los datos de Estate exigen sesión autenticada. `anon` no tiene privilegios sobre estas tablas y las políticas RLS filtran por `auth.uid() = user_id`.

Las relaciones hijas usan además `property_id + user_id` o `listing_id + user_id` para impedir referencias cruzadas entre propietarios.

## Seguridad

- En frontend solo se utiliza la **publishable key** de Supabase.
- Nunca se expone `service_role`/secret key.
- RLS permanece activado en todas las tablas Estate.
- Las escrituras llevan `user_id` y son verificadas por Postgres.
- Un fallo durante un guardado compuesto intenta eliminar la propiedad recién creada para evitar registros parciales.
- El importador no descarga ni parsea páginas de portales inmobiliarios sin un conector permitido.
- `robots` está configurado como `noindex,nofollow` mientras sea una herramienta interna.

## Variables de entorno

La aplicación acepta:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

La URL y publishable key no son secretos y existe fallback al proyecto Firekworks actual. No añadir claves privadas al repositorio.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Endpoints

- `GET /api/health`: estado de aplicación y versión del motor.
- `POST /api/import`: valida URL, detecta proveedor conocido y devuelve la estrategia de extracción. No hace scraping.

## Roadmap

### V1.1 — completar núcleo interno

- edición de operaciones guardadas;
- estados watchlist/visitar/negociar/descartar;
- reforma PRO/DIY/híbrida por partidas;
- escenarios de financiación múltiples;
- exportación PDF de análisis;
- tests automatizados de fórmulas;
- perfil de inversor persistente.

### V2 — data intelligence

- histórico de anuncios;
- deduplicación Property/Listing;
- comparables;
- alquiler estimado con rango/confidence;
- microzona;
- Rental Demand Score;
- Exit Liquidity Score;
- Light/Noise/Environmental Risk;
- IA visual de fotografías;
- negociación basada en evidencias;
- adaptadores API/licenciados por proveedor.

### V3 — visita y reforma

- checklist móvil;
- fotos/vídeo/mediciones;
- planos y LiDAR/Matterport/magicplan cuando proceda;
- Renovation Engine por partidas;
- PRO vs DIY vs híbrido;
- Renovation ROI;
- proveedores y costes reales.

### V4 — compra y explotación

- due diligence documental;
- Legal Kill Switch;
- ofertas y negociación;
- compra y reforma real;
- contratos, inquilinos, cobros e incidencias;
- maintenance reserve.

### V5 — patrimonio

- equity/deuda;
- portfolio cash-flow;
- ROE;
- refinanciación;
- BRRRR adaptado a España;
- siguiente oportunidad según Capital Velocity.

### V6 — posible PropTech comercial

Solo después de validar los modelos con operaciones reales, errores predicho-vs-real y datos propios.

## Alcance y responsabilidad

Estate es una herramienta interna de análisis. Los cálculos fiscales, legales, técnicos, de tasación y financiación deben validarse con fuentes oficiales y profesionales antes de una compra. Un score nunca sustituye due diligence jurídica, técnica, registral o bancaria.
