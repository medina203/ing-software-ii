# Evidencia — Etapa 2: Usabilidad y quick wins

**Fecha de ejecución:** 9 de noviembre de 2026  
**Responsable:** Equipo ObraGest  
**Entorno:** Windows, Node.js v24.19.0, npm 11.17.0, PostgreSQL local, Chrome instalado.

## Comandos y resultados

| Evidencia            | Comando                                | Resultado                                                                  |
| -------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `build.txt`          | `npm run build`                        | Backend y frontend compilan sin errores.                                   |
| `test-all.txt`       | `npm test`                             | 10 pruebas backend + 8 pruebas frontend aprobadas.                         |
| `test-backend.txt`   | `npm run test --workspace backend`     | 4 suites, 10 pruebas aprobadas.                                            |
| `test-frontend.txt`  | `npm run test --workspace frontend`    | 3 archivos, 8 pruebas aprobadas.                                           |
| `test-api-e2e.txt`   | `npm run test:e2e --workspace backend` | 2 suites, 6 pruebas de integración aprobadas.                              |
| `test-ui-e2e.txt`    | `npm run test:e2e`                     | 7 pruebas Playwright aprobadas en Chrome.                                  |
| `lint.txt`           | `npm run lint`                         | ESLint sin errores ni advertencias.                                        |
| `prettier-check.txt` | `npx prettier --check ...`             | Los archivos nuevos y modificados cumplen el formato configurado.          |
| `check-env.txt`      | `npm run check:env`                    | Las tres plantillas `.env.example` existen y tienen las claves requeridas. |

## Cobertura de la etapa

- **Búsqueda de clientes en alquiler:** `ClientSearchSelect` reemplaza el desplegable de todos los clientes, consulta `GET /clients?search=` con debounce de 250 ms, limita a 8 sugerencias y permite navegar con flechas, seleccionar con Enter y cerrar con Escape.
- **Búsqueda de clientes en la página de clientes:** `ClientsPage` migró el filtrado en memoria a `GET /clients?search=` con debounce de 300 ms y protección contra respuestas obsoletas.
- **Cambio de contraseña:** nueva ruta `/perfil`, acceso “Mi cuenta” en el layout y formulario con validación de longitud, confirmación y contraseña actual. El API se probó con un usuario ADMIN temporal; el E2E con un usuario EMPLEADO temporal.
- **Inventario paginado:** `InventoryPage` usa `GET /items` con `page`, `pageSize=9`, búsqueda y filtros de estado/categoría en servidor. Se eliminó el límite fijo de 200 y se agregaron controles Anterior/Siguiente.
- **Volumen:** la prueba de API crea 205 implementos temporales y verifica la página 2 con `pageSize=100`, sin truncamiento, y los elimina al finalizar.
- **Regresión:** login de administrador, búsqueda/selección de cliente y creación de un alquiler desde la UI; búsqueda de clientes en su página; alta, edición y eliminación de un cliente temporal; navegación de inventario.

## Datos de prueba y limpieza

- El E2E crea un implemento, un cliente y un usuario temporales con prefijos `QA-E2E-`, `QA-CC-` y `qa-e2e-stage2-`.
- El alquiler creado por la prueba se elimina en `afterAll` junto con el implemento, el cliente y el usuario temporal.
- Verificación posterior: `qaItems: 0`, `qaClients: 0`, `qaUsers: 0`. No se resetearon datos existentes.

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
- `gate-etapa-2.md`
