-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO');

-- AlterTable
ALTER TABLE "devoluciones" ADD COLUMN     "alerta_cartera" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saldo_cartera_alerta" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "facturas" (
    "id" SERIAL NOT NULL,
    "codigo_factura" VARCHAR(40) NOT NULL,
    "alquiler_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "fecha_emision" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMPTZ(6) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "referencia" VARCHAR(120),
    "fecha_pago" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autorizaciones_cartera" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "alquiler_id" INTEGER,
    "usuario_solicitante_id" INTEGER NOT NULL,
    "administrador_id" INTEGER NOT NULL,
    "saldo_pendiente" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autorizaciones_cartera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facturas_codigo_factura_key" ON "facturas"("codigo_factura");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_alquiler_id_key" ON "facturas"("alquiler_id");

-- CreateIndex
CREATE INDEX "facturas_cliente_id_estado_idx" ON "facturas"("cliente_id", "estado");

-- CreateIndex
CREATE INDEX "facturas_fecha_vencimiento_estado_idx" ON "facturas"("fecha_vencimiento", "estado");

-- CreateIndex
CREATE INDEX "pagos_factura_id_fecha_pago_idx" ON "pagos"("factura_id", "fecha_pago");

-- CreateIndex
CREATE INDEX "pagos_usuario_id_idx" ON "pagos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "autorizaciones_cartera_alquiler_id_key" ON "autorizaciones_cartera"("alquiler_id");

-- CreateIndex
CREATE INDEX "autorizaciones_cartera_cliente_id_created_at_idx" ON "autorizaciones_cartera"("cliente_id", "created_at");

-- CreateIndex
CREATE INDEX "autorizaciones_cartera_factura_id_idx" ON "autorizaciones_cartera"("factura_id");

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_alquiler_id_fkey" FOREIGN KEY ("alquiler_id") REFERENCES "alquileres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_cartera" ADD CONSTRAINT "autorizaciones_cartera_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_cartera" ADD CONSTRAINT "autorizaciones_cartera_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_cartera" ADD CONSTRAINT "autorizaciones_cartera_alquiler_id_fkey" FOREIGN KEY ("alquiler_id") REFERENCES "alquileres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_cartera" ADD CONSTRAINT "autorizaciones_cartera_usuario_solicitante_id_fkey" FOREIGN KEY ("usuario_solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_cartera" ADD CONSTRAINT "autorizaciones_cartera_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
