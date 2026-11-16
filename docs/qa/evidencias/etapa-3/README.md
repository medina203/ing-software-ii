# Evidencias — Etapa 3

**Fecha de ejecución:** 15 de noviembre de 2026  
**Entorno:** Windows, Node.js v24.19.0, npm 11.17.0.  
**API:** `http://127.0.0.1:4000/api`  
**Frontend:** `http://localhost:5173`

## Archivos

| Archivo                       | Contenido                                                               |
| ----------------------------- | ----------------------------------------------------------------------- |
| `build.txt`                   | `npm run build` (backend Nest y frontend Vite/TypeScript).              |
| `test-all.txt`                | `npm test`: Jest backend y Vitest frontend.                             |
| `test-api-e2e.txt`            | `npm run test:e2e --workspace backend`: suites API de Etapas 2 y 3.     |
| `test-ui-e2e.txt`             | `npm run test:e2e`: Playwright smoke, Etapa 2, Etapa 3 y alta por lote. |
| `lint.txt`                    | `npm run lint`: ESLint sin errores.                                     |
| `prettier-check.txt`          | Verificación de formato con Prettier.                                   |
| `check-env.txt`               | `npm run check:env`: plantillas `.env.example`.                         |
| `db-cleanup.txt`              | Estado final de categorías, seriales, migración y datos temporales.     |
| `mejora-alta-por-cantidad.md` | Cambios, pruebas y resultado de la mejora de alta por cantidad.         |
| `gate-etapa-3.md`             | Checklist y resultado del gate de salida.                               |

## Comandos ejecutados

```bash
npm run build
npm test
npm run test:e2e --workspace backend
npm run test:e2e
npm run lint
npx prettier --check backend/src frontend/src e2e scripts backend/prisma/seed.ts
npm run check:env
```

## Notas

- Las pruebas E2E crean y eliminan sus propios registros temporales.
- La mejora de alta por cantidad usa `POST /items/batch`; `POST /items` se conserva para compatibilidad.
- No se ejecutó `db:seed` ni se reseteó la base de datos.
- La migración `20261115100000_stage3_category_prefix` ya estaba aplicada y se verificó en `db-cleanup.txt`.
- El script temporal que generó `db-cleanup.txt` se eliminó al terminar la verificación.
