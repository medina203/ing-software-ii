# Gate de salida — Etapa 3

**Fecha:** 15 de noviembre de 2026  
**Estado:** Aprobado; Etapa 3 cerrada  
**Alcance:** prefijo único por categoría, serial automático y selector de cantidad con unidades serializadas.

## Checklist

| Criterio                                            | Estado   | Evidencia                                                                                                                                       |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefijo único por categoría y validación de formato | Cumplido | `test-api-e2e.txt`: creación, duplicado `409` y formato inválido `400`.                                                                         |
| Serial `PREFIJO-###` generado en backend            | Cumplido | `test-api-e2e.txt`: seriales `QA…-001` y `QA…-002`; unitarias en `test-all.txt`.                                                                |
| Serial de solo lectura en la UI                     | Cumplido | `test-ui-e2e.txt`: creación desde formulario y verificación del serial generado.                                                                |
| Rechazo de serial enviado manualmente               | Cumplido | `test-api-e2e.txt`: `POST /items` con `codigoSerie` devuelve `400`.                                                                             |
| Concurrencia sin seriales duplicados                | Cumplido | `test-api-e2e.txt`: 6 creaciones simultáneas generan 6 seriales únicos.                                                                         |
| Cambio de prefijo bloqueado con implementos         | Cumplido | `test-api-e2e.txt`: `PATCH /categories/:id` devuelve `409` y conserva el prefijo.                                                               |
| Seriales existentes conservados                     | Cumplido | `db-cleanup.txt`: se mantienen los seriales anteriores y los contadores `HERR=3`, `MAQ=3`, `AND=2`, `MED=2`, `SEG=2`.                           |
| Cantidad N con unidades serializadas                | Cumplido | `test-api-e2e.txt` y `test-ui-e2e.txt`: alquiler de 5 andamios con 5 seriales distintos.                                                        |
| Validación de disponibilidad y no duplicación       | Cumplido | `test-ui-e2e.txt`: unidad no disponible y cantidad superior a la disponibilidad.                                                                |
| Rollback sin estados parciales                      | Cumplido | `test-api-e2e.txt`: solicitud con 3 disponibles y 2 en mantenimiento devuelve `409`; las 3 unidades siguen `DISPONIBLE` y no se crean detalles. |
| Regresión de login, clientes, inventario y alquiler | Cumplido | `test-ui-e2e.txt`: 11 pruebas Playwright aprobadas.                                                                                             |
| Build de backend y frontend                         | Cumplido | `build.txt`.                                                                                                                                    |
| Pruebas unitarias backend y frontend                | Cumplido | `test-all.txt`: 7 suites/27 pruebas backend y 4 archivos/12 pruebas frontend.                                                                   |
| Pruebas API E2E                                     | Cumplido | `test-api-e2e.txt`: 3 suites/11 pruebas.                                                                                                        |
| Lint                                                | Cumplido | `lint.txt`: ESLint sin errores.                                                                                                                 |
| Formato                                             | Cumplido | `prettier-check.txt`: todos los archivos verificados.                                                                                           |
| Entorno                                             | Cumplido | `check-env.txt`: plantillas `.env.example` verificadas.                                                                                         |
| Datos temporales eliminados                         | Cumplido | `db-cleanup.txt`: categorías QA `0`, implementos QA `0`, alquileres de Etapa 3 `0`.                                                             |
| Migración aplicada                                  | Cumplido | `db-cleanup.txt`: `20261115100000_stage3_category_prefix` finalizada.                                                                           |

## Decisiones verificadas

- El prefijo tiene entre 2 y 10 caracteres alfanuméricos, inicia con letra y es único.
- El consecutivo se incrementa de forma atómica y el generador salta seriales existentes para evitar colisiones.
- Los seriales anteriores al formato nuevo se conservan; el contador de cada categoría se inicializó con el mayor consecutivo encontrado.
- El prefijo no se puede cambiar si la categoría tiene implementos. Al mover un implemento, el contador de la categoría destino se eleva si su serial coincide con el prefijo.
- La cantidad selecciona N unidades disponibles, conserva el serial de cada una y muestra cantidad, seriales y subtotal en el resumen.

## Observaciones

- No se reseteó la base de datos ni se ejecutó `db:seed`.
- Se corrigió el campo de tarifa del inventario para aceptar valores positivos con dos decimales (`min="0.01"`, `step="0.01"`), necesario para tarifas como `45000`.
- Se aplicó Prettier a `backend/src`, `frontend/src`, `e2e`, `scripts` y `backend/prisma/seed.ts`; el diff incluye cambios de estilo en archivos existentes.
- La aprobación de este gate habilita la Etapa 4 — Facturación y cartera.

## Resultado

La Etapa 3 cumple los criterios de salida: seriales automáticos íntegros, concurrencia controlada, serial de solo lectura, cantidad por unidades serializadas, regresión aprobada y datos existentes conservados. El commit local de la etapa se registra en el historial de Git; no se realizó push.
