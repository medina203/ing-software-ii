# Guía de despliegue en Railway

Esta guía publica el sistema en internet con **Railway**, plan **Hobby (5 USD al mes,
con 5 USD de consumo incluidos)**. Al final tendrás una dirección del tipo
`https://tu-negocio.up.railway.app` que funciona en el PC y en el celular.

## Cómo queda montado

```
                 Railway (un proyecto)
 ┌──────────────────────────────────────────────┐
 │  Servicio "web" (Dockerfile del repositorio) │
 │   • página web (frontend)                    │
 │   • API  /api                                │
 │   • fotos subidas /uploads ──► Volumen /data │
 │                 │                            │
 │                 ▼ red privada                │
 │  Servicio "Postgres" (base de datos)         │
 └──────────────────────────────────────────────┘
```

- **Un solo servicio** para todo: menos memoria y por lo tanto menos costo.
- El servicio **nunca se apaga**: la tarea que marca los alquileres vencidos y suma
  los días de retraso corre cada 15 minutos.
- Las **fotos** se guardan en un volumen, así que no se pierden al actualizar.
- Cada vez que se fusiona algo en `main`, Railway reconstruye y publica solo.
- Al arrancar se aplican las migraciones de la base de datos automáticamente.

---

## 1. Crear la cuenta y el proyecto

1. Entra a <https://railway.com> y regístrate con tu cuenta de **GitHub**
   (la misma que tiene el repositorio `medina203/ing-software-ii`).
2. Activa el plan **Hobby** en _Workspace → Plans_ y registra la tarjeta.
3. Pulsa **New Project → Deploy from GitHub repo** y elige `ing-software-ii`.
   Si no aparece, pulsa _Configure GitHub App_ y dale acceso a ese repositorio.
4. Railway detecta el `Dockerfile` de la raíz y empieza a construir. **El primer
   despliegue fallará**: todavía no hay base de datos ni variables. Es normal.

## 2. Agregar la base de datos

1. Dentro del proyecto pulsa **+ Create → Database → PostgreSQL**.
2. Espera a que el servicio _Postgres_ quede en verde.

## 3. Agregar el volumen para las fotos

1. Haz clic derecho sobre el servicio del sistema (el que tiene el nombre del
   repositorio) → **Attach volume** (o _+ Create → Volume_ y conéctalo a ese servicio).
2. En **Mount path** escribe exactamente: `/data`

## 4. Configurar las variables

Abre el servicio del sistema → pestaña **Variables** → **Raw Editor** y pega esto,
cambiando los valores marcados:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=4000
JWT_SECRET=PEGA_AQUI_UN_SECRETO_LARGO
ADMIN_NAME=Nombre del dueño
ADMIN_EMAIL=correo-del-dueno@ejemplo.com
ADMIN_PASSWORD=UnaClaveSegura2026
```

- **`DATABASE_URL`**: se escribe tal cual, con las llaves. Railway la reemplaza por la
  conexión privada a la base de datos (si tu servicio de base de datos tiene otro
  nombre, cambia `Postgres` por ese nombre).
- **`PORT`**: puerto en el que escucha el sistema; debe coincidir con el del dominio
  (paso 5).
- **`JWT_SECRET`**: firma las sesiones. Debe tener **32 caracteres o más** y ser
  solo tuyo; con el valor de ejemplo del proyecto el sistema **no arranca** a
  propósito. Para generarlo, en la terminal de tu PC:

  ```powershell
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

- **`ADMIN_EMAIL` / `ADMIN_PASSWORD`**: crean el primer administrador **solo si la
  base de datos está vacía**. Después puedes cambiar la contraseña desde el sistema;
  estas variables no la vuelven a tocar.

Las demás variables ya vienen en el `Dockerfile` (`NODE_ENV=production`,
`TZ=America/Bogota`, `APP_TIMEZONE=America/Bogota`, `UPLOADS_DIR=/data/uploads`,
`FRONTEND_DIST`). Pulsa **Deploy** para aplicar los cambios.

## 5. Ajustes del servicio

En el servicio del sistema → **Settings**:

1. **Networking → Generate Domain**. Cuando pregunte el puerto, escribe `4000`.
   Ahí aparece la dirección pública (`https://….up.railway.app`).
2. **Deploy → Healthcheck Path**: `/api/health`. Así Railway solo publica una versión
   nueva cuando responde bien, y si algo falla deja funcionando la anterior.
3. **Deploy → Region**: elige la región de Estados Unidos más al este que ofrezca
   (la más cercana a Colombia).
4. Verifica que **Serverless / App Sleeping** esté **desactivado**: el sistema debe
   quedar siempre encendido.

## 6. Comprobar que funciona

1. En **Deployments** el último despliegue debe quedar en **Active** (verde).
   En **View logs** deben aparecer las líneas:
   - `Administrador inicial creado: …`
   - `Frontend servido desde /app/frontend/dist`
2. Abre `https://<tu-dominio>/api/health`: debe responder `"status":"ok"` y
   `"database":"up"`.
3. Abre `https://<tu-dominio>` e inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
4. Crea una categoría, un implemento y súbele una foto. Pulsa **Redeploy** y comprueba
   que la foto sigue ahí (confirma que el volumen quedó bien montado).

## 7. Controlar el gasto

En **Workspace → Usage → Set Usage Limits**:

- **Custom email alert**: `5` → te avisa por correo si el consumo pasa lo incluido.
- **Hard limit**: es opcional. El mínimo es **10 USD** y, si se alcanza, Railway
  **apaga el sistema** hasta el siguiente mes o hasta que subas el límite. Para un
  negocio en funcionamiento es mejor solo la alerta.

Con un solo servicio y pocos usuarios el consumo suele quedar cerca de lo incluido
en el plan; revisa _Usage_ la primera semana para confirmarlo.

---

## Para la presentación: cargar datos de demostración (opcional)

El sistema arranca vacío (solo con tu administrador). Si para la presentación quieres
los clientes, implementos y alquileres de ejemplo:

1. En Railway, servicio **Postgres → Variables**, copia el valor de
   `DATABASE_PUBLIC_URL`.
2. En tu PC, dentro de la carpeta del proyecto:

   ```powershell
   $env:DATABASE_URL = "<pega aquí DATABASE_PUBLIC_URL>"
   npm run db:seed
   Remove-Item Env:DATABASE_URL
   ```

> ⚠️ Los datos de demostración incluyen usuarios con contraseñas conocidas
> (`admin@obragest.local / Admin123*`, `empleado@obragest.local / Empleado123*`).
> **No los dejes en el sistema real del negocio.**

### Después de la presentación: dejar la base de datos limpia para el negocio

1. En Railway borra el servicio **Postgres** (_Settings → Danger → Delete service_)
   y crea uno nuevo (**+ Create → Database → PostgreSQL**).
2. Si el nuevo servicio tiene otro nombre, actualiza `DATABASE_URL` en las variables
   del sistema.
3. Pulsa **Redeploy**. El sistema crea las tablas y tu administrador desde cero.

---

## Actualizar el sistema

No hay que hacer nada en Railway: cada vez que fusionas un pull request en `main`,
Railway construye y publica la nueva versión, y aplica las migraciones al arrancar.
Si algo sale mal, en **Deployments** puedes pulsar **Redeploy** sobre una versión
anterior para volver atrás.

## Copias de seguridad

- **Base de datos**: revisa en _Postgres → Backups_ si tu plan permite programar
  respaldos automáticos; si es así, actívalos (por ejemplo, diarios).
- **Copia manual** desde tu PC (requiere PostgreSQL instalado):

  ```powershell
  pg_dump "<DATABASE_PUBLIC_URL>" -Fc -f respaldo-AAAA-MM-DD.dump
  ```

## Problemas frecuentes

| Síntoma en los logs                                                        | Causa y solución                                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET usa el valor de ejemplo` o `debe tener al menos 32 caracteres` | Genera un secreto nuevo (paso 4) y guárdalo en `JWT_SECRET`.                                                |
| `Can't reach database server` / `P1001`                                    | `DATABASE_URL` mal escrita o el servicio Postgres no está activo. Debe ser `${{Postgres.DATABASE_URL}}`.    |
| `Defina ADMIN_EMAIL y ADMIN_PASSWORD juntos`                               | Falta una de las dos variables o la clave tiene menos de 8 caracteres.                                      |
| El despliegue queda en _Healthcheck failed_                                | Revisa los logs: casi siempre es una de las tres anteriores.                                                |
| Las fotos desaparecen al actualizar                                        | El volumen no está conectado o su _Mount path_ no es `/data`.                                               |
| No puedo iniciar sesión con `ADMIN_EMAIL`                                  | La base de datos ya tenía usuarios (por ejemplo, los de demostración), así que no se creó el administrador. |
