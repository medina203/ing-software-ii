# Evidencias — Etapas 4 y 5 (evaluación ISO/IEC 25010)

**Fecha de ejecución:** 17 de noviembre de 2026  
**Entorno:** Linux, Node.js v22.23.4, npm 10.9.9, PostgreSQL 16, Google Chrome (Playwright 1.65).  
**API:** `http://127.0.0.1:4000/api` · **Frontend:** `http://localhost:5173`  
**Informe:** `docs/qa/05-evaluacion-calidad-iso25010.md`

> Nota de entorno: el sandbox de evaluación no tenía acceso a `binaries.prisma.sh`, por lo que
> Prisma se ejecutó con el compilador de consultas WASM y `@prisma/adapter-pg` mediante un
> archivo de precarga fuera del repositorio. El código y el esquema versionados no cambian; en
> un equipo normal se usa `npm run db:setup` como indica el README.

## Archivos

| Archivo                         | Contenido                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `estado-inicial-038ca9a.txt`    | Verificación del estado recibido (antes de las correcciones).              |
| `build.txt`                     | `npm run build`: backend Nest y frontend Vite/TypeScript.                  |
| `lint.txt`                      | `npm run lint`: ESLint sin errores.                                        |
| `prettier-check.txt`            | Formato verificado con Prettier.                                           |
| `check-env.txt`                 | `npm run check:env`.                                                       |
| `test-backend-unit.txt`         | `npm run test:cov --workspace backend`: 11 suites, 63 pruebas y cobertura. |
| `test-frontend.txt`             | `npm test --workspace frontend`: 6 archivos, 18 pruebas.                   |
| `test-api-e2e.txt`              | `npm run test:e2e --workspace backend`: 5 suites, 25 pruebas.              |
| `test-ui-e2e.txt`               | `npm run test:e2e`: 16 pruebas Playwright en Chrome.                       |
| `mejora-inventario-agrupado.md` | Inventario con una tarjeta por tipo y su stock.                            |
| `recuperacion-health.txt`       | `/api/health` con PostgreSQL arriba, detenido (503) y restablecido.        |
| `seguridad-login.txt`           | Siete intentos fallidos de login: 401 × 5 y 429 desde el sexto.            |
| `gate-etapas-4-5.md`            | Checklist del gate de salida.                                              |

## Resultado

| Verificación       | Estado inicial (`038ca9a`) | Estado final        |
| ------------------ | -------------------------- | ------------------- |
| Build frontend     | Falla (5 errores TS)       | Pasa                |
| Lint               | Falla (1 error)            | Pasa                |
| Unitarias backend  | 25/28                      | 63/63               |
| Unitarias frontend | 12/12                      | 18/18               |
| API e2e            | 10/12 + limpieza fallida   | 25/25               |
| UI e2e             | No ejecutable (0/12)       | 16/16               |
| **Total**          | **47/64 (73 %)**           | **122/122 (100 %)** |
