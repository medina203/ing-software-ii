# ObraGest — Inventario y alquiler de implementos de construcción

Sistema full stack para administrar el inventario, los clientes, los alquileres y las devoluciones de una empresa de alquiler de implementos de construcción.

El repositorio es un monorepo con dos aplicaciones:

- **Backend:** NestJS 11 + Prisma 6 + PostgreSQL 16, autenticación JWT y control de acceso por roles.
- **Frontend:** React 19 + Vite 7 + React Router 7 + Tailwind CSS 3, SPA responsiva con tema visual propio.

---

## 1. Funcionalidades

- Autenticación con correo y contraseña, hash bcrypt y token JWT.
- Roles `ADMIN` y `EMPLEADO` con permisos diferenciados en API y frontend.
- Dashboard administrativo con indicadores de inventario, alquileres, vencidos, clientes y devoluciones del mes.
- Inventario de implementos paginado, con búsqueda y filtros de servidor por estado y categoría, y CRUD para administradores.
- Gestión de clientes con búsqueda en servidor por documento, nombre, teléfono o correo.
- Combobox de clientes con búsqueda por cédula, nombres o apellidos y navegación por teclado en el registro de alquileres.
- Cambio de contraseña del usuario autenticado desde la sección “Mi cuenta”.
- Registro de alquileres con múltiples implementos, validación de disponibilidad y transacción atómica.
- Devoluciones con inspección individual por implemento y asignación de estado final:
  - `DISPONIBLE`
  - `MANTENIMIENTO`
  - `FUERA_DE_SERVICIO`
- Historial de alquileres y devoluciones con usuario responsable, fechas y observaciones.
- Estado vencido calculado al consultar (sin escrituras en `GET`) y sincronizado por un proceso programado cada 15 minutos.
- Facturación por alquiler, pagos parciales, cartera por cliente, alerta en devoluciones y autorización auditada de ADMIN para clientes con saldo pendiente.
- Bloqueo temporal tras 5 intentos fallidos de inicio de sesión.
- Imágenes por implemento: ilustración automática según el tipo o foto propia subida desde el celular o el PC.
- Apariencia configurable por el ADMIN: modo oscuro, tamaño de letra, color principal, imagen del login y carrusel del panel.
- Validación de datos: identificación por tipo y teléfono solo con números y límite de dígitos.
- Inventario agrupado: una tarjeta por implemento con su stock (disponibles, alquiladas, en mantenimiento y fuera de servicio); los seriales se gestionan en "Ver unidades".
- Reportes de inventario por estado, implementos más alquilados y alquileres vigentes/vencidos.
- Administración de categorías y usuarios.
- Interfaz adaptada a móvil, con modales, notificaciones y vistas imprimibles de alquiler y reportes.

---

## 2. Stack

| Capa            | Tecnologías                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| Backend         | NestJS 11, Prisma 6.19.3, PostgreSQL 16, JWT, bcryptjs, class-validator, Helmet             |
| Frontend        | React 19, Vite 7, TypeScript, React Router 7, Tailwind CSS 3, Axios, date-fns, lucide-react |
| Infraestructura | Docker Compose, PostgreSQL 16 Alpine                                                        |
| Herramientas    | npm workspaces, Prisma CLI, tsx, concurrently                                               |

---

## 3. Estructura del proyecto

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/              # Migración inicial versionada
│   │   ├── schema.prisma            # Modelo relacional
│   │   └── seed.ts                  # Datos demo idempotentes
│   ├── src/
│   │   ├── auth/                    # Login, perfil y cambio de contraseña
│   │   ├── users/                   # Administración de usuarios
│   │   ├── clients/                 # Clientes
│   │   ├── categories/              # Categorías
│   │   ├── items/                   # Inventario e implementos
│   │   ├── rentals/                 # Alquileres
│   │   ├── returns/                 # Devoluciones
│   │   ├── reports/                 # Reportes y dashboard
│   │   ├── common/                  # Guards, decoradores, filtros y utilidades
│   │   └── prisma/                  # PrismaService
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── auth/                    # Contexto de sesión
│   │   ├── components/              # Layout y componentes UI
│   │   ├── pages/                   # Vistas de la SPA
│   │   ├── lib/                     # Cliente Axios y utilidades
│   │   └── types/                   # Contratos TypeScript de la API
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 4. Requisitos previos

- **Node.js 20 o superior**. Validado con Node.js 24.19.0.
- **npm 10 o superior**. Validado con npm 11.17.0.
- **Docker Desktop con Docker Compose v2** para el camino recomendado.
- Puertos libres:
  - `4000`: API NestJS.
  - `5173`: frontend Vite en desarrollo.
  - `5432`: PostgreSQL (configurable).

Si no dispone de Docker, puede usar una instalación local de PostgreSQL 16; consulte la sección [Uso con PostgreSQL local](#10-uso-con-postgresql-local).

---

## 5. Inicio rápido

Desde la raíz del repositorio, en PowerShell:

```powershell
# 1. Variables de entorno
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env

# 2. Dependencias
npm install

# 3. Base de datos PostgreSQL
npm run db:up

# 4. Generar cliente Prisma, aplicar migraciones y cargar datos demo
npm run db:setup

# 5. API + frontend
npm run dev
```

> **En este equipo ya está instalado PostgreSQL 16 local y la base fue migrada y sembrada.** No es necesario instalar Docker ni ejecutar `npm run db:up`; la base se inicia automáticamente con la sesión de Windows. Consulte [Instalación local en Windows sin Docker](#101-instalación-local-en-windows-sin-docker).

Servicios disponibles:

| Servicio      | URL                              |
| ------------- | -------------------------------- |
| Frontend      | http://localhost:5173            |
| API           | http://localhost:4000/api        |
| Health check  | http://localhost:4000/api/health |
| Prisma Studio | `npm run db:studio`              |

### Credenciales demo

| Rol           | Correo                    | Contraseña     |
| ------------- | ------------------------- | -------------- |
| Administrador | `admin@obragest.local`    | `Admin123*`    |
| Empleado      | `empleado@obragest.local` | `Empleado123*` |

> Cambie estas credenciales y el `JWT_SECRET` antes de cualquier despliegue real.

---

## 6. Variables de entorno

### 6.1 Raíz `.env` (Docker Compose)

Se crea a partir de `.env.example`. Es opcional porque `docker-compose.yml` define valores por defecto.

| Variable            | Valor por defecto | Descripción                 |
| ------------------- | ----------------- | --------------------------- |
| `POSTGRES_USER`     | `inventario`      | Usuario de PostgreSQL       |
| `POSTGRES_PASSWORD` | `inventario123`   | Contraseña de PostgreSQL    |
| `POSTGRES_DB`       | `inventario_db`   | Nombre de la base de datos  |
| `POSTGRES_PORT`     | `5432`            | Puerto publicado en el host |
| `TZ`                | `America/Bogota`  | Zona horaria del contenedor |

### 6.2 Backend `backend/.env`

Se crea a partir de `backend/.env.example`.

| Variable                                                             | Ejemplo                                                                            | Descripción                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                                                       | `postgresql://inventario:inventario123@localhost:5432/inventario_db?schema=public` | Cadena de conexión usada por Prisma                      |
| `JWT_SECRET`                                                         | Cadena larga y aleatoria                                                           | Firma de los tokens JWT                                  |
| `JWT_EXPIRES_IN_SECONDS`                                             | `28800`                                                                            | Vigencia del token en segundos (8 horas por defecto)     |
| `PORT`                                                               | `4000`                                                                             | Puerto de la API                                         |
| `FRONTEND_URL`                                                       | `http://localhost:5173`                                                            | Origen(es) permitidos por CORS, separados por coma       |
| `UPLOADS_DIR`                                                        | `./uploads`                                                                        | Carpeta de imágenes subidas (debe persistir)             |
| `APP_TIMEZONE`                                                       | `America/Bogota`                                                                   | Zona del negocio para "hoy", vencimientos y días         |
| `STATUS_SYNC_INTERVAL_MINUTES`                                       | `15`                                                                               | Sincronización de estados vencidos (0 = solo al iniciar) |
| `LOGIN_MAX_FAILURES` / `LOGIN_WINDOW_MINUTES` / `LOGIN_LOCK_MINUTES` | `5` / `15` / `15`                                                                  | Bloqueo por intentos fallidos (responde `429`)           |

> Si cambia `POSTGRES_PORT` en el `.env` raíz, actualice también el puerto de `DATABASE_URL` en `backend/.env`.

### 6.3 Frontend `frontend/.env`

Es opcional en desarrollo. Se crea a partir de `frontend/.env.example`.

| Variable       | Valor por defecto           | Descripción                            |
| -------------- | --------------------------- | -------------------------------------- |
| `VITE_API_URL` | `http://localhost:4000/api` | URL base de la API consumida por Axios |

Vite incorpora esta variable en tiempo de compilación. Si compila para producción con otra URL, defínala antes de `npm run build`.

---

## 7. Scripts disponibles

Ejecute todos desde la raíz del repositorio.

| Script                    | Acción                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`             | Inicia API en modo watch y frontend Vite en paralelo                              |
| `npm run dev:backend`     | Inicia solo la API                                                                |
| `npm run dev:frontend`    | Inicia solo el frontend                                                           |
| `npm run build`           | Compila backend y frontend para producción                                        |
| `npm run db:up`           | Levanta PostgreSQL con Docker Compose y espera el health check                    |
| `npm run db:down`         | Detiene los contenedores sin borrar el volumen                                    |
| `npm run db:reset`        | **Borra la base**, la recrea, genera Prisma, migra y siembra                      |
| `npm run db:setup`        | Genera Prisma, aplica migraciones y ejecuta el seed                               |
| `npm run db:deploy`       | Aplica migraciones existentes sin generar nuevas                                  |
| `npm run db:migrate`      | Crea/aplica una migración de desarrollo con Prisma Migrate                        |
| `npm run db:seed`         | Carga o actualiza los datos demo                                                  |
| `npm run db:studio`       | Abre Prisma Studio                                                                |
| `npm run prisma:generate` | Regenera el cliente Prisma                                                        |
| `npm test`                | Ejecuta las pruebas unitarias de backend y frontend                               |
| `npm run test:backend`    | Ejecuta solo las pruebas unitarias del backend                                    |
| `npm run test:frontend`   | Ejecuta solo las pruebas unitarias del frontend                                   |
| `npm run test:e2e`        | Ejecuta las pruebas E2E de humo con Playwright                                    |
| `npm run lint`            | Ejecuta ESLint sobre backend y frontend                                           |
| `npm run check:env`       | Verifica que las plantillas `.env.example` existan y tengan las claves requeridas |

> `npm run db:reset` es destructivo: elimina el volumen de PostgreSQL y todos los datos.

---

## 8. Modelo de datos

```mermaid
erDiagram
    USUARIOS ||--o{ ALQUILERES : registra
    USUARIOS ||--o{ DEVOLUCIONES : inspecciona
    CLIENTES ||--o{ ALQUILERES : solicita
    CATEGORIAS ||--o{ IMPLEMENTOS : agrupa
    IMPLEMENTOS ||--o{ DETALLE_ALQUILERES : incluido
    ALQUILERES ||--|{ DETALLE_ALQUILERES : contiene
    ALQUILERES ||--o| DEVOLUCIONES : genera
    DEVOLUCIONES ||--|{ DETALLE_DEVOLUCIONES : registra
    IMPLEMENTOS ||--o{ DETALLE_DEVOLUCIONES : retorna

    USUARIOS {
        int id PK
        string nombre
        string email UK
        string password_hash
        enum rol
        boolean activo
        datetime created_at
    }

    CLIENTES {
        int id PK
        string documento_identidad UK
        string nombres
        string apellidos
        string telefono
        string correo
        string direccion
    }

    CATEGORIAS {
        int id PK
        string nombre UK
        string descripcion
    }

    IMPLEMENTOS {
        int id PK
        string codigo_serie UK
        string nombre
        int categoria_id FK
        decimal precio_alquiler_diario
        enum estado
    }

    ALQUILERES {
        int id PK
        string codigo_alquiler UK
        int cliente_id FK
        int usuario_id FK
        datetime fecha_alquiler
        datetime fecha_pactada_devolucion
        enum estado
        text observaciones
    }

    DETALLE_ALQUILERES {
        int id PK
        int alquiler_id FK
        int implemento_id FK
        decimal precio_unitario
    }

    DEVOLUCIONES {
        int id PK
        int alquiler_id FK_UK
        int usuario_id FK
        datetime fecha_devolucion
        string estado_entrega_implementos
        text observaciones
    }

    DETALLE_DEVOLUCIONES {
        int id PK
        int devolucion_id FK
        int implemento_id FK
        enum estado_final
        string observaciones
    }
```

### Estados

| Entidad                         | Valores                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `Usuario.rol`                   | `ADMIN`, `EMPLEADO`                                             |
| `Implemento.estado`             | `DISPONIBLE`, `ALQUILADO`, `MANTENIMIENTO`, `FUERA_DE_SERVICIO` |
| `Alquiler.estado`               | `ACTIVO`, `FINALIZADO`, `VENCIDO`                               |
| `DetalleDevolucion.estadoFinal` | `DISPONIBLE`, `MANTENIMIENTO`, `FUERA_DE_SERVICIO`              |

### Reglas de negocio

1. Solo se puede alquilar un implemento en estado `DISPONIBLE`.
2. El estado `ALQUILADO` no puede asignarse manualmente: lo establece la creación del alquiler.
3. La creación del alquiler y el cambio de estados del inventario ocurren en una transacción `Serializable`; si la disponibilidad cambia durante la operación, se responde `409 Conflict`.
4. Un alquiler solo puede tener una devolución.
5. La devolución debe incluir exactamente todos los implementos del alquiler.
6. Al registrar la devolución, el alquiler pasa a `FINALIZADO` y cada implemento adopta el estado final inspeccionado.
7. Un alquiler activo con fecha pactada anterior al día actual (en `APP_TIMEZONE`) se presenta como `VENCIDO`. Las consultas no escriben en la base de datos; `StatusSyncService` sincroniza el estado guardado al iniciar y cada 15 minutos.
8. La factura se emite con los días pactados y se liquida con los días reales al registrar la devolución (mínimo 1 día), descontando los pagos. El reporte de ingresos usa la misma regla.
9. No se puede eliminar un cliente con alquileres, una categoría con implementos ni un implemento con historial de alquileres.
10. Debe existir al menos un administrador activo; un administrador no puede desactivar su propia cuenta.
11. Los códigos de alquiler se generan con el formato `ALQ-YYYYMMDD-00001`.

---

## 9. Roles y permisos

| Recurso / acción                      | `ADMIN` | `EMPLEADO` |
| ------------------------------------- | :-----: | :--------: |
| Dashboard y reportes                  |   ✅    |     ❌     |
| Consultar inventario y disponibilidad |   ✅    |     ✅     |
| Crear, editar y eliminar implementos  |   ✅    |     ❌     |
| Consultar y gestionar clientes        |   ✅    |     ✅     |
| Eliminar clientes                     |   ✅    |     ❌     |
| Crear y consultar alquileres          |   ✅    |     ✅     |
| Registrar y consultar devoluciones    |   ✅    |     ✅     |
| Gestionar categorías                  |   ✅    |     ❌     |
| Gestionar usuarios                    |   ✅    |     ❌     |

El frontend oculta las secciones no permitidas y el backend aplica `JwtAuthGuard` y `RolesGuard` de forma global.

---

## 10. Uso con PostgreSQL local

Si no tiene Docker, instale PostgreSQL 16 y cree el usuario y la base de datos:

```sql
CREATE ROLE inventario LOGIN PASSWORD 'inventario123';
CREATE DATABASE inventario_db OWNER inventario;
```

Luego ajuste `DATABASE_URL` en `backend/.env` y ejecute:

```powershell
npm install
npm run db:setup
npm run dev
```

`db:setup` genera el cliente Prisma, aplica la migración inicial y carga los datos demo.

### 10.1 Instalación local en Windows sin Docker

En este equipo, PostgreSQL 16.14 quedó instalado en `%LOCALAPPDATA%\ObraGest` y se inicia automáticamente al iniciar sesión mediante la tarea programada `ObraGest PostgreSQL`. La base de datos se ejecuta en `localhost:5432`.

Para iniciar, detener o consultar el estado manualmente:

```powershell
& "$env:LOCALAPPDATA\ObraGest\start-postgres.ps1"
& "$env:LOCALAPPDATA\ObraGest\stop-postgres.ps1"
& "$env:LOCALAPPDATA\ObraGest\status-postgres.ps1"
```

Con este entorno ya configurado no es necesario ejecutar `npm run db:up`; basta con iniciar la aplicación:

```powershell
npm run dev
```

> Si la API reporta `P1001`, ejecute `status-postgres.ps1`; si la base no responde, ejecute `start-postgres.ps1`. Los registros quedan en `%LOCALAPPDATA%\ObraGest\logs\postgresql-AAAA-MM-DD.log`.
>
> Mantenga una sola instancia de `npm run dev`. La API usa el puerto `4000` y el frontend el `5173`; si esos puertos están ocupados, cierre la instancia anterior antes de iniciar otra.

---

## 11. API

- URL base local: `http://localhost:4000/api`
- Autenticación: `Authorization: Bearer <accessToken>`
- Todas las rutas requieren token salvo `POST /auth/login` y `GET /health`.
- Los listados paginados responden con `{ data, total, page, pageSize, totalPages }`.
- Los listados simples responden con `{ data, total }`.
- Los errores usan el formato estándar de NestJS: `{ statusCode, message, error }`.

### 11.1 Endpoints

| Método   | Ruta                                                          | Rol         | Descripción                               |
| -------- | ------------------------------------------------------------- | ----------- | ----------------------------------------- |
| `GET`    | `/health`                                                     | Público     | Estado del servicio                       |
| `POST`   | `/auth/login`                                                 | Público     | Inicio de sesión                          |
| `GET`    | `/auth/me`                                                    | Autenticado | Perfil del usuario actual                 |
| `PATCH`  | `/auth/password`                                              | Autenticado | Cambio de contraseña                      |
| `GET`    | `/users`                                                      | `ADMIN`     | Listar usuarios                           |
| `GET`    | `/users/:id`                                                  | `ADMIN`     | Consultar usuario                         |
| `POST`   | `/users`                                                      | `ADMIN`     | Crear usuario                             |
| `PATCH`  | `/users/:id`                                                  | `ADMIN`     | Editar rol, estado, datos o contraseña    |
| `GET`    | `/clients?search=`                                            | Autenticado | Buscar/listar clientes                    |
| `GET`    | `/clients/:id`                                                | Autenticado | Consultar cliente                         |
| `POST`   | `/clients`                                                    | Autenticado | Crear cliente                             |
| `PATCH`  | `/clients/:id`                                                | Autenticado | Editar cliente                            |
| `DELETE` | `/clients/:id`                                                | `ADMIN`     | Eliminar cliente sin alquileres           |
| `GET`    | `/categories`                                                 | Autenticado | Listar categorías                         |
| `GET`    | `/categories/:id`                                             | Autenticado | Consultar categoría                       |
| `POST`   | `/categories`                                                 | `ADMIN`     | Crear categoría                           |
| `PATCH`  | `/categories/:id`                                             | `ADMIN`     | Editar categoría                          |
| `DELETE` | `/categories/:id`                                             | `ADMIN`     | Eliminar categoría sin implementos        |
| `GET`    | `/items?search=&estado=&categoriaId=&page=&pageSize=`         | Autenticado | Listar/filtrar inventario                 |
| `GET`    | `/items/available`                                            | Autenticado | Implementos disponibles                   |
| `GET`    | `/items/groups?search=&estado=&categoriaId=&page=`            | Autenticado | Inventario agrupado por tipo con stock    |
| `PATCH`  | `/items/group`                                                | `ADMIN`     | Editar todas las unidades de un tipo      |
| `DELETE` | `/items/group?categoriaId=&nombre=`                           | `ADMIN`     | Eliminar un tipo (todo o nada)            |
| `POST`   | `/items/group/image` (multipart: categoriaId, nombre, imagen) | `ADMIN`     | Subir o reemplazar la imagen del tipo     |
| `DELETE` | `/items/group/image?categoriaId=&nombre=`                     | `ADMIN`     | Volver a la ilustración por defecto       |
| `GET`    | `/settings`                                                   | Público     | Apariencia (tema, color, letra, carrusel) |
| `PUT`    | `/settings`                                                   | `ADMIN`     | Guardar la apariencia                     |
| `POST`   | `/settings/login-image` · `/settings/images`                  | `ADMIN`     | Subir imagen del login o de un artículo   |
| `GET`    | `/items/:id`                                                  | Autenticado | Consultar implemento                      |
| `POST`   | `/items`                                                      | `ADMIN`     | Crear implemento                          |
| `PATCH`  | `/items/:id`                                                  | `ADMIN`     | Editar implemento                         |
| `DELETE` | `/items/:id`                                                  | `ADMIN`     | Eliminar implemento sin historial         |
| `GET`    | `/rentals?search=&estado=&page=&pageSize=`                    | Autenticado | Listar alquileres                         |
| `GET`    | `/rentals/:id`                                                | Autenticado | Detalle de alquiler y devolución          |
| `POST`   | `/rentals`                                                    | Autenticado | Registrar alquiler                        |
| `GET`    | `/returns/pending`                                            | Autenticado | Alquileres pendientes de devolución       |
| `GET`    | `/returns?search=&page=&pageSize=`                            | Autenticado | Historial de devoluciones                 |
| `GET`    | `/returns/:id`                                                | Autenticado | Detalle de devolución                     |
| `POST`   | `/returns`                                                    | Autenticado | Registrar devolución                      |
| `GET`    | `/reports/dashboard`                                          | `ADMIN`     | KPIs del panel                            |
| `GET`    | `/reports/inventory-summary`                                  | `ADMIN`     | Inventario agrupado por estado            |
| `GET`    | `/reports/top-items?limit=10`                                 | `ADMIN`     | Implementos más alquilados                |
| `GET`    | `/reports/active-rentals`                                     | `ADMIN`     | Alquileres activos y vencidos             |
| `GET`    | `/reports/revenue/daily?days=14`                              | `ADMIN`     | Ingresos diarios de los últimos días      |
| `GET`    | `/reports/revenue/monthly?year=2026`                          | `ADMIN`     | Ingresos totales agrupados por mes        |

> Los ingresos se calculan con la tarifa diaria congelada en cada alquiler y los días del período. Para alquileres finalizados se usa la fecha real de devolución; para los que siguen en curso se calcula hasta el día actual.

### 11.2 Ejemplo de login y alquiler (PowerShell)

```powershell
$api = "http://localhost:4000/api"

$login = Invoke-RestMethod -Method Post -Uri "$api/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = "empleado@obragest.local"
    password = "Empleado123*"
  } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.accessToken)" }

# Cliente demo
$client = (Invoke-RestMethod -Uri "$api/clients?search=CC-10324567" -Headers $headers).data[0]

# Primer implemento disponible
$item = (Invoke-RestMethod -Uri "$api/items/available" -Headers $headers).data |
  Select-Object -First 1

$body = @{
  clienteId = $client.id
  fechaPactadaDevolucion = [DateTime]::UtcNow.AddDays(7).ToString("yyyy-MM-ddT12:00:00.000Z")
  observaciones = "Entrega en obra"
  implementos = @(
    @{ implementoId = $item.id }
  )
} | ConvertTo-Json -Depth 5

$rental = Invoke-RestMethod -Method Post -Uri "$api/rentals" `
  -Headers $headers -ContentType "application/json" -Body $body

$rental | ConvertTo-Json -Depth 6
```

### 11.3 Ejemplo de devolución

```powershell
$body = @{
  alquilerId = $rental.id
  observaciones = "Recibido en obra"
  implementos = @(
    @{
      implementoId = $item.id
      estadoFinal = "DISPONIBLE"
      observaciones = "Sin novedades"
    }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri "$api/returns" `
  -Headers $headers -ContentType "application/json" -Body $body |
  ConvertTo-Json -Depth 6
```

Valores permitidos en `estadoFinal`: `DISPONIBLE`, `MANTENIMIENTO`, `FUERA_DE_SERVICIO`.

### 11.4 Ejemplo de reporte (administrador)

```powershell
$admin = Invoke-RestMethod -Method Post -Uri "$api/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = "admin@obragest.local"
    password = "Admin123*"
  } | ConvertTo-Json)

$adminHeaders = @{ Authorization = "Bearer $($admin.accessToken)" }
Invoke-RestMethod -Uri "$api/reports/dashboard" -Headers $adminHeaders |
  ConvertTo-Json -Depth 8
```

---

## 12. Datos demo

El seed es idempotente y crea:

- 2 usuarios: administrador y empleado.
- 5 categorías: herramientas eléctricas, maquinaria ligera, andamios y acceso, equipos de medición y seguridad industrial.
- 12 implementos con códigos `HERR-*`, `MAQ-*`, `AND-*`, `MED-*` y `SEG-*`.
- 3 clientes de ejemplo.
- 3 alquileres:
  - `ALQ-DEMO-0001`: activo.
  - `ALQ-DEMO-0002`: vencido, para probar el estado automático.
  - `ALQ-DEMO-0003`: finalizado, con devolución registrada.
- 3 facturas: `FAC-DEMO-0001` pendiente, `FAC-DEMO-0002` vencida y `FAC-DEMO-0003` pagada. El cliente `CC-10324567` tiene saldo pendiente, por lo que un nuevo alquiler para él exige autorización de ADMIN.

Los alquileres demo solo se crean si la tabla de alquileres está vacía. Volver a ejecutar el seed no duplica operaciones.

---

## 13. Flujo de prueba sugerido

1. Inicie sesión como administrador y revise el panel y los reportes.
2. Cierre sesión e ingrese como empleado.
3. Consulte el inventario y filtre por estado o categoría.
4. Cree o edite un cliente.
5. Registre un alquiler con uno o varios implementos disponibles.
6. Verifique que los implementos pasan a `ALQUILADO` y que ya no aparecen en disponibilidad.
7. Intente alquilar nuevamente el mismo implemento: debe recibir `409 Conflict`.
8. Vaya a **Devoluciones**, abra el alquiler pendiente y registre la inspección por equipo.
9. Verifique que el alquiler queda `FINALIZADO` y que el inventario refleja los estados finales.
10. Ingrese como administrador y confirme que el dashboard y los reportes se actualizaron.
11. Abra el detalle de un alquiler o los reportes y use **Imprimir** para validar la vista de impresión.

---

## 14. Build y producción

```powershell
npm run build
```

Resultados:

- `backend/dist/`: aplicación NestJS compilada.
- `frontend/dist/`: SPA estática.

Ejecución del backend compilado:

```powershell
$env:NODE_ENV = "production"
node backend/dist/main.js
```

Antes de desplegar:

1. Use un `JWT_SECRET` largo y aleatorio.
2. Cambie las credenciales demo y la contraseña de PostgreSQL.
3. Configure `FRONTEND_URL` con el dominio real.
4. Ejecute `npm run db:deploy` (nunca `migrate dev` en producción).
5. Sirva `frontend/dist/` con un servidor estático y configure fallback SPA hacia `index.html`.
6. Publique la API detrás de HTTPS y un proxy inverso.
7. Defina `VITE_API_URL` con la URL pública de la API antes de compilar el frontend.
8. Monte `UPLOADS_DIR` en un volumen persistente con copia de seguridad: allí quedan las imágenes subidas.

---

## 15. Seguridad y validaciones

- Contraseñas almacenadas con bcrypt (10 rondas); nunca se devuelve `passwordHash` en las respuestas.
- JWT con vigencia configurable y verificación del usuario activo en cada petición.
- Guards globales de autenticación y roles.
- Validación estricta de DTOs con `class-validator` (`whitelist` y `forbidNonWhitelisted`).
- Helmet y CORS restringido a los orígenes configurados.
- Transacciones `Serializable` y actualización condicional para evitar sobrealquiler.
- Restricciones de integridad en base de datos: claves únicas, claves foráneas y una devolución por alquiler.
- Historial auditable mediante alquileres, devoluciones, detalles y marcas de tiempo.
- `npm audit --omit=dev` no reporta vulnerabilidades en dependencias de producción.
- Las 3 alertas moderadas restantes de `npm audit` pertenecen a la cadena de herramientas de desarrollo de Tailwind CSS/PostCSS y no se incluyen en el bundle de producción. Se recomienda migrar a Tailwind CSS 4 en una actualización mayor planificada.

### Estado de validación

Validación del 2026-11-17 (evidencia en `docs/qa/evidencias/etapa-4-5/` e informe en `docs/qa/05-evaluacion-calidad-iso25010.md`):

- `npm run build` compila backend y frontend sin errores; el JS inicial pasó de más de 500 kB a 381 kB gracias a la carga diferida de rutas.
- `npm test`: 68 pruebas unitarias de backend y 29 de frontend aprobadas.
- `npm run test:e2e --workspace backend`: 32 pruebas de API aprobadas (Etapas 2 a 6).
- `npm run test:e2e`: 21 pruebas Playwright aprobadas en Chrome (humo y Etapas 2 a 6).
- `npm run lint` y `prettier --check` finalizan sin errores.
- `/api/health` responde `503` con PostgreSQL detenido y `200` al restablecerlo.

## 16. Solución de problemas

### Docker no está instalado o no está en PATH

Instale Docker Desktop, ábralo y verifique:

```powershell
docker --version
docker compose version
```

`db:up` usa `docker compose up -d --wait`. Si su versión de Compose no admite `--wait`, ejecute `docker compose up -d` y espere a que el contenedor esté saludable con `docker compose ps`.

### El puerto 5432 está ocupado

Cambie el puerto en el `.env` raíz:

```env
POSTGRES_PORT=5433
```

Y actualice `DATABASE_URL` en `backend/.env` con el nuevo puerto.

### Error `P1001`: no se puede conectar a la base de datos

- Confirme que el contenedor está en ejecución: `docker compose ps`.
- Revise los logs: `docker compose logs postgres`.
- Verifique que `DATABASE_URL`, usuario, contraseña, puerto y nombre de la base coinciden.

### Prisma no encuentra el archivo `.env`

Ejecute los comandos de Prisma desde `backend/` o use los scripts de la raíz, que ya apuntan al workspace correcto.

### Error `P3009` por una migración fallida

En desarrollo, la forma más rápida de recuperar un entorno limpio es:

```powershell
npm run db:reset
```

Esto elimina todos los datos y vuelve a crear la base con el seed.

### Error `EADDRINUSE` en 4000 o 5173

Cierre el proceso que ocupa el puerto o cambie `PORT` en `backend/.env` y `VITE_API_URL` en `frontend/.env`. Recuerde agregar el nuevo origen del frontend a `FRONTEND_URL`.

### Error de CORS

Asegúrese de que el origen exacto del frontend (incluido puerto y esquema) esté en `FRONTEND_URL`. Se admiten varios orígenes separados por coma:

```env
FRONTEND_URL=http://localhost:5173,http://localhost:4173
```

### El frontend muestra “No se pudo conectar con el servidor”

- Verifique que la API esté en ejecución.
- Abra `http://localhost:4000/api/health`.
- Revise `VITE_API_URL` y reinicie Vite si la cambió.

### El cliente Prisma no existe o está desactualizado

```powershell
npm run prisma:generate
```

### Error `EPERM` al ejecutar `prisma generate` en Windows

Si la API está en ejecución, el motor de Prisma puede mantener bloqueado el archivo `query_engine-windows.dll.node`. Detenga el proceso de la API con `Ctrl+C`, cierre cualquier proceso de Node o IDE que tenga cargado el cliente y vuelva a ejecutar:

```powershell
npm run prisma:generate
```

### Sesión inválida después de cambiar el JWT o recrear la base

Cierre sesión y vuelva a iniciar. Si cambió `JWT_SECRET`, todos los tokens anteriores quedan inválidos por diseño.

---

## 17. Alcance y limitaciones

Incluido:

- Inventario, clientes, alquileres, devoluciones, usuarios, categorías y reportes.
- Autenticación y autorización por roles.
- Historial auditable y actualización automática de vencidos.

Fuera de alcance:

- Pagos en línea.
- Integraciones contables o bancarias.
- Rastreo GPS de equipos.
- Reservas anticipadas o múltiples bodegas.
- Tokens de refresco y revocación distribuida de sesiones.
- Carga de archivos o fotografías de equipos.
