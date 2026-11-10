# Especificación de Requisitos de Software (SRS) — ObraGest

**Versión:** 1.0  
**Fecha:** 9 de noviembre de 2026  
**Etapa:** 1 — Base de calidad y requisitos  
**Estado:** Borrador para revisión y aprobación  
**Sistema:** ObraGest — Administración de inventario y alquiler de implementos de construcción

---

## 1. Propósito

Definir de forma verificable los requisitos funcionales y no funcionales de ObraGest, sus reglas de negocio, actores y criterios de aceptación. Este documento es la base para:

- Diseñar los casos de prueba.
- Mantener la matriz de trazabilidad requisito → implementación → prueba.
- Evitar interpretaciones distintas entre negocio, desarrollo y pruebas.
- Controlar el alcance de las etapas de mejora.

## 2. Alcance

ObraGest permite administrar usuarios, clientes, categorías, implementos, alquileres, devoluciones, facturación y reportes. El sistema tiene dos roles:

- **ADMIN:** acceso completo, incluidos reportes, usuarios, categorías, inventario y autorizaciones.
- **EMPLEADO:** operación de clientes, alquileres, devoluciones y consulta de inventario.

Quedan fuera de esta versión:

- Facturación electrónica ante entidades tributarias.
- Integración con pasarelas de pago.
- Aplicación móvil nativa.
- Notificaciones por correo o SMS.

## 3. Definiciones

| Término             | Definición                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Implemento          | Unidad física inventariable que puede alquilarse. Puede tener un serial único.               |
| Categoría           | Agrupación lógica de implementos. Tendrá un prefijo para generar seriales.                   |
| Serial              | Código único de un implemento. Formato propuesto: `PREFIJO-###`.                             |
| Alquiler            | Registro de entrega de uno o más implementos a un cliente.                                   |
| Detalle de alquiler | Relación entre un alquiler y un implemento, con el precio congelado al momento del registro. |
| Devolución          | Registro de recepción de los implementos de un alquiler y del estado en que se reciben.      |
| Factura pendiente   | Factura emitida con saldo mayor que cero o vencida.                                          |
| Autorización        | Acción de un ADMIN que permite continuar una operación excepcional.                          |
| Excepción           | Operación permitida a pesar de una alerta, con motivo y trazabilidad.                        |

## 4. Actores

| Actor               | Descripción                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| ADMIN               | Usuario con permisos completos. Autoriza excepciones y consulta reportes. |
| EMPLEADO            | Usuario operativo. Registra clientes, alquileres y devoluciones.          |
| Cliente             | Persona que solicita el alquiler. No accede directamente al sistema.      |
| Auditor / Evaluador | Revisa requisitos, pruebas y evidencias de calidad.                       |

## 5. Supuestos y dependencias

- La base de datos es PostgreSQL y se administra con Prisma.
- La autenticación usa JWT y contraseñas con bcrypt.
- El frontend consume la API REST mediante Axios.
- Los importes se manejan en pesos colombianos (COP) con dos decimales en base de datos.
- Las fechas de calendario se normalizan para evitar desfases por zona horaria.
- Las pruebas se ejecutan en un entorno local con base de datos de desarrollo o de pruebas.

---

## 6. Requisitos funcionales

| ID        | Requisito                                            | Descripción                                                                                                                                                                 | Estado actual                                                                  | Prioridad | Etapa |
| --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | :-------: | :---: |
| **RF-01** | Autenticación                                        | El sistema permite iniciar sesión con correo y contraseña, y devuelve un token JWT.                                                                                         | Implementado                                                                   |   Alta    |   —   |
| **RF-02** | Autorización por roles                               | El backend y el frontend restringen las acciones según el rol `ADMIN` o `EMPLEADO`.                                                                                         | Implementado                                                                   |   Alta    |   —   |
| **RF-03** | Gestión de usuarios                                  | El ADMIN puede listar, crear, editar, activar y desactivar usuarios.                                                                                                        | Implementado                                                                   |   Alta    |   —   |
| **RF-04** | Cambio de contraseña                                 | Un usuario autenticado puede cambiar su propia contraseña desde la interfaz.                                                                                                | Parcial: endpoint sin UI                                                       |   Alta    |   2   |
| **RF-05** | Gestión de clientes                                  | El sistema permite crear, consultar, editar y eliminar clientes sin alquileres.                                                                                             | Implementado                                                                   |   Alta    |   —   |
| **RF-06** | Búsqueda de clientes                                 | El sistema busca clientes por documento, nombres o apellidos y permite seleccionarlos en el flujo de alquiler sin un desplegable masivo.                                    | Parcial: backend con `search`; UI de alquiler usa `<Select>`                   |   Alta    |   2   |
| **RF-07** | Gestión de categorías                                | El ADMIN puede crear, consultar, editar y eliminar categorías sin implementos.                                                                                              | Implementado                                                                   |   Alta    |   —   |
| **RF-08** | Prefijo de categoría                                 | Cada categoría tiene un prefijo único que se usa para generar los seriales de sus implementos.                                                                              | Pendiente                                                                      |   Alta    |   3   |
| **RF-09** | Gestión de inventario                                | El ADMIN puede crear, consultar, editar y eliminar implementos sin historial de alquileres.                                                                                 | Implementado                                                                   |   Alta    |   —   |
| **RF-10** | Serial automático                                    | Al crear un implemento, el backend genera su serial con el prefijo de la categoría y un consecutivo, sin permitir editarlo en la UI.                                        | Pendiente                                                                      |   Alta    |   3   |
| **RF-11** | Disponibilidad e integridad                          | Solo se alquilan implementos `DISPONIBLE`; el cambio a `ALQUILADO` ocurre en una transacción atómica.                                                                       | Implementado                                                                   |  Crítica  |   —   |
| **RF-12** | Registro de alquiler                                 | El sistema registra un alquiler con cliente, fecha pactada, implementos y precio congelado.                                                                                 | Implementado                                                                   |   Alta    |   —   |
| **RF-13** | Selector de cantidad                                 | El usuario puede indicar una cantidad de unidades del mismo tipo y el sistema selecciona esa cantidad de implementos disponibles.                                           | Pendiente                                                                      |   Alta    |   3   |
| **RF-14** | Registro de devolución                               | El sistema registra la devolución completa de un alquiler y actualiza el estado de cada implemento.                                                                         | Implementado                                                                   |   Alta    |   —   |
| **RF-15** | Alerta de factura pendiente en devolución            | Al registrar una devolución, el sistema muestra una alerta si el cliente tiene facturas pendientes, sin bloquear la devolución.                                             | Pendiente: requiere modelo de facturación                                      |   Alta    |   4   |
| **RF-16** | Autorización de nuevo alquiler con factura pendiente | Si el cliente tiene factura pendiente, un EMPLEADO puede iniciar el alquiler pero requiere autorización de un ADMIN o una excepción registrada, según la política aprobada. | Pendiente                                                                      |   Alta    |   4   |
| **RF-17** | Gestión de facturas y pagos                          | El sistema registra facturas, pagos, saldo pendiente y estado de cartera por cliente.                                                                                       | Pendiente                                                                      |   Alta    |   4   |
| **RF-18** | Reportes y dashboard                                 | El ADMIN consulta KPIs, inventario, alquileres activos e implementos más alquilados.                                                                                        | Implementado                                                                   |   Media   |   —   |
| **RF-19** | Ingresos diarios y mensuales                         | El ADMIN consulta ingresos por día y por mes, calculados con la tarifa congelada y los días del período.                                                                    | Implementado                                                                   |   Media   |   —   |
| **RF-20** | Paginación y filtros                                 | Los listados grandes se paginan y filtran en el servidor, sin truncar registros en el navegador.                                                                            | Parcial: inventario con límite fijo de 200; clientes y usuarios sin paginación |   Media   |   2   |
| **RF-21** | Auditoría de excepciones                             | Toda autorización o excepción de factura pendiente registra usuario, fecha, cliente, factura, saldo y motivo.                                                               | Pendiente                                                                      |   Alta    |   4   |

---

## 7. Requisitos no funcionales

| ID         | Requisito                     | Criterio verificable                                                                                                                | Estado actual                                         | Etapa |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | :---: |
| **RNF-01** | Seguridad de autenticación    | Tras 5 intentos fallidos consecutivos, el login responde `429` o bloquea temporalmente. Contraseñas con bcrypt.                     | Parcial: falta rate limiting                          |   5   |
| **RNF-02** | Control de acceso             | El 100% de las rutas protegidas valida JWT y rol; un EMPLEADO recibe `403` en rutas de ADMIN.                                       | Implementado                                          |   —   |
| **RNF-03** | Integridad transaccional      | Un fallo a mitad de un alquiler o devolución no deja estados parciales.                                                             | Implementado con `Serializable`                       |   —   |
| **RNF-04** | Rendimiento y escalabilidad   | Los listados paginados responden en menos de 2 segundos en entorno local con hasta 200 registros y no truncan datos.                | Parcial                                               | 2 y 5 |
| **RNF-05** | Usabilidad                    | Los flujos principales se completan sin manual; búsqueda de clientes con teclado y resultados claros; mensajes de error en español. | Parcial                                               |   2   |
| **RNF-06** | Portabilidad e instalación    | Un entorno limpio puede instalarse siguiendo el README con los `.env.example`.                                                      | Parcial: archivos existen; falta prueba limpia formal |   1   |
| **RNF-07** | Facilidad de prueba           | Existen pruebas unitarias, de integración y E2E ejecutables con `npm test` y `npm run test:e2e`.                                    | Pendiente: línea base sin pruebas                     | 1 a 6 |
| **RNF-08** | Disponibilidad y recuperación | `/api/health` responde `503` si PostgreSQL no está disponible; la UI muestra un `ErrorBoundary` ante fallos de render.              | Parcial                                               |   5   |
| **RNF-09** | Compatibilidad                | La interfaz opera en Chrome, Edge y Firefox de escritorio y en vista móvil de 375 × 812.                                            | Pendiente de evidencia                                |   6   |
| **RNF-10** | Trazabilidad                  | Cada requisito tiene al menos un caso de prueba y una evidencia asociada.                                                           | Pendiente                                             | 1 a 6 |
| **RNF-11** | Accesibilidad                 | Los controles principales tienen etiquetas, foco visible y contraste mínimo 4.5:1 en texto informativo.                             | Parcial                                               | 2 y 6 |
| **RNF-12** | Gestión de secretos           | Ningún secreto real se versiona; los `.env.example` contienen valores de desarrollo.                                                | Implementado                                          |   —   |

---

## 8. Reglas de negocio

1. Solo se puede alquilar un implemento en estado `DISPONIBLE`.
2. El estado `ALQUILADO` no se asigna manualmente; lo establece la creación del alquiler.
3. La creación del alquiler y el cambio de estados del inventario ocurren en una transacción `Serializable`.
4. Un alquiler solo puede tener una devolución.
5. La devolución debe incluir exactamente todos los implementos del alquiler.
6. Al registrar la devolución, el alquiler pasa a `FINALIZADO` y cada implemento adopta el estado final inspeccionado.
7. Un alquiler activo con fecha pactada anterior al día actual se marca como `VENCIDO` antes de listar alquileres, devoluciones o reportes.
8. No se puede eliminar un cliente con alquileres, una categoría con implementos ni un implemento con historial de alquileres.
9. Debe existir al menos un administrador activo; un administrador no puede desactivar su propia cuenta.
10. Los códigos de alquiler se generan con el formato `ALQ-YYYYMMDD-00001`.
11. El serial de un implemento se genera con el prefijo de su categoría y un consecutivo único; no se reutiliza al eliminar registros.
12. La devolución no se bloquea por factura pendiente: la alerta es informativa y queda registrada.
13. Un nuevo alquiler con factura pendiente requiere la política de autorización aprobada en la Etapa 1.
14. Toda excepción de cartera debe registrar usuario, fecha, cliente, factura, saldo y motivo.

---

## 9. Criterios de aceptación Gherkin

### RF-01 — Inicio de sesión

```gherkin
Característica: Inicio de sesión
  Como usuario registrado
  Quiero autenticarme con mi correo y contraseña
  Para acceder a las funciones según mi rol

  Escenario: Inicio de sesión exitoso
    Dado que existe un usuario activo con correo "admin@obragest.local"
    Cuando ingreso el correo y la contraseña correctos
    Entonces el sistema me redirige al panel de administración
    Y muestra el resumen operativo

  Escenario: Credenciales inválidas
    Dado que existe un usuario activo
    Cuando ingreso una contraseña incorrecta
    Entonces el sistema muestra un mensaje de error en español
    Y no crea una sesión
```

### RF-06 — Búsqueda de clientes en el flujo de alquiler

```gherkin
Característica: Búsqueda de clientes
  Como EMPLEADO
  Quiero buscar un cliente por cédula o nombre
  Para seleccionarlo sin recorrer un desplegable enorme

  Escenario: Búsqueda por documento
    Dado que existen clientes registrados
    Cuando escribo la cédula "1020304050" en el buscador de clientes
    Entonces el sistema muestra los clientes cuyo documento coincide
    Y puedo seleccionar uno con el teclado o con el mouse

  Escenario: Búsqueda por nombre
    Dado que existe el cliente "María Gómez"
    Cuando escribo "María" en el buscador
    Entonces el sistema muestra a "María Gómez" entre los resultados
    Y el resultado incluye su documento de identidad
```

### RF-10 — Serial automático por categoría

```gherkin
Característica: Serial automático de implementos
  Como ADMIN
  Quiero que el serial se genere con el prefijo de la categoría
  Para evitar errores de digitación y mantener un consecutivo único

  Escenario: Creación de un implemento
    Dada la categoría "Herramientas eléctricas" con prefijo "HERR"
    Y el último serial generado para esa categoría es "HERR-003"
    Cuando creo un implemento en esa categoría
    Entonces el sistema asigna el serial "HERR-004"
    Y el campo de serial no es editable en la interfaz

  Escenario: Creación concurrente
    Dada la categoría "Herramientas eléctricas" con prefijo "HERR"
    Cuando dos usuarios crean implementos al mismo tiempo
    Entonces el sistema genera dos seriales distintos
    Y no se produce un error de unicidad
```

### RF-13 — Selector de cantidad

```gherkin
Característica: Cantidad de implementos en un alquiler
  Como EMPLEADO
  Quiero indicar que necesito 5 andamios
  Para agregar las 5 unidades disponibles sin seleccionarlas una por una

  Escenario: Alquiler de 5 unidades
    Dado que existen al menos 5 andamios disponibles
    Cuando indico la cantidad "5" para el tipo "Andamio"
    Entonces el sistema agrega 5 unidades disponibles al alquiler
    Y muestra la cantidad y el subtotal correspondiente

  Escenario: Disponibilidad insuficiente
    Dado que solo existen 3 andamios disponibles
    Cuando intento agregar 5 andamios
    Entonces el sistema rechaza la operación
    Y muestra un mensaje indicando la disponibilidad real
```

### RF-15 — Alerta de factura pendiente en devolución

```gherkin
Característica: Alerta de cartera en devoluciones
  Como EMPLEADO
  Quiero ver si el cliente tiene facturas pendientes al recibir una devolución
  Para informarle y registrar la novedad

  Escenario: Devolución con factura pendiente
    Dado un cliente con una factura pendiente
    Cuando registro la devolución de su alquiler
    Entonces el sistema muestra una alerta con el saldo pendiente
    Y permite registrar la devolución
    Y deja registro de que se mostró la alerta
```

### RF-16 — Autorización de nuevo alquiler con factura pendiente

```gherkin
Característica: Autorización de cartera
  Como ADMIN
  Quiero autorizar excepciones de nuevos alquileres con factura pendiente
  Para controlar el riesgo sin bloquear la operación

  Escenario: EMPLEADO intenta un nuevo alquiler con factura pendiente
    Dado un cliente con saldo pendiente
    Y un usuario con rol EMPLEADO
    Cuando el EMPLEADO intenta registrar un nuevo alquiler
    Entonces el sistema muestra la alerta de cartera
    Y solicita autorización de un ADMIN para continuar
    Y registra quién autorizó, cuándo y por qué

  Escenario: ADMIN autoriza la excepción
    Dado un cliente con saldo pendiente
    Y un usuario con rol ADMIN
    Cuando el ADMIN autoriza la excepción con un motivo
    Entonces el sistema permite registrar el alquiler
    Y guarda la auditoría de la autorización
```

### RF-20 — Paginación de inventario

```gherkin
Característica: Paginación del inventario
  Como usuario
  Quiero navegar por todo el inventario
  Para no perder implementos cuando hay más de 200 registros

  Escenario: Inventario con más de 200 registros
    Dado que existen 250 implementos
    Cuando abro la página de inventario
    Entonces el sistema muestra la primera página
    Y permite navegar a la siguiente página
    Y el total de registros coincide con la base de datos
```

### RF-04 — Cambio de contraseña

```gherkin
Característica: Cambio de contraseña
  Como usuario autenticado
  Quiero cambiar mi contraseña desde la interfaz
  Para mantener mi cuenta segura

  Escenario: Cambio exitoso
    Dado que estoy autenticado
    Cuando ingreso mi contraseña actual y una nueva contraseña válida
    Entonces el sistema actualiza la contraseña
    Y puedo iniciar sesión con la nueva contraseña

  Escenario: Contraseña actual incorrecta
    Dado que estoy autenticado
    Cuando ingreso una contraseña actual incorrecta
    Entonces el sistema rechaza el cambio
    Y muestra un mensaje de error
```

---

## 10. Decisiones aprobadas el 2026-11-09

| Decisión                         | Opciones                                    | Decisión aprobada                                                                                          |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Modelo de cantidad               | Unidades serializadas vs. stock por tipo    | Seleccionar N unidades disponibles y conservar el serial de cada una.                                      |
| Modelo de facturación            | Factura por alquiler vs. cuenta por cliente | Factura por alquiler con pagos asociados y saldo calculado.                                                |
| Autorización de cartera          | ADMIN obligatorio vs. excepción de EMPLEADO | Devolución permitida al EMPLEADO; nuevo alquiler con saldo pendiente requiere ADMIN con motivo registrado. |
| Formato de serial                | Prefijo y longitud                          | `PREFIJO-###` con prefijo único por categoría y consecutivo no reutilizable.                               |
| Migración de seriales existentes | Conservar vs. renumerar                     | Conservar los seriales actuales y usar el nuevo formato solo para registros nuevos.                        |
| Alcance de Git/CI                | Local vs. GitHub + pipeline                 | Git local en Etapa 1; pipeline mínimo en Etapa 6.                                                          |

---

## 11. Control de cambios

| Versión | Fecha      | Cambio                                                                                |
| ------- | ---------- | ------------------------------------------------------------------------------------- |
| 1.0     | 2026-11-09 | Creación inicial para la Etapa 1. Incluye requisitos existentes y mejoras pendientes. |
