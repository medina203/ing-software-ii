# Mejora — Alta por cantidad en inventario

**Fecha:** 15 de noviembre de 2026  
**Estado:** Implementada y verificada  
**Alcance:** alta de 1 a 100 unidades iguales en una sola transacción y acción "Agregar unidades" desde tarjetas existentes.

## Cambios implementados

- Se agregó `POST /items/batch` con el DTO `CreateItemBatchDto`, que valida una cantidad entera entre 1 y 100.
- `ItemsService.createBatch` crea todas las unidades dentro de una sola transacción y reserva un serial consecutivo para cada una.
- `POST /items` se conserva con su respuesta anterior para compatibilidad; la UI usa el endpoint de lote para todas las altas.
- El formulario de inventario incluye el campo **Cantidad de unidades** y muestra una vista previa de los seriales que se generarán.
- Cada tarjeta de inventario incluye la acción **Agregar unidades**, que abre el formulario con los datos del implemento y crea unidades nuevas sin modificar la unidad original.
- La cantidad inválida se rechaza tanto en la UI como en la API.

## Verificación

| Comando                                | Resultado                                                             | Evidencia            |
| -------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| `npm run build`                        | Backend Nest y frontend Vite/TypeScript aprobados.                    | `build.txt`          |
| `npm test`                             | 7 suites/28 pruebas backend y 4 archivos/12 pruebas frontend.         | `test-all.txt`       |
| `npm run test:e2e --workspace backend` | 3 suites/12 pruebas API aprobadas.                                    | `test-api-e2e.txt`   |
| `npm run test:e2e`                     | 12 pruebas Playwright aprobadas, incluida la prueba de alta por lote. | `test-ui-e2e.txt`    |
| `npm run lint`                         | ESLint sin errores.                                                   | `lint.txt`           |
| `npx prettier --check ...`             | Todos los archivos verificados.                                       | `prettier-check.txt` |
| `npm run check:env`                    | Plantillas `.env.example` verificadas.                                | `check-env.txt`      |
| Verificación de datos temporales       | Categorías e implementos QA en `0`; datos existentes conservados.     | `db-cleanup.txt`     |

## Casos cubiertos

- `CP-INV-06`: alta de 3 unidades con seriales consecutivos y acción "Agregar unidades" con 2 unidades adicionales.
- API: `POST /items/batch` devuelve `{ items, total }`, conserva el consecutivo y rechaza cantidades `0` y `101` con `400`.
- UI: el formulario muestra la vista previa del primer serial, el aviso de cuántos seriales se generarán y el mensaje de éxito con la cantidad creada.
- La transacción no deja unidades parciales si falla la creación.

## Notas

- No se reseteó la base de datos ni se ejecutó `db:seed`.
- Las pruebas E2E crean y eliminan sus propios registros temporales.
- El inventario sigue siendo serializado: agregar unidades crea nuevos implementos con serial único; no se edita un stock agregado.
- El commit de esta mejora se registra en el historial local, sin push.
