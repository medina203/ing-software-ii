# Plan de mejoras y correcciones por etapas — ObraGest

**Fecha de creación:** 9 de noviembre de 2026  
**Última actualización:** 15 de noviembre de 2026  
**Estado:** Etapas 1, 2 y 3 cerradas; Etapa 4 pendiente de inicio  
**Objetivo:** Ordenar las mejoras y correcciones en etapas verificables, con pruebas y criterio de salida al final de cada una.

> **Nota de seguimiento:** H-03 (`.env.example`) fue verificado: los tres archivos existen en raíz, backend y frontend. La Etapa 1 quedó cerrada con SRS, Gherkin, matriz de trazabilidad, entorno de pruebas, linter, Git y evidencias en `docs/qa/evidencias/etapa-1/`. La Etapa 2 fue aprobada y la Etapa 3 se cerró el 2026-11-15; sus evidencias están en `docs/qa/evidencias/etapa-2/` y `docs/qa/evidencias/etapa-3/`.

---

## 1. Reglas de trabajo

1. Una etapa no se considera terminada hasta que pasen sus pruebas y se cumpla el **gate de salida**.
2. No se inicia la siguiente etapa hasta aprobar el gate anterior.
3. Cada etapa actualiza requisitos, trazabilidad y evidencias en `docs/qa/`.
4. Cada cambio debe incluir: código, prueba, documentación y evidencia de ejecución.
5. Si una prueba falla, se corrige dentro de la misma etapa; no se traslada deuda crítica a la siguiente.
6. Las decisiones de negocio que afecten el alcance se cierran antes de codificar.

## 2. Definición de terminado (DoD)

Una etapa se considera terminada cuando:

- El build de backend y frontend compila sin errores.
- Las pruebas unitarias, de integración y E2E aplicables pasan.
- La regresión de los flujos críticos sigue funcionando.
- La documentación y la matriz de trazabilidad están actualizadas.
- La evidencia de ejecución queda guardada en `docs/qa/evidencias/`.
- Se realizó una demo o revisión con el usuario.
- No quedan defectos críticos abiertos.

## 3. Resumen de etapas

| Etapa | Nombre                         | Enfoque principal                                                              | Hallazgos / mejoras cubiertas                        |
| :---: | :----------------------------- | :----------------------------------------------------------------------------- | :--------------------------------------------------- |
| **1** | Base de calidad y requisitos   | SRS, criterios Gherkin, infraestructura de pruebas, `.env.example`, Git/linter | H-01, H-02, H-03, H-08 (parte)                       |
| **2** | Usabilidad y quick wins        | Búsqueda de clientes, cambio de contraseña, paginación de inventario           | Hallazgo manual de búsqueda, H-05, H-06 (paginación) |
| **3** | Inventario y alquiler          | Serial automático por categoría y selector de cantidad                         | Hallazgos manuales de serial y cantidad              |
| **4** | Facturación y cartera          | Facturas, saldo pendiente, alerta y autorización                               | Hallazgo manual de factura pendiente                 |
| **5** | Seguridad y confiabilidad      | Rate limiting, health check, ErrorBoundary, `GET` que muta BD, selectores      | H-04, H-06 (mutación), H-07, H-08 (selectores)       |
| **6** | Cierre de calidad y evidencias | Regresión completa, UAT, RTF, casos ISO 29119-3, dossier                       | H-01 y H-02 (cierre final)                           |

---

## 4. Etapa 1 — Base de calidad y requisitos

### Objetivo

Establecer la base documental y técnica para que las etapas siguientes tengan requisitos claros, pruebas ejecutables y evidencia verificable.

**Estado:** Cerrada el 2026-11-09. Evidencia en `docs/qa/evidencias/etapa-1/`.

### Alcance

- Crear la especificación de requisitos funcionales y no funcionales (`RF`/`RNF`).
- Redactar historias de usuario y criterios de aceptación en formato Gherkin para:
  - Búsqueda de clientes.
  - Serial automático por categoría.
  - Selector de cantidad.
  - Factura pendiente y autorización.
- Definir la matriz de trazabilidad inicial.
- Configurar el entorno de pruebas:
  - Backend: Jest + Supertest.
  - Frontend: Vitest + React Testing Library.
  - E2E: Playwright.
- Crear los scripts `npm test`, `npm run test:e2e` y `npm run lint`.
- Restaurar `.env.example`, `backend/.env.example` y `frontend/.env.example`.
- Inicializar Git y `.gitignore` (recomendado).
- Configurar linter/formatter.
- Crear la carpeta `docs/qa/evidencias/`.

### Decisiones aprobadas el 2026-11-09

1. **Modelo de cantidad:** ¿la cantidad selecciona N unidades serializadas o se agrega stock por tipo?
   - Recomendación: seleccionar N implementos disponibles del mismo nombre/categoría, conservando el serial de cada unidad.
2. **Modelo de facturación:** ¿una factura por alquiler o una cuenta por cliente?
   - Recomendación: factura por alquiler con pagos asociados y saldo calculado.
3. **Política de autorización:** ¿un EMPLEADO puede continuar con factura pendiente o requiere autorización de un ADMIN?
   - Recomendación: devolución permitida al EMPLEADO; nuevo alquiler con saldo pendiente requiere autorización de ADMIN con motivo registrado.
4. **Formato de serial:** prefijo por categoría, longitud del consecutivo y tratamiento de los registros existentes.
5. **Alcance de Git/CI:** repositorio local, GitHub y pipeline mínimo.

**Resultado:** las cinco recomendaciones fueron aprobadas por el usuario. Se implementarán en las etapas 3, 4 y 6.

### Entregables

- `docs/qa/01-requisitos-y-criterios-gherkin.md`
- `docs/qa/02-plan-acs-y-pruebas-29119.md`
- `docs/qa/04-matriz-trazabilidad.md`
- Configuración de pruebas y scripts en los `package.json`.
- Plantillas `.env.example`.
- Repositorio Git inicializado y primer commit.

### Pruebas de cierre

- Instalación limpia siguiendo el README usando los `.env.example`.
- `npm run build` en backend y frontend.
- `npm test` ejecutando al menos una prueba de humo en backend y frontend.
- `npm run test:e2e` ejecutando un flujo mínimo de login.
- Revisión y aprobación de requisitos y criterios de aceptación.

### Gate de salida

- Build y pruebas base pasan.
- La instalación limpia funciona.
- Los requisitos y las decisiones están aprobados por el usuario.
- La matriz de trazabilidad tiene al menos los requisitos de las etapas 2 a 4 identificados.

---

## 5. Etapa 2 — Usabilidad y quick wins

**Estado:** Cerrada y aprobada el 2026-11-15. Evidencia en `docs/qa/evidencias/etapa-2/`.

### Objetivo

Resolver las mejoras de usabilidad de bajo riesgo y mayor impacto percibido, sin tocar todavía el modelo de inventario ni facturación.

### Alcance

- Reemplazar el `<Select>` de clientes en `NewRentalPage` por un combobox con búsqueda.
- Buscar en servidor por cédula, nombres o apellidos usando `GET /clients?search=`.
- Mostrar `documento - nombres apellidos` y permitir navegación con teclado.
- Migrar la búsqueda de `ClientsPage` a servidor (hoy filtra en memoria).
- Agregar la interfaz de cambio de contraseña para el usuario autenticado (H-05).
- Incorporar paginación y filtros de servidor en `InventoryPage` (H-06, primera parte).

### Pruebas de cierre

- Unitarias: normalización de búsqueda y construcción de consultas.
- API: `GET /clients?search=` por cédula, nombre y apellido; paginación de `/items`.
- E2E:
  - Buscar cliente por cédula y por nombre, seleccionarlo y crear un alquiler.
  - Crear más de 200 implementos y verificar que la paginación permite acceder a todos.
  - Cambiar contraseña y volver a iniciar sesión.
- Regresión: creación de alquiler, CRUD de clientes y login.

### Gate de salida

- Ya no existe un desplegable con todos los clientes en el flujo de alquiler.
- La búsqueda funciona con 0, 1 y muchos resultados.
- El inventario ya no queda truncado a 200 registros.
- El cambio de contraseña funciona para ADMIN y EMPLEADO.
- Todas las pruebas y la regresión pasan.

---

## 6. Etapa 3 — Inventario y alquiler

**Estado:** Cerrada el 2026-11-15. Evidencia en `docs/qa/evidencias/etapa-3/`.

### Objetivo

Mejorar la integridad y la operación del inventario con seriales automáticos y selección de cantidad.

### Decisiones implementadas

- Prefijo único por categoría, de 2 a 10 caracteres alfanuméricos y con letra inicial.
- Serial `PREFIJO-###` generado en el backend; no editable en la UI y con consecutivo no reutilizable.
- Los seriales existentes se conservan. El contador de cada categoría se inicializa con el mayor consecutivo encontrado.
- El prefijo no se puede cambiar si la categoría tiene implementos. Si un implemento se mueve de categoría, el contador destino se eleva cuando el serial coincide con su prefijo.
- La cantidad N selecciona N unidades disponibles y conserva el serial de cada una; el resumen muestra cantidad, seriales y subtotal.

### Alcance

- Agregar un prefijo único a `Categoria` (`HERR`, `AND`, `MAQ`, etc.).
- Generar `codigoSerie` automáticamente en el backend con formato `PREFIJO-###`.
- Usar un contador por categoría dentro de una transacción o una tabla de consecutivos.
- Mantener `codigoSerie` como campo de solo lectura en la UI.
- Definir el tratamiento de los implementos existentes.
- Implementar el selector de cantidad por tipo de implemento:
  - Recomendación: seleccionar N unidades disponibles y agregarlas como N detalles de alquiler, conservando el serial de cada una.
  - Validar disponibilidad y evitar seleccionar la misma unidad dos veces.
- Ajustar el resumen del alquiler para mostrar cantidad y unidades.

### Pruebas de cierre

- Unitarias: generador de serial, formato, consecutivo y validación de prefijo.
- Integración: creación concurrente de implementos sin seriales duplicados.
- API: creación de alquiler con 5 unidades del mismo tipo.
- E2E:
  - Crear categoría con prefijo, crear implemento y verificar serial automático.
  - Alquilar 5 andamios y verificar que se descuentan las 5 unidades correctas.
  - Intentar alquilar una unidad no disponible y verificar el rechazo.
- Regresión: alquileres y devoluciones existentes.

### Gate de salida

- No se generan seriales duplicados en concurrencia.
- El serial no es editable en la UI.
- La cantidad funciona con unidades serializadas.
- Los registros existentes siguen operando.
- Todas las pruebas y la regresión pasan.

---

## 7. Etapa 4 — Facturación y cartera

### Objetivo

Incorporar el control de facturas pendientes y definir la política de autorización con trazabilidad.

### Alcance

- Crear el modelo de facturas y pagos:
  - Factura por alquiler o cuenta por cliente (decisión de Etapa 1).
  - Estados: `PENDIENTE`, `PAGADA`, `VENCIDA`.
  - Saldo calculado a partir del total y los pagos.
- Mostrar alerta de factura pendiente en:
  - Registro de devolución.
  - Registro de nuevo alquiler.
- Implementar la política de autorización definida:
  - Devolución: permitida al EMPLEADO con alerta informativa.
  - Nuevo alquiler con saldo pendiente: autorización de ADMIN o excepción registrada, según la decisión aprobada.
- Registrar auditoría de la excepción: usuario, fecha/hora, cliente, factura, saldo, motivo y autorizador.
- Actualizar el detalle del cliente y del alquiler con el estado de cartera.

### Pruebas de cierre

- Unitarias: cálculo de saldo, estados de factura y reglas de autorización.
- API: crear factura, registrar pago, consultar saldo pendiente.
- Seguridad: EMPLEADO sin autorización recibe `403`; ADMIN autoriza correctamente.
- E2E:
  - Cliente con factura pendiente intenta devolver: se muestra alerta y la devolución se permite.
  - EMPLEADO intenta nuevo alquiler: se solicita autorización de ADMIN.
  - ADMIN autoriza con motivo y queda registro.
  - Se registra el pago y la alerta desaparece.
- Regresión: alquileres, devoluciones y reportes de ingresos.

### Gate de salida

- La alerta aparece en ambos flujos.
- No existe forma de saltarse la autorización.
- Toda excepción queda auditada.
- El pago actualiza el saldo correctamente.
- Todas las pruebas y la regresión pasan.

---

## 8. Etapa 5 — Seguridad, confiabilidad y mantenibilidad

### Objetivo

Cerrar las brechas técnicas de seguridad, recuperación y mantenibilidad detectadas en la auditoría.

### Alcance

- Implementar rate limiting o bloqueo temporal en `POST /api/auth/login` (H-04).
- Hacer que `GET /api/health` verifique realmente PostgreSQL con `SELECT 1` (H-07).
- Agregar `ErrorBoundary` en React (H-07).
- Eliminar la mutación de estado en peticiones `GET` (`markOverdueRentals`) (H-06, segunda parte).
- Centralizar `userSummary`, `clientSummary` e `itemSummary` (H-08).
- Completar linter/formatter si quedó pendiente en Etapa 1.

### Pruebas de cierre

- Seguridad: 6 intentos fallidos de login generan `429` o bloqueo temporal.
- Recuperación: con PostgreSQL detenido, `/api/health` responde `503`.
- UI: un error de render no deja la aplicación en blanco.
- Integración: los `GET` de alquileres no modifican la base de datos.
- Rendimiento/volumen: paginación y consultas principales con datos de prueba.
- Regresión completa de los flujos críticos.

### Gate de salida

- Las pruebas de seguridad y recuperación pasan.
- No hay mutaciones en `GET`.
- Los selectores están centralizados.
- No hay regresiones críticas.

---

## 9. Etapa 6 — Cierre de calidad y evidencias

### Objetivo

Consolidar la evidencia de calidad y dejar el sistema listo para la revisión de los expertos.

### Alcance

- Ejecutar la regresión completa.
- Ejecutar pruebas de aceptación y UAT con usuarios.
- Documentar los casos de prueba en la plantilla ISO/IEC/IEEE 29119-3 (8/12 campos).
- Completar la matriz de trazabilidad requisito → caso → ejecución.
- Realizar la Revisión Técnica Formal (RTF) y registrar defectos.
- Ejecutar pruebas no funcionales: rendimiento, volumen, seguridad, compatibilidad y usabilidad.
- Actualizar el README con los nuevos flujos, endpoints y comandos de prueba.
- Preparar el paquete de evidencias para los expertos.

### Pruebas de cierre

- Suite completa de pruebas unitarias, integración y E2E.
- Pruebas de aceptación de todas las historias de usuario.
- Pruebas no funcionales documentadas.
- Verificación de la matriz de trazabilidad sin requisitos huérfanos.
- Revisión final con el usuario.

### Gate de salida

- Todas las pruebas pasan.
- La trazabilidad está completa.
- Las evidencias están en `docs/qa/evidencias/`.
- No quedan defectos críticos abiertos.
- El sistema está listo para la sustentación.

---

## 10. Matriz de hallazgos y mejoras → etapa

| Hallazgo / mejora                          |                Etapa                |
| :----------------------------------------- | :---------------------------------: |
| H-01: pruebas automatizadas y artefactos   |    1 (base) + todas + 6 (cierre)    |
| H-02: SRS, Gherkin y trazabilidad          | 1 + actualización en cada etapa + 6 |
| H-03: `.env.example`                       |                  1                  |
| H-04: rate limiting en login               |                  5                  |
| H-05: UI de cambio de contraseña           |                  2                  |
| H-06: inventario truncado a 200            |                  2                  |
| H-06: `GET` que muta la base de datos      |                  5                  |
| H-07: health check real y ErrorBoundary    |                  5                  |
| H-08: Git/linter y selectores duplicados   |   1 (Git/linter) + 5 (selectores)   |
| Búsqueda de clientes por cédula/nombre     |                  2                  |
| Serial automático por categoría            |                  3                  |
| Selector de cantidad                       |                  3                  |
| Alerta de factura pendiente y autorización |                  4                  |

---

## 11. Orden de inicio recomendado

1. **Etapa 1:** sin requisitos claros ni infraestructura de pruebas, las etapas 3 y 4 se vuelven a hacer.
2. **Etapa 2:** quick wins visibles y de bajo riesgo.
3. **Etapa 3:** cambio de modelo de inventario con pruebas de concurrencia.
4. **Etapa 4:** facturación y control de cartera.
5. **Etapa 5:** endurecimiento técnico.
6. **Etapa 6:** cierre y evidencias.

> **Nota:** Este documento es una propuesta de planificación. No se ha modificado código funcional.
