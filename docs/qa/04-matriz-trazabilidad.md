# Matriz de Trazabilidad — ObraGest

**Versión:** 1.0  
**Fecha:** 9 de noviembre de 2026  
**Etapa:** 1 — Base de calidad y requisitos  
**Estado:** Matriz inicial; se actualiza al cerrar cada etapa.

---

## 1. Reglas de mantenimiento

1. Ningún requisito `RF-*` o `RNF-*` puede quedar sin al menos un caso de prueba planificado.
2. Cada caso de prueba debe tener un identificador único `CP-*`.
3. Al ejecutar una prueba se actualiza su estado: `Planificado`, `Parcial`, `Pasa`, `Falla` o `Bloqueado`.
4. Cada evidencia se guarda en `docs/qa/evidencias/etapa-N/`.
5. Si un requisito cambia, se actualiza esta matriz y el SRS.

## 2. Trazabilidad de requisitos funcionales

| Requisito | Descripción | Implementación / referencia | Caso(s) de prueba | Etapa | Estado |
| --- | --- | --- | --- | :---: | :--- |
| **RF-01** | Autenticación | `backend/src/auth/*`, `frontend/src/pages/LoginPage.tsx` | `CP-AUTH-01`, `CP-AUTH-02` | 1 | Pasa: smoke E2E |
| **RF-02** | Autorización por roles | `backend/src/common/guards/*`, `frontend/src/App.tsx` | `CP-AUTH-03`, `CP-SEC-01` | 5 | Planificado |
| **RF-03** | Gestión de usuarios | `backend/src/users/*`, `frontend/src/pages/UsersPage.tsx` | `CP-USER-01` | 2 | Planificado |
| **RF-04** | Cambio de contraseña | `backend/src/auth/auth.controller.ts`, pendiente UI | `CP-AUTH-04` | 2 | Planificado |
| **RF-05** | Gestión de clientes | `backend/src/clients/*`, `frontend/src/pages/ClientsPage.tsx` | `CP-CLI-01` | 2 | Planificado |
| **RF-06** | Búsqueda de clientes | `backend/src/clients/clients.service.ts`, `frontend/src/pages/NewRentalPage.tsx` | `CP-CLI-02`, `CP-CLI-03` | 2 | Planificado |
| **RF-07** | Gestión de categorías | `backend/src/categories/*`, `frontend/src/pages/InventoryPage.tsx` | `CP-INV-01` | 3 | Planificado |
| **RF-08** | Prefijo de categoría | `backend/prisma/schema.prisma`, pendiente | `CP-INV-02` | 3 | Planificado |
| **RF-09** | Gestión de inventario | `backend/src/items/*`, `frontend/src/pages/InventoryPage.tsx` | `CP-INV-03` | 2 | Planificado |
| **RF-10** | Serial automático | `backend/src/items/items.service.ts`, pendiente | `CP-INV-04`, `CP-INV-05` | 3 | Planificado |
| **RF-11** | Disponibilidad e integridad | `backend/src/rentals/rentals.service.ts` | `CP-RENT-01`, `CP-RENT-02` | 1 y 3 | Parcial: smoke manual |
| **RF-12** | Registro de alquiler | `backend/src/rentals/*`, `frontend/src/pages/NewRentalPage.tsx` | `CP-RENT-01`, `CP-RENT-03` | 1 y 2 | Planificado |
| **RF-13** | Selector de cantidad | `frontend/src/pages/NewRentalPage.tsx`, pendiente | `CP-RENT-04`, `CP-RENT-05` | 3 | Planificado |
| **RF-14** | Registro de devolución | `backend/src/returns/*`, `frontend/src/pages/NewReturnPage.tsx` | `CP-RET-01` | 4 | Planificado |
| **RF-15** | Alerta de factura pendiente en devolución | Pendiente: modelo de facturación | `CP-BILL-01` | 4 | Planificado |
| **RF-16** | Autorización de nuevo alquiler con factura pendiente | Pendiente: política y modelo | `CP-BILL-02`, `CP-BILL-03` | 4 | Planificado |
| **RF-17** | Gestión de facturas y pagos | Pendiente | `CP-BILL-04` | 4 | Planificado |
| **RF-18** | Reportes y dashboard | `backend/src/reports/*`, `frontend/src/pages/DashboardPage.tsx` | `CP-REP-01` | 6 | Planificado |
| **RF-19** | Ingresos diarios y mensuales | `backend/src/reports/reports.service.ts`, `frontend/src/pages/ReportsPage.tsx` | `CP-REP-02` | 6 | Planificado |
| **RF-20** | Paginación y filtros | `frontend/src/pages/InventoryPage.tsx`, `backend/src/items/items.service.ts` | `CP-PAG-01`, `CP-PAG-02` | 2 y 5 | Planificado |
| **RF-21** | Auditoría de excepciones | Pendiente | `CP-BILL-05` | 4 | Planificado |

## 3. Trazabilidad de requisitos no funcionales

| Requisito | Descripción | Implementación / referencia | Caso(s) de prueba | Etapa | Estado |
| --- | --- | --- | --- | :---: | :--- |
| **RNF-01** | Seguridad de autenticación | `backend/src/auth/*` | `CP-SEC-01`, `CP-SEC-02` | 5 | Planificado |
| **RNF-02** | Control de acceso | `backend/src/common/guards/*` | `CP-SEC-03` | 5 | Planificado |
| **RNF-03** | Integridad transaccional | `backend/src/rentals/rentals.service.ts`, `returns.service.ts` | `CP-RENT-06` | 3 | Planificado |
| **RNF-04** | Rendimiento y escalabilidad | `backend/src/items/items.service.ts`, frontend | `CP-PAG-03`, `CP-REN-01` | 2 y 6 | Planificado |
| **RNF-05** | Usabilidad | `frontend/src/pages/*` | `CP-USA-01` | 6 | Planificado |
| **RNF-06** | Portabilidad e instalación | `.env.example`, README | `CP-INS-01` | 1 | Pasa: `check:env` |
| **RNF-07** | Facilidad de prueba | `package.json`, configuración de test | `CP-TEST-01` | 1 | Pasa: harness y smoke tests |
| **RNF-08** | Disponibilidad y recuperación | `backend/src/app.controller.ts`, `frontend/src/main.tsx` | `CP-REC-01` | 5 | Planificado |
| **RNF-09** | Compatibilidad | `frontend/src/*` | `CP-COM-01` | 6 | Planificado |
| **RNF-10** | Trazabilidad | `docs/qa/04-matriz-trazabilidad.md` | `CP-DOC-01` | 1 y 6 | Parcial: matriz inicial |
| **RNF-11** | Accesibilidad | `frontend/src/components/ui/*` | `CP-USA-02` | 6 | Planificado |
| **RNF-12** | Gestión de secretos | `.env.example`, `.gitignore` | `CP-INS-02` | 1 | Implementado |

## 4. Trazabilidad de hallazgos de auditoría

| Hallazgo | Descripción | Etapa de cierre | Evidencia esperada |
| --- | --- | --- | --- |
| **H-01** | Sin pruebas automatizadas ni artefactos | 1 a 6 | Suite Jest/Vitest/Playwright y reportes. |
| **H-02** | Sin SRS, Gherkin ni trazabilidad | 1 a 6 | `01-requisitos...`, `04-matriz...` actualizados. |
| **H-03** | Faltan `.env.example` | 1 | Archivos verificados en raíz, backend y frontend. |
| **H-04** | Login sin rate limiting | 5 | `CP-SEC-02` con `429`. |
| **H-05** | Endpoint de contraseña sin UI | 2 | `CP-AUTH-04` E2E. |
| **H-06** | Inventario truncado a 200 y `GET` que muta BD | 2 y 5 | `CP-PAG-01` y `CP-REC-02`. |
| **H-07** | Health check falso y sin ErrorBoundary | 5 | `CP-REC-01` y prueba de UI. |
| **H-08** | Sin Git/linter y selectores duplicados | 1 y 5 | Repositorio Git, ESLint y centralización. |

## 5. Casos de prueba planificados

| ID | Requisito | Nivel / tipo | Descripción breve | Etapa |
| --- | --- | --- | --- | :---: |
| `CP-AUTH-01` | RF-01 | E2E / sistema | Login de ADMIN y acceso al resumen operativo. | 1 |
| `CP-AUTH-02` | RF-01 | API / integración | Login con credenciales inválidas devuelve error. | 2 |
| `CP-AUTH-03` | RF-02 | API / seguridad | EMPLEADO recibe `403` en ruta de ADMIN. | 5 |
| `CP-AUTH-04` | RF-04 | E2E / sistema | Cambio de contraseña desde la UI. | 2 |
| `CP-USER-01` | RF-03 | API / integración | CRUD de usuarios y protección del último ADMIN. | 2 |
| `CP-CLI-01` | RF-05 | API / integración | CRUD de clientes y bloqueo de eliminación con alquileres. | 2 |
| `CP-CLI-02` | RF-06 | E2E / sistema | Búsqueda de cliente por cédula en nuevo alquiler. | 2 |
| `CP-CLI-03` | RF-06 | E2E / sistema | Búsqueda de cliente por nombre en nuevo alquiler. | 2 |
| `CP-INV-01` | RF-07 | API / integración | CRUD de categorías y bloqueo de eliminación con implementos. | 3 |
| `CP-INV-02` | RF-08 | API / integración | Prefijo único por categoría. | 3 |
| `CP-INV-03` | RF-09 | API / integración | CRUD de implementos y bloqueo de eliminación con historial. | 2 |
| `CP-INV-04` | RF-10 | Unitario / integración | Generación de serial con prefijo y consecutivo. | 3 |
| `CP-INV-05` | RF-10 | Integración / concurrencia | Dos creaciones simultáneas no duplican serial. | 3 |
| `CP-RENT-01` | RF-11 / RF-12 | API / integración | Alquiler exitoso y bloqueo de implemento. | 1 y 3 |
| `CP-RENT-02` | RF-11 | API / integración | Alquiler de implemento no disponible devuelve `409`. | 3 |
| `CP-RENT-03` | RF-12 | E2E / sistema | Registro de alquiler desde la UI. | 2 |
| `CP-RENT-04` | RF-13 | E2E / sistema | Alquiler de 5 unidades del mismo tipo. | 3 |
| `CP-RENT-05` | RF-13 | API / integración | Cantidad mayor a la disponibilidad es rechazada. | 3 |
| `CP-RENT-06` | RNF-03 | Integración / concurrencia | Fallo a mitad de transacción no deja estados parciales. | 3 |
| `CP-RET-01` | RF-14 | API / integración | Devolución completa y actualización de estados. | 4 |
| `CP-BILL-01` | RF-15 | E2E / sistema | Devolución con factura pendiente muestra alerta y permite continuar. | 4 |
| `CP-BILL-02` | RF-16 | E2E / seguridad | EMPLEADO requiere autorización de ADMIN. | 4 |
| `CP-BILL-03` | RF-16 | E2E / sistema | ADMIN autoriza con motivo y queda auditoría. | 4 |
| `CP-BILL-04` | RF-17 | API / integración | Registro de pago actualiza saldo pendiente. | 4 |
| `CP-BILL-05` | RF-21 | API / integración | Auditoría de excepción con usuario, fecha y motivo. | 4 |
| `CP-REP-01` | RF-18 | API / integración | Dashboard y reportes solo para ADMIN. | 6 |
| `CP-REP-02` | RF-19 | API / integración | Ingresos diarios y mensuales con datos conocidos. | 6 |
| `CP-PAG-01` | RF-20 | E2E / sistema | Inventario con más de 200 registros navega por páginas. | 2 |
| `CP-PAG-02` | RF-20 | API / integración | Filtros de inventario en servidor. | 2 |
| `CP-PAG-03` | RNF-04 | Rendimiento / volumen | Listado paginado responde en menos de 2 s. | 6 |
| `CP-SEC-01` | RNF-01 | API / seguridad | Sexto intento fallido de login devuelve `429`. | 5 |
| `CP-SEC-02` | RNF-01 | API / seguridad | Contraseña incorrecta no crea sesión. | 5 |
| `CP-SEC-03` | RNF-02 | API / seguridad | Rutas protegidas sin token devuelven `401`. | 5 |
| `CP-REC-01` | RNF-08 | Recuperación | PostgreSQL caído hace que `/health` devuelva `503`. | 5 |
| `CP-REC-02` | H-06 | Integración | `GET` de alquileres no modifica la base de datos. | 5 |
| `CP-INS-01` | RNF-06 | Instalación | Instalación limpia con `.env.example`. | 1 |
| `CP-INS-02` | RNF-12 | Revisión | `.env` no se versiona y `.env.example` sí. | 1 |
| `CP-TEST-01` | RNF-07 | Revisión | `npm test` y `npm run test:e2e` existen y ejecutan. | 1 |
| `CP-USA-01` | RNF-05 | Usabilidad | Búsqueda de clientes con teclado y resultados claros. | 6 |
| `CP-USA-02` | RNF-11 | Accesibilidad | Etiquetas, foco visible y contraste. | 6 |
| `CP-COM-01` | RNF-09 | Compatibilidad | Chrome, Edge y Firefox en escritorio y móvil. | 6 |
| `CP-DOC-01` | RNF-10 | Revisión | Todos los requisitos tienen caso y evidencia. | 1 y 6 |

## 6. Estado de la línea base

| Elemento | Estado al 2026-11-09 |
| --- | --- |
| SRS y Gherkin | Creado en Etapa 1. |
| Matriz de trazabilidad | Creada en Etapa 1; pendiente de completar con resultados. |
| Pruebas backend | Configuradas y ejecutadas: 5 pruebas aprobadas. |
| Pruebas frontend | Configuradas y ejecutadas: 4 pruebas aprobadas. |
| Pruebas E2E | Configuradas y ejecutadas: 2 pruebas Playwright + 1 integración de API. |
| `.env.example` | Verificados en raíz, backend y frontend con `npm run check:env`. |
| Git | Repositorio inicializado con commit inicial de la Etapa 1. |
| Linter | Configurado y ejecutado sin errores. |

## 7. Control de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0 | 2026-11-09 | Creación inicial de la matriz. |
