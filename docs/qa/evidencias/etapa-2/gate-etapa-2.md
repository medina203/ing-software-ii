# Gate de salida — Etapa 2

**Fecha:** 9 de noviembre de 2026  
**Estado:** Cumplido técnicamente; aprobación y Etapa 3 pospuestas por decisión del usuario el 2026-11-09

## Checklist

| Criterio                                                          | Estado   | Evidencia                                                                                                              |
| ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| El flujo de alquiler ya no carga todos los clientes en un Select  | Cumplido | `ClientSearchSelect` con búsqueda y límite de 8 sugerencias.                                                           |
| Búsqueda de clientes por cédula, nombres y apellidos              | Cumplido | `test-api-e2e.txt` y E2E de búsqueda/selección.                                                                        |
| Resultados con 0, 1 y muchas coincidencias                        | Cumplido | Estado vacío, opción única y límite con total de coincidencias.                                                        |
| Navegación por teclado y etiqueta `documento - nombres apellidos` | Cumplido | `ClientSearchSelect.test.tsx` y E2E.                                                                                   |
| Búsqueda de `ClientsPage` en servidor                             | Cumplido | E2E “busca clientes desde el servidor”.                                                                                |
| Cambio de contraseña para ADMIN y EMPLEADO                        | Cumplido | API con ADMIN temporal + E2E con EMPLEADO temporal.                                                                    |
| Inventario paginado y filtros de servidor                         | Cumplido | `InventoryPage` con `page`/`pageSize=9` y filtros de API.                                                              |
| Inventario sin truncamiento a 200 registros                       | Cumplido | API con 205 implementos temporales y página 2 con `pageSize=100`.                                                      |
| Regresión de login, CRUD de clientes y registro de alquiler       | Cumplido | Smoke E2E, E2E de alta/edición/eliminación de cliente y E2E de creación de alquiler.                                   |
| Build, pruebas, lint, formato y entorno                           | Cumplido | `build.txt`, `test-all.txt`, `test-api-e2e.txt`, `test-ui-e2e.txt`, `lint.txt`, `prettier-check.txt`, `check-env.txt`. |
| Datos temporales eliminados                                       | Cumplido | Verificación `qaItems: 0`, `qaClients: 0`, `qaUsers: 0`.                                                               |

## Hallazgos cerrados o parciales

- **H-05 (endpoint de contraseña sin UI):** cerrado con la vista `/perfil` y el acceso “Mi cuenta”.
- **H-06 (inventario truncado a 200):** primera parte cerrada con paginación y filtros de servidor. La mutación de estado en un `GET` queda para la Etapa 5.

## Observaciones

- No se modificó el modelo de inventario ni el de facturación; esas decisiones se implementan en las etapas 3 y 4.
- No se resetearon datos existentes. Las pruebas E2E crean y eliminan sus propios registros temporales.
- La aprobación de este gate habilita el inicio de la Etapa 3.

## Resultado

La Etapa 2 cumple los criterios técnicos y de regresión definidos. El usuario decidió posponer la aprobación del gate y el inicio de la Etapa 3. El trabajo queda como checkpoint técnico, con la Etapa 3 pendiente para una próxima sesión.
