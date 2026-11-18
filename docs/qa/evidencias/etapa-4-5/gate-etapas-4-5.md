# Gate de salida — Etapas 4 y 5

**Fecha:** 17 de noviembre de 2026

## Etapa 4 — Facturación y cartera

| Criterio del plan                             | Resultado | Evidencia                                                                         |
| --------------------------------------------- | :-------: | --------------------------------------------------------------------------------- |
| La alerta aparece en ambos flujos             |   Pasa    | `stage4.spec.ts` (alquiler y devolución), `CP-BILL-01`                            |
| No existe forma de saltarse la autorización   |   Pasa    | API: 403 sin motivo, 401 con credenciales inválidas, 429 por fuerza bruta         |
| Toda excepción queda auditada                 |   Pasa    | `stage4-5.e2e-spec.ts` › RF-16/RF-21 (usuario, ADMIN, saldo, motivo, fecha)       |
| El pago actualiza el saldo correctamente      |   Pasa    | `stage4-5.e2e-spec.ts` › pagos parcial, total, sobrepago (400) y doble pago (409) |
| La factura refleja los días reales (agregado) |   Pasa    | `billing.spec.ts`, `stage4-5.e2e-spec.ts` › devolución tardía                     |
| Todas las pruebas y la regresión pasan        |   Pasa    | 122/122                                                                           |

## Etapa 5 — Seguridad, confiabilidad y mantenibilidad

| Criterio del plan                            | Resultado | Evidencia                                  |
| -------------------------------------------- | :-------: | ------------------------------------------ |
| 6 intentos fallidos generan 429              |   Pasa    | `seguridad-login.txt`, `CP-SEC-01`         |
| Con PostgreSQL detenido, `/api/health` = 503 |   Pasa    | `recuperacion-health.txt`, `CP-REC-01`     |
| Un error de render no deja la app en blanco  |   Pasa    | `ErrorBoundary.test.tsx`, `CP-REC-03`      |
| Los `GET` no modifican la base de datos      |   Pasa    | `stage4-5.e2e-spec.ts` › H-06, `CP-REC-02` |
| Selectores centralizados                     |   Pasa    | `backend/src/common/prisma-selects.ts`     |
| Sin regresiones críticas                     |   Pasa    | Suites de Etapas 2 y 3 en verde            |

**Decisión:** Etapas 4 y 5 aprobadas. Pendientes trasladados a la Etapa 6 en el informe (sección 8).
