-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "EstadoImplemento" AS ENUM ('DISPONIBLE', 'ALQUILADO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoAlquiler" AS ENUM ('ACTIVO', 'FINALIZADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('DISPONIBLE', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'EMPLEADO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "documento_identidad" VARCHAR(30) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "correo" VARCHAR(160),
    "direccion" VARCHAR(220),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(250),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "implementos" (
    "id" SERIAL NOT NULL,
    "codigo_serie" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(140) NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "descripcion" VARCHAR(300),
    "precio_alquiler_diario" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoImplemento" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "implementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alquileres" (
    "id" SERIAL NOT NULL,
    "codigo_alquiler" VARCHAR(40) NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_alquiler" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_pactada_devolucion" TIMESTAMPTZ(6) NOT NULL,
    "estado" "EstadoAlquiler" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alquileres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_alquileres" (
    "id" SERIAL NOT NULL,
    "alquiler_id" INTEGER NOT NULL,
    "implemento_id" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_alquileres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" SERIAL NOT NULL,
    "alquiler_id" INTEGER NOT NULL,
    "fecha_devolucion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" INTEGER NOT NULL,
    "estado_entrega_implementos" VARCHAR(100) NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_devoluciones" (
    "id" SERIAL NOT NULL,
    "devolucion_id" INTEGER NOT NULL,
    "implemento_id" INTEGER NOT NULL,
    "estado_final" "EstadoEntrega" NOT NULL,
    "observaciones" VARCHAR(300),

    CONSTRAINT "detalle_devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rol_activo_idx" ON "usuarios"("rol", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_identidad_key" ON "clientes"("documento_identidad");

-- CreateIndex
CREATE INDEX "clientes_apellidos_nombres_idx" ON "clientes"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "implementos_codigo_serie_key" ON "implementos"("codigo_serie");

-- CreateIndex
CREATE INDEX "implementos_estado_idx" ON "implementos"("estado");

-- CreateIndex
CREATE INDEX "implementos_categoria_id_idx" ON "implementos"("categoria_id");

-- CreateIndex
CREATE INDEX "implementos_nombre_idx" ON "implementos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "alquileres_codigo_alquiler_key" ON "alquileres"("codigo_alquiler");

-- CreateIndex
CREATE INDEX "alquileres_estado_fecha_pactada_devolucion_idx" ON "alquileres"("estado", "fecha_pactada_devolucion");

-- CreateIndex
CREATE INDEX "alquileres_cliente_id_idx" ON "alquileres"("cliente_id");

-- CreateIndex
CREATE INDEX "alquileres_usuario_id_idx" ON "alquileres"("usuario_id");

-- CreateIndex
CREATE INDEX "alquileres_fecha_alquiler_idx" ON "alquileres"("fecha_alquiler");

-- CreateIndex
CREATE INDEX "detalle_alquileres_implemento_id_idx" ON "detalle_alquileres"("implemento_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_alquileres_alquiler_id_implemento_id_key" ON "detalle_alquileres"("alquiler_id", "implemento_id");

-- CreateIndex
CREATE UNIQUE INDEX "devoluciones_alquiler_id_key" ON "devoluciones"("alquiler_id");

-- CreateIndex
CREATE INDEX "devoluciones_fecha_devolucion_idx" ON "devoluciones"("fecha_devolucion");

-- CreateIndex
CREATE INDEX "devoluciones_usuario_id_idx" ON "devoluciones"("usuario_id");

-- CreateIndex
CREATE INDEX "detalle_devoluciones_implemento_id_idx" ON "detalle_devoluciones"("implemento_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_devoluciones_devolucion_id_implemento_id_key" ON "detalle_devoluciones"("devolucion_id", "implemento_id");

-- AddForeignKey
ALTER TABLE "implementos" ADD CONSTRAINT "implementos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alquileres" ADD CONSTRAINT "alquileres_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alquileres" ADD CONSTRAINT "alquileres_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_alquileres" ADD CONSTRAINT "detalle_alquileres_alquiler_id_fkey" FOREIGN KEY ("alquiler_id") REFERENCES "alquileres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_alquileres" ADD CONSTRAINT "detalle_alquileres_implemento_id_fkey" FOREIGN KEY ("implemento_id") REFERENCES "implementos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_alquiler_id_fkey" FOREIGN KEY ("alquiler_id") REFERENCES "alquileres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_devoluciones" ADD CONSTRAINT "detalle_devoluciones_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_devoluciones" ADD CONSTRAINT "detalle_devoluciones_implemento_id_fkey" FOREIGN KEY ("implemento_id") REFERENCES "implementos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

