# Evaluación de calidad del producto — ISO/IEC 25010 y McCall

**Sistema:** ObraGest / DM alquiler — inventario y alquiler de implementos de construcción  
**Versión evaluada:** commit `038ca9a` (rama `main`, 17-nov-2026) y correcciones en la rama `calidad/evaluacion-iso25010`  
**Fecha:** 17 de noviembre de 2026  
**Método:** verificación estática (revisión de código, esquema y documentación) y validación dinámica (build, pruebas automatizadas, pruebas manuales de API, recuperación y seguridad), según la Sesión 6 del curso.  
**Evidencia:** `docs/qa/evidencias/etapa-4-5/`

---

## 1. Resumen ejecutivo

**Veredicto sobre la versión recibida: no cumple.** El último commit (`038ca9a`, mensaje `.`) incorporó la facturación de la Etapa 4 a medio terminar y dejó el sistema sin poder desplegarse:

- El **frontend no compila**: `NewRentalPage.tsx` tiene JSX roto, variables sin declarar y ya no tiene botón para confirmar el alquiler. El flujo principal del negocio (registrar un alquiler) no se podía usar.
- La pantalla además **revirtió el selector de cantidad de la Etapa 3** (RF-13) y enviaba un campo `cantidad` que la API rechaza con `400`.
- La **suite automatizada estaba en rojo**: 47 de 64 pruebas aprobadas (73 %). Las 12 pruebas de interfaz no podían ejecutarse y la limpieza de las pruebas de API fallaba y dejaba datos basura.
- Había **errores de cálculo en la facturación**: la factura no se ajustaba al devolver tarde, el reporte de ingresos contaba un día más que la factura, y "hoy" se calculaba en UTC, así que desde las 7:00 p. m. (hora Colombia) se rechazaba la fecha de hoy y los alquileres quedaban vencidos un día antes.
- **Seguridad:** el login no tenía límite de intentos (H-04), y la Etapa 4 abrió un vector nuevo: cualquier EMPLEADO podía probar contraseñas del ADMIN sin límite desde `POST /rentals`.

**Veredicto tras las correcciones: cumple** las características evaluadas, con los riesgos residuales de la sección 8. Resultado: **122 de 122 pruebas aprobadas**, build y lint limpios, y los criterios de salida de las Etapas 4 y 5 del plan cumplidos.

| Indicador                                     | Antes (`038ca9a`)       | Después                 |
| --------------------------------------------- | ----------------------- | ----------------------- |
| Build backend / frontend                      | Pasa / **Falla**        | Pasa / Pasa             |
| Lint                                          | **Falla**               | Pasa                    |
| Pruebas automatizadas aprobadas               | 47/64 (73 %)            | 122/122 (100 %)         |
| Defectos críticos o altos abiertos            | 7                       | 0                       |
| Hallazgos de auditoría abiertos (H-04 a H-08) | 4                       | 0                       |
| JavaScript inicial del frontend               | 500,95 kB (gzip 148 kB) | 381,24 kB (gzip 123 kB) |
| Login: 6.º intento fallido                    | 401 (sin bloqueo)       | 429                     |
| `/api/health` con PostgreSQL detenido         | 200 "ok" (falso)        | 503                     |
| Escrituras en BD desde peticiones `GET`       | 10 endpoints            | 0                       |

---

## 2. Modelos y criterio de evaluación

Se usan los modelos del curso (Sesiones 1, 3 y 6):

- **ISO/IEC 25010 (calidad del producto):** las 8 características vistas en clase (adecuación funcional, eficiencia de desempeño, compatibilidad, usabilidad, fiabilidad, seguridad, mantenibilidad y portabilidad), evaluadas con la jerarquía característica → subcaracterística → métrica.
- **Modelo de McCall (1977):** 11 factores en operación, revisión y transición, como contraste.
- **Escala de cumplimiento por característica:**
  - **Cumple:** todas las métricas alcanzan el criterio del SRS (`01-requisitos-y-criterios-gherkin.md`) y no hay defectos críticos o altos abiertos.
  - **Cumple parcialmente:** alguna métrica no alcanza el criterio, pero sin defectos críticos.
  - **No cumple:** hay al menos un defecto crítico o alto abierto, o el criterio no se puede verificar porque el sistema no se puede construir.
- **Severidad de defectos:** Crítica (impide usar o desplegar el sistema), Alta (resultado incorrecto o riesgo de seguridad explotable), Media (incumple un requisito no funcional o la arquitectura acordada), Baja (calidad interna o cosmética).

---

## 3. Verificación del estado recibido

Detalle completo en `evidencias/etapa-4-5/estado-inicial-038ca9a.txt`.

| Verificación                     | Resultado                                                             |
| -------------------------------- | --------------------------------------------------------------------- |
| Migraciones y seed en BD limpia  | Pasa                                                                  |
| `npm run build` (backend)        | Pasa                                                                  |
| `npm run build` (frontend)       | **Falla:** 5 errores TypeScript en `NewRentalPage.tsx`                |
| `npm run lint`                   | **Falla:** error de parseo en `NewRentalPage.tsx`                     |
| Unitarias backend (Jest)         | **25/28:** `clients.service.spec` falla porque un `GET` ahora escribe |
| Unitarias frontend (Vitest)      | 12/12                                                                 |
| API e2e (Jest + Supertest)       | **10/12:** 403 en lugar de 409; la limpieza viola una llave foránea   |
| UI e2e (Playwright)              | **No ejecutable:** el frontend no compila                             |
| Login con 8 contraseñas erróneas | **8 × 401**, sin bloqueo                                              |
| `/api/health`                    | Responde "ok" sin consultar la base de datos                          |

---

## 4. Defectos encontrados y corrección

| ID   | Severidad | Característica ISO 25010                           | Defecto                                                                                                                                                                                                                            | Corrección                                                                                                                                                                                                                |
| ---- | :-------: | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 |  Crítica  | Adecuación funcional, portabilidad                 | `NewRentalPage.tsx` no compila: JSX roto, `SectionCard` sin importar, variables inexistentes y sin botón de envío. El frontend no se puede construir ni desplegar.                                                                 | Pantalla reconstruida sobre la versión estable de la Etapa 3, agregando la cartera de la Etapa 4.                                                                                                                         |
| D-02 |   Alta    | Adecuación funcional (corrección)                  | Regresión de RF-13: se eliminó la selección por cantidad; el cuerpo enviaba `cantidad: 1`, que la API rechaza (400). El subtotal solo sumaba los implementos visibles por el filtro.                                               | Selector de cantidad restaurado. El cuerpo se arma en `lib/cartera.ts` (`buildRentalPayload`) con solo los campos admitidos, con pruebas unitarias.                                                                       |
| D-03 |   Alta    | Mantenibilidad (capacidad de prueba)               | Suite en rojo: 3 unitarias y 2 e2e fallaban; la limpieza de pruebas violaba `facturas_alquiler_id_fkey` y dejaba datos `QA-ST3-*` en la BD.                                                                                        | Pruebas adaptadas a la regla RF-16. Utilidad `deleteRentalsCascade` para API y UI. Cero datos residuales tras la suite completa.                                                                                          |
| D-04 |   Alta    | Adecuación funcional (corrección)                  | La factura se emitía por los días pactados y no se ajustaba en la devolución: una devolución tardía no cobraba los días adicionales.                                                                                               | `settleInvoiceOnReturn`: al devolver, el total se recalcula con los días reales y el saldo descuenta lo ya pagado. Prueba unitaria y e2e (6 días reales: total 60.000, saldo 30.000, VENCIDA).                            |
| D-05 |   Media   | Adecuación funcional (corrección)                  | Regla de días inconsistente: factura e interfaz usan "diferencia de días, mínimo 1"; el reporte de ingresos contaba el día final (un día más por alquiler).                                                                        | El reporte usa `rentalDays`, la misma función que la factura.                                                                                                                                                             |
| D-06 |   Alta    | Adecuación funcional, portabilidad (adaptabilidad) | "Hoy" se calculaba en UTC. En Colombia (UTC-5), desde las 7:00 p. m. se rechazaba la fecha de hoy, los alquileres se marcaban vencidos un día antes, se cobraban días de más y los códigos `ALQ`/`FAC` tomaban la fecha siguiente. | Fechas de negocio en `APP_TIMEZONE` (por defecto `America/Bogota`) en `dates.ts`. Pruebas con reloj simulado a las 8:00 p. m.                                                                                             |
| D-07 |   Alta    | Seguridad (autenticidad)                           | Sin límite de intentos en login (H-04). Además, `POST /rentals` validaba la contraseña del ADMIN sin límite: un EMPLEADO podía averiguarla por fuerza bruta.                                                                       | `LoginAttemptsService`: 5 fallos en 15 minutos bloquean 15 minutos con `429`, en el login y en la validación de credenciales del ADMIN.                                                                                   |
| D-08 |   Media   | Eficiencia, fiabilidad                             | `GET` que escriben en la BD (H-06). La Etapa 4 extendió el patrón: 10 endpoints de lectura ejecutaban `UPDATE`.                                                                                                                    | Las lecturas calculan el estado efectivo (`effectiveRentalStatus`, `nextInvoiceStatus`) y filtran con `rentalStatusWhere`/`invoiceStatusWhere`. `StatusSyncService` sincroniza la BD al iniciar y cada 15 minutos.        |
| D-09 |   Media   | Fiabilidad (disponibilidad)                        | `/api/health` respondía "ok" aunque PostgreSQL estuviera caído (H-07).                                                                                                                                                             | Health check con `SELECT 1`; responde `503` si la BD no está disponible.                                                                                                                                                  |
| D-10 |   Media   | Fiabilidad (tolerancia a fallos)                   | Sin `ErrorBoundary`: un error de render dejaba la aplicación en blanco (H-07).                                                                                                                                                     | `ErrorBoundary` global y por ruta, que se reinicia al navegar.                                                                                                                                                            |
| D-11 |   Media   | Adecuación funcional (completitud), usabilidad     | RF-15 incompleto: la alerta de cartera se guardaba pero no se mostraba al registrar la devolución. El detalle del alquiler no mostraba su factura.                                                                                 | Alerta informativa en la devolución y tarjeta "Facturación" en el detalle del alquiler.                                                                                                                                   |
| D-12 |   Baja    | Mantenibilidad (reusabilidad)                      | Selectores `userSummary`, `clientSummary` e `itemSummary` duplicados en 4 servicios, con campos distintos (H-08).                                                                                                                  | `common/prisma-selects.ts`.                                                                                                                                                                                               |
| D-13 |   Baja    | Eficiencia (utilización de recursos)               | Bundle inicial de 500,95 kB (advertencia de Vite).                                                                                                                                                                                 | Carga diferida por ruta (`React.lazy`): 381,24 kB (−24 %).                                                                                                                                                                |
| D-14 |   Baja    | Usabilidad (estética), portabilidad                | Marca escrita "DM alquiuler" en 5 lugares. El seed no creaba facturas, así que la Etapa 4 no se podía demostrar.                                                                                                                   | Texto corregido. El seed crea facturas pendiente, vencida y pagada de forma idempotente.                                                                                                                                  |
| D-15 |   Baja    | Adecuación funcional (corrección)                  | `parseDateOnly('2026-02-30')` se convertía en silencio en 2 de marzo.                                                                                                                                                              | Se rechazan las fechas inexistentes, con prueba unitaria.                                                                                                                                                                 |
| D-16 |   Media   | Usabilidad (estética, operabilidad), eficiencia    | El inventario mostraba una tarjeta por unidad: un tipo con 10 andamios ocupaba 10 tarjetas con la misma información, y el stock no se veía en ningún lugar. Observado por el usuario en la revisión del PR.                        | Una tarjeta por tipo (categoría + nombre) con stock por estado; los seriales se gestionan en "Ver unidades". Nuevos endpoints `/items/groups` y `/items/group`. Ver `evidencias/etapa-4-5/mejora-inventario-agrupado.md`. |

---

## 5. Evaluación por característica (ISO/IEC 25010)

| Característica           | Subcaracterística y métrica                                                                                  | Antes                 | Después                                                  | Nivel antes | Nivel después |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------- | :---------: | :-----------: |
| **Adecuación funcional** | Completitud: RF de la Etapa 4 (RF-15, 16, 17, 21) verificados                                                | 0/4                   | 4/4                                                      |  No cumple  |    Cumple     |
|                          | Corrección: defectos de cálculo conocidos (D-04, D-05, D-06, D-15)                                           | 4                     | 0                                                        |             |               |
|                          | Pertinencia: flujo "registrar alquiler" usable en la interfaz                                                | No (no compila)       | Sí (E2E)                                                 |             |               |
| **Eficiencia**           | Comportamiento temporal: los `GET` no ejecutan `UPDATE`                                                      | 10 endpoints escriben | 0                                                        |   Parcial   |    Cumple     |
|                          | Utilización de recursos: JS inicial                                                                          | 500,95 kB             | 381,24 kB                                                |             |               |
| **Compatibilidad**       | Coexistencia/interoperabilidad: API REST con JSON y Prisma sobre PostgreSQL 16                               | Sin cambios           | Sin cambios                                              |   Parcial   |    Parcial    |
|                          | Navegadores verificados (RNF-09: Chrome, Edge, Firefox, móvil)                                               | Ninguno               | Chrome (15 E2E)                                          |             |               |
| **Usabilidad**           | Mensajes en español y errores en contexto (credenciales del ADMIN dentro del modal)                          | —                     | Verificado por E2E                                       |  No cumple  |    Cumple     |
|                          | Prevención de errores: alerta de cartera antes de confirmar, total estimado del período, botón según el caso | Ausente               | Presente                                                 |             |               |
|                          | Accesibilidad: `role="alert"`, `aria-live` y etiquetas en los nuevos controles                               | —                     | Presente                                                 |             |               |
| **Fiabilidad**           | Madurez: pruebas automatizadas aprobadas                                                                     | 73 %                  | 100 % (122)                                              |  No cumple  |    Cumple     |
|                          | Disponibilidad: el health check detecta la caída de la BD                                                    | No                    | Sí (503 → 200)                                           |             |               |
|                          | Tolerancia a fallos: error de render controlado                                                              | No                    | Sí (`ErrorBoundary`)                                     |             |               |
|                          | Recuperabilidad: transacciones `Serializable` sin estados parciales                                          | Sí                    | Sí (incluye la liquidación)                              |             |               |
| **Seguridad**            | Autenticidad: bloqueo tras 5 intentos (RNF-01)                                                               | No                    | Sí (429)                                                 |  No cumple  |    Cumple     |
|                          | Integridad: no se puede saltar la autorización de cartera                                                    | Sí en API             | Sí (403/401/429 verificados)                             |             |               |
|                          | No repudio / responsabilidad: auditoría de excepciones (RF-21)                                               | Modelo sin verificar  | Verificado (quién, quién autorizó, saldo, motivo, fecha) |             |               |
| **Mantenibilidad**       | Modularidad y reusabilidad: selectores centralizados, reglas de fecha y facturación en un único módulo       | Duplicados            | Centralizados                                            |  No cumple  |    Cumple     |
|                          | Capacidad de prueba: suites en verde y sin datos residuales                                                  | En rojo, con residuos | En verde, sin residuos                                   |             |               |
|                          | Analizabilidad: lint y formato                                                                               | Lint falla            | Lint y Prettier pasan                                    |             |               |
| **Portabilidad**         | Instalabilidad: build reproducible y seed con datos demostrables                                             | Build falla           | Pasa; seed idempotente                                   |  No cumple  |    Cumple     |
|                          | Adaptabilidad: zona horaria configurable (`APP_TIMEZONE`), intervalos y umbrales por variable de entorno     | UTC fijo              | Configurable                                             |             |               |

---

## 6. Contraste con el modelo de McCall

| Grupo      | Factor                     | Antes     | Después | Sustento                                                               |
| ---------- | -------------------------- | --------- | ------- | ---------------------------------------------------------------------- |
| Operación  | Corrección                 | No cumple | Cumple  | D-01, D-02, D-04 a D-06 corregidos                                     |
|            | Confiabilidad              | Parcial   | Cumple  | Health check real, `ErrorBoundary`, suites en verde                    |
|            | Eficiencia                 | Parcial   | Cumple  | `GET` sin escrituras; bundle −24 %                                     |
|            | Integridad                 | No cumple | Cumple  | Bloqueo de fuerza bruta en login y en credenciales del ADMIN           |
|            | Facilidad de uso           | No cumple | Cumple  | Flujo de alquiler operativo, alertas y mensajes claros                 |
| Revisión   | Facilidad de mantenimiento | Parcial   | Cumple  | Reglas centralizadas en `billing.ts`, `dates.ts` y `prisma-selects.ts` |
|            | Flexibilidad               | Parcial   | Cumple  | Parámetros por variable de entorno                                     |
|            | Facilidad de prueba        | No cumple | Cumple  | 122 pruebas y utilidades de limpieza                                   |
| Transición | Portabilidad               | No cumple | Cumple  | Build reproducible; zona horaria configurable                          |
|            | Reusabilidad               | Parcial   | Cumple  | Funciones puras reutilizadas por la factura, el reporte y la UI        |
|            | Interoperabilidad          | Cumple    | Cumple  | API REST documentada en el README                                      |

---

## 7. Pruebas ejecutadas

| Nivel / tipo (Clase de pruebas) | Herramienta          | Alcance nuevo o ajustado                                                                                      | Resultado |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- | :-------: |
| Unitarias (backend)             | Jest                 | `dates`, `billing`, `rental-status`, `login-attempts`, health check, clientes sin escrituras                  |   63/63   |
| Unitarias (frontend)            | Vitest + RTL         | `lib/cartera`, `ErrorBoundary`                                                                                |   18/18   |
| Integración / API               | Jest + Supertest     | `stage4-5.e2e-spec.ts`: factura, autorización, auditoría, devolución tardía, pagos, `GET` sin escrituras, 429 |   25/25   |
| Sistema / E2E                   | Playwright (Chrome)  | `stage4.spec.ts`: alerta, modal con credenciales inválidas y válidas, devolución con alerta                   |   16/16   |
| Regresión                       | Todas las anteriores | Suites de las Etapas 2 y 3 sin regresiones                                                                    |   Pasa    |
| Seguridad                       | curl                 | 5 × 401 y 429 desde el sexto intento                                                                          |   Pasa    |
| Recuperación                    | curl + PostgreSQL    | 200 → 503 (BD detenida) → 200                                                                                 |   Pasa    |
| Humo / instalación              | npm                  | BD limpia → migraciones → seed (2 ejecuciones, idempotente) → build                                           |   Pasa    |

Comandos: `npm run build`, `npm run lint`, `npm test`, `npm run test:e2e --workspace backend`, `npm run test:e2e`.

---

## 8. Riesgos residuales y recomendaciones (Etapa 6)

1. **Regla de negocio por confirmar.** Según el SRS, "factura pendiente" es cualquier factura con saldo mayor que cero, incluidas las que aún no vencen. Por eso todo cliente con un alquiler en curso sin pagar necesita autorización para un segundo alquiler. Si el negocio solo quiere bloquear con facturas **vencidas**, basta con cambiar `requiresCarteraAuthorization` y `getPendingInvoices`.
2. **Saldo a favor.** Si el cliente pagó por adelantado y devuelve antes, el saldo queda en 0, pero el excedente (devolución de dinero) no se modela.
3. **Alquileres anteriores a la migración de la Etapa 4** no tienen factura. Antes de pasar a producción hay que decidir si se migran como pagados o pendientes.
4. **Token JWT en `localStorage`**: queda expuesto ante un XSS. Se recomienda una cookie `HttpOnly` con `SameSite`.
5. **El bloqueo de intentos vive en memoria**: con varias instancias de la API debe moverse a Redis o a la base de datos. El bloqueo por correo puede usarse para negar el acceso a una cuenta (compromiso habitual de este control).
6. **Cobertura unitaria del backend: 19 % de sentencias.** Los servicios se cubren sobre todo con pruebas de API. Se recomienda medir también la cobertura e2e y fijar un umbral mínimo en CI.
7. **Sin integración continua.** Falta el pipeline previsto en la Etapa 6: build, lint y las 4 suites en cada push.
8. **Compatibilidad (RNF-09):** faltan Edge, Firefox y la vista móvil de 375 × 812.
9. **El inicio de mes del dashboard** ("devoluciones este mes") todavía se calcula en UTC: un desfase de 5 horas el primer día del mes.
10. **Prisma 7** deja obsoleto `package.json#prisma`; conviene migrar a `prisma.config.ts`.

---

## 9. Archivos principales modificados

- Backend: `common/utils/{dates,billing,rental-status}.ts`, `common/prisma-selects.ts`, `common/status-sync/*`, `auth/login-attempts.service.ts`, `auth/auth.service.ts`, `app.controller.ts`, `rentals`, `returns`, `invoices`, `clients` y `reports` services, `prisma/seed.ts`, `.env.example`.
- Frontend: `pages/NewRentalPage.tsx`, `pages/NewReturnPage.tsx`, `pages/RentalDetailPage.tsx`, `components/ErrorBoundary.tsx`, `lib/cartera.ts`, `App.tsx` (carga diferida), `main.tsx`, `components/Layout.tsx`.
- Pruebas: 6 archivos unitarios nuevos o ampliados, `backend/test/stage4-5.e2e-spec.ts`, `e2e/stage4.spec.ts` y utilidades `helpers/cleanup.ts`.
- Documentación: este informe, el SRS, la matriz de trazabilidad (v1.4), el plan por etapas, el README y las evidencias de `etapa-4-5/`.

---

## 10. Etapa 6 — Usabilidad, personalización e imágenes (17-nov-2026)

Mejoras solicitadas por el usuario durante la revisión del PR #1. Evidencia en `evidencias/etapa-4-5/mejora-inventario-agrupado.md` y `evidencias/etapa-6/`.

| Característica ISO/IEC 25010           | Mejora                                                                                                                                       | Verificación                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Usabilidad — protección contra errores | Identificación por tipo y solo dígitos (CC/CE/TI 6-10, NIT 9 + DV), teléfono 7-10 dígitos, tarifa, cantidades y pagos sin letras.            | Unitarias (`NumericInput`, `document`), API y E2E |
| Usabilidad — estética de la interfaz   | Una tarjeta por tipo con stock; ilustraciones por tipo; login dividido con imagen difuminada; panel con carrusel e indicadores animados.     | E2E y capturas                                    |
| Usabilidad — operabilidad              | "Ver factura" desde cartera lleva al detalle del alquiler y resalta la factura con sus pagos; indicadores del panel clicables.               | E2E `stage6.spec.ts`                              |
| Usabilidad — accesibilidad             | Carrusel con pausa, teclado, roles ARIA y respeto de "reducir movimiento"; modo oscuro con contraste ajustado; tamaño de letra configurable. | E2E y revisión                                    |
| Seguridad — integridad                 | Subida de imágenes validada por firma (JPG/PNG/WEBP), máx. 5 MB, nombres aleatorios, sin recorrido de rutas; solo ADMIN modifica.            | Unitarias, API (SVG falso → 400), manual (404)    |
| Portabilidad — adaptabilidad           | Tema, color y tamaño de letra configurables sin tocar código; `UPLOADS_DIR` configurable.                                                    | API y E2E                                         |
| Eficiencia — utilización de recursos   | Las fotos se reducen en el navegador (máx. 1280 px, WEBP) antes de subirlas; carga diferida de la página de apariencia.                      | Revisión                                          |

**Regresión:** 150/150 pruebas (68 + 29 unitarias, 32 de API, 21 de interfaz). Lint, formato y build sin errores.

**Riesgos y pendientes de esta etapa:**

- Las imágenes se guardan en disco (`UPLOADS_DIR`). En producción esa carpeta debe estar en un volumen persistente con copia de seguridad, o migrarse a un almacenamiento de objetos.
- Los clientes existentes con documentos sin el formato nuevo (por ejemplo, de pruebas antiguas) deben corregirse al editarlos; la API rechaza guardar un documento inválido.
- El pasaporte (con letras) no está admitido como tipo de documento; si el negocio lo necesita, hay que agregarlo como excepción.
