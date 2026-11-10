# Gate de salida — Etapa 1

**Fecha:** 9 de noviembre de 2026  
**Estado:** Aprobado con decisiones pendientes de confirmación

## Checklist

| Criterio                                               | Estado   | Evidencia                                              |
| ------------------------------------------------------ | -------- | ------------------------------------------------------ |
| SRS con requisitos funcionales y no funcionales        | Cumplido | `docs/qa/01-requisitos-y-criterios-gherkin.md`         |
| Criterios de aceptación Gherkin                        | Cumplido | `docs/qa/01-requisitos-y-criterios-gherkin.md`         |
| Matriz de trazabilidad inicial                         | Cumplido | `docs/qa/04-matriz-trazabilidad.md`                    |
| Plan de aseguramiento y pruebas                        | Cumplido | `docs/qa/02-plan-acs-y-pruebas-29119.md`               |
| Entorno de pruebas backend                             | Cumplido | Jest + Supertest + ts-jest                             |
| Entorno de pruebas frontend                            | Cumplido | Vitest + React Testing Library + jsdom                 |
| Pruebas E2E                                            | Cumplido | Playwright + Chrome                                    |
| Scripts `npm test`, `npm run test:e2e`, `npm run lint` | Cumplido | `package.json`, logs de evidencia                      |
| `.env.example` en raíz, backend y frontend             | Cumplido | `check-env.txt`                                        |
| Repositorio Git inicializado                           | Cumplido | `.git/` y primer commit                                |
| Linter configurado                                     | Cumplido | `eslint.config.mjs`, `lint.txt`                        |
| Formatter configurado                                  | Cumplido | `.prettierrc`, `.prettierignore`, `prettier-check.txt` |
| Build de backend y frontend                            | Cumplido | `build.txt`                                            |
| Pruebas unitarias                                      | Cumplido | 5 backend + 4 frontend                                 |
| Pruebas de integración de API                          | Cumplido | `test-api-e2e.txt`                                     |
| Pruebas E2E de interfaz                                | Cumplido | `test-ui-e2e.txt`                                      |
| Evidencias guardadas                                   | Cumplido | `docs/qa/evidencias/etapa-1/`                          |

## Decisiones pendientes antes de la Etapa 3

1. Modelo de cantidad: unidades serializadas vs. stock por tipo.
2. Modelo de facturación: factura por alquiler vs. cuenta por cliente.
3. Política de autorización de nuevo alquiler con factura pendiente.
4. Formato y migración de seriales existentes.
5. Alcance de Git/CI para la Etapa 6.

## Resultado

La Etapa 1 cumple el gate técnico. Las decisiones de negocio se resolverán antes de implementar las etapas 3 y 4.
