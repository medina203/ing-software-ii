-- Etapa 6: imágenes de implementos y apariencia configurable por el ADMIN.

-- AlterTable
ALTER TABLE "implementos" ADD COLUMN "imagen_url" VARCHAR(300);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tema" VARCHAR(10) NOT NULL DEFAULT 'claro',
    "tamano_fuente" VARCHAR(10) NOT NULL DEFAULT 'normal',
    "color_primario" VARCHAR(20) NOT NULL DEFAULT 'ambar',
    "imagen_login_url" VARCHAR(300),
    "carrusel" JSONB NOT NULL DEFAULT '[]',
    "actualizado_por" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "configuracion_registro_unico" CHECK ("id" = 1)
);
