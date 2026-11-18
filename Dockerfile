# Imagen de producción: un solo servicio que entrega la API (/api), las fotos
# subidas (/uploads) y el frontend compilado. Pensada para Railway, pero sirve
# en cualquier servidor con Docker.

# ---------- 1. Compilación ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma necesita OpenSSL para su motor de consultas.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Primero solo los manifiestos para aprovechar la caché de dependencias.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --no-audit --no-fund

COPY backend backend
COPY frontend frontend

# Sin VITE_API_URL el frontend llama a /api en el mismo dominio.
RUN npm run prisma:generate \
    && npm run build --workspace backend \
    && npm run build --workspace frontend

# ---------- 2. Ejecución ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    TZ=America/Bogota \
    APP_TIMEZONE=America/Bogota \
    FRONTEND_DIST=/app/frontend/dist \
    UPLOADS_DIR=/data/uploads

# node_modules incluye la CLI de Prisma, necesaria para aplicar migraciones al arrancar.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
# Carpeta backend completa (dist, prisma y node_modules propios si npm creó alguno).
COPY --from=build /app/backend backend
COPY --from=build /app/frontend/dist frontend/dist

RUN mkdir -p /data/uploads

WORKDIR /app/backend
EXPOSE 4000

# Aplica las migraciones pendientes y arranca la API.
CMD ["npm", "run", "start:deploy"]
