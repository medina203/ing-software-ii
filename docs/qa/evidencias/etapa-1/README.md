# Evidencia — Etapa 1: Base de calidad y requisitos

**Fecha de ejecución:** 9 de noviembre de 2026  
**Responsable:** Equipo ObraGest  
**Entorno:** Windows, Node.js v24.19.0, npm 11.17.0, PostgreSQL local, Chrome instalado.

## Comandos y resultados

| Evidencia            | Comando                                | Resultado                                                                  |
| -------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `build.txt`          | `npm run build`                        | Backend y frontend compilan sin errores.                                   |
| `test-all.txt`       | `npm test`                             | 5 pruebas backend + 4 pruebas frontend aprobadas.                          |
| `test-backend.txt`   | `npm run test --workspace backend`     | 2 suites, 5 pruebas aprobadas.                                             |
| `test-frontend.txt`  | `npm run test --workspace frontend`    | 1 archivo, 4 pruebas aprobadas.                                            |
| `test-api-e2e.txt`   | `npm run test:e2e --workspace backend` | 1 suite, 1 prueba de integración aprobada.                                 |
| `test-ui-e2e.txt`    | `npm run test:e2e`                     | 2 pruebas E2E aprobadas en Chrome.                                         |
| `lint.txt`           | `npm run lint`                         | ESLint sin errores ni advertencias.                                        |
| `prettier-check.txt` | `npx prettier --check ...`             | Los archivos nuevos cumplen el formato configurado.                        |
| `check-env.txt`      | `npm run check:env`                    | Las tres plantillas `.env.example` existen y tienen las claves requeridas. |

## Observaciones

- La API debe estar disponible en `http://127.0.0.1:4000/api` para las pruebas E2E.
- El frontend debe estar disponible en `http://localhost:5173` para Playwright.
- Playwright reutiliza una instancia existente; si no existe, el `webServer` intenta iniciar `npm run dev`.
- Los logs conservan el formato de salida de las herramientas; algunos caracteres ANSI pueden aparecer como símbolos en el archivo de texto.
- No se guardaron tokens, contraseñas ni secretos en las evidencias.

## Archivos generados

- `build.txt`
- `test-all.txt`
- `test-backend.txt`
- `test-frontend.txt`
- `test-api-e2e.txt`
- `test-ui-e2e.txt`
- `lint.txt`
- `prettier-check.txt`
- `check-env.txt`
