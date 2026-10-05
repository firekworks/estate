# Estate 2.0.2 — interfaz de decisión y recorrido

## Cambios

- Un requisito compartido de cálculo protege el analizador, guardado y lectura de resultados en Inicio, Radar, Pipeline y workspace. EMPTY → INCOMPLETE → ESTIMATED → VALIDATED. Sin mínimos, el resultado es `null`, no un cero presentado como inversión evaluada.
- Mínimos: nombre, municipio, activo, superficie y precio/renta positivos, financiación válida y costes finitos no negativos revisados explícitamente. Umbral mínimo 80%; todos los campos críticos son obligatorios aunque se supere ese umbral. Los defaults no validan los costes. La ficha inicial tiene cobertura 0%.
- INCOMPLETE muestra cobertura, hasta tres siguientes datos y continuar. ESTIMATED conserva la distinción entre hipótesis y hechos. VALIDATED requiere referencias registradas como comprobadas para precio, superficie, renta y costes; es validación declarada por la persona, no verificación automática de documentos. Editar un dato invalida su referencia; editar costes revoca su revisión.
- Score y confianza independientes. Motor `estate_financial_v2.0.1`: se elimina la confianza del cálculo de la nota económica, conservando las fórmulas de caja, deuda, rentabilidad, techos y escenarios. La cobertura visible corresponde a mínimos; la confianza y el ranking ajustado siguen expresando incertidumbre. Versiones históricas no se sobrescriben.
- Una decisión, tres métricas, cinco señales y resistencia resumida. Escenarios en diálogo nativo con foco y Escape. Contexto y supuestos bajo interacción; no se duplica el score entre cabecera y workspace. Riesgos bloqueantes muestran «No avanzar».
- Cada módulo tiene una pregunta explícita. Detalles de evidencia, muestras, proveedores, métricas avanzadas y calibración permanecen accesibles bajo desplegables. Se eliminan pre-scores de candidatos sin costes revisados y adornos repetidos del Pipeline.
- Guardar usa la transacción existente. Un fallo de fotos posterior al commit ya no simula un fallo del inmueble; la UI informa del guardado parcial. Un fallo de recarga conserva el ID y no induce a crear una segunda propiedad.
- Importación sin proveedor ofrece captura manual. No se exponen mensajes internos del proveedor ni del historial. Análisis de fotos deshabilitado sin clave configurada; cuando existe, la llamada mantiene el control de presupuesto del servidor.
- No hay migraciones ni cambios de permisos. No se activaron servicios comerciales.

## Auditoría de texto

`strings-before.json` y `strings-after.json`: inventario AST de texto JSX y atributos visibles/accesibles, con archivo, línea, clasificación y ubicación bajo disclosure. Es un inventario de candidatos, no un conteo de lo que está visible simultáneamente; strings dinámicos y condiciones se contrastan con las capturas y conteos del navegador.

Criterios aplicados a los grupos de texto:

| Grupo | Decisión |
|---|---|
| Preguntas, nombres de activo, importes, siguiente acción | Permanentes |
| Errores, falta de datos, bloqueantes | Solo cuando se cumple la condición |
| Hipótesis, fuentes, costes, limitaciones | Disclosure; no se elimina contexto crítico |
| Etiquetas de formulario, navegación y nombres accesibles | Conservar, legibles y operables con teclado |
| KPI duplicado, pre-score sin datos, explicación repetida | Eliminar |
| Historial, comparables, escenarios y estrategias | Conservar bajo interacción |

Conteo del texto de `main.innerText` con el mismo estado fixture a 1440×900. Incluye contenido bajo el pliegue; excluye detalles cerrados. No representa una prueba de comprensión humana.

| Vista | Antes | Después | Reducción |
|---|---:|---:|---:|
| Inicio | 162 | 100 | 38% |
| Radar | 155 | 110 | 29% |
| Mercado | 349 | 95 | 73% |
| Flujo | 172 | 139 | 19% |
| Pipeline | 231 | 217 | 6% |
| Cartera | 202 | 133 | 34% |
| Analizar | 180 | 56 | 69% |
| Workspace | 212 | 82 | 61% |

`before/` y `after/`: ocho vistas × cuatro tamaños (1440×900, 1512×982, 1280×800, 390×844), 64 capturas. Ningún overflow global en esta matriz. La comprensión en menos de cinco segundos se revisó como criterio de jerarquía visual; no se realizó un estudio cronometrado con usuarios.

## Verificación del recorrido

| Paso | Evidencia / límite |
|---|---|
| URL o creación manual | Formulario y fallback manual inspeccionados; extracción IA requiere clave y presupuesto |
| Revisar hechos / costes | Tests de todos los mínimos, vacíos, NaN, valores negativos y revisión explícita |
| Calcular / stress | Tests del motor y UI; sin métricas durante EMPTY/INCOMPLETE; diálogo accesible |
| Guardar y reabrir | Test de UI con RPC interceptada y estado persistido dentro del test; **no prueba Supabase real** |
| Guardado parcial de fotos | Operación conserva ID confirmado; fallo de sincronización separado del commit |
| Fotos / comparables / Pipeline / historial | Rutas existentes conservadas; guardado atómico, storage y trigger de historial revisados en código |
| Sesión humana | Navegador Chrome sí tiene sesión válida; cuenta sin inmuebles al inspeccionarla |
| Escrituras autenticadas reales | Pendientes: se solicitó una URL/datos reales al usuario. No se crearon operaciones ni imágenes ficticias para aparentar validación |
| IA en producción | No configurada en la revisión de proveedores de la release anterior; confirmar estado tras desplegar |

Los fixtures nunca salen del navegador de tests. No demuestran RLS ni persistencia real y no se sembró producción. Esta limitación debe acompañar cualquier comunicación sobre el recorrido completo.

## Reproducibilidad

- `npm run build` con Node 24: unit tests, lint, TypeScript y build.
- `npm run test:e2e`: matriz previa de estados/responsive/accesibilidad y tres tests de decisión nuevos.
- `node scripts/audit-visible-text.mjs docs/qa/decision-flow/strings-after.json`.
- Con el build servido en 3188: `node scripts/capture-decision-flow.mjs after`.
- Resultados de Playwright y matriz ampliada: `../product-pass/results.json` y capturas de esa carpeta.
- Para contrastes, esperar al fin de la animación de entrada antes de medir. No se omiten reglas Axe.

## Resultado local

37 tests unitarios PASS, lint PASS, TypeScript PASS y build de producción Node 24 PASS. La matriz Playwright consta de 25 pruebas; el resultado final queda en el JSON enlazado. El nuevo test de importación comprueba que cambiar los datos de una ficha importada invalida las referencias previas en vez de conservar un estado VALIDATED obsoleto.
