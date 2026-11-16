-- Etapa 3: prefijo único por categoría y consecutivo de seriales.
-- Los seriales existentes se conservan; el contador arranca desde el mayor
-- consecutivo que ya use el prefijo de la categoría.

-- AlterTable
ALTER TABLE "categorias"
ADD COLUMN "prefijo" VARCHAR(10),
ADD COLUMN "ultimo_consecutivo" INTEGER NOT NULL DEFAULT 0;

-- Backfill de prefijos para las categorías conocidas. Las categorías creadas
-- por el usuario reciben un prefijo estable basado en su id.
UPDATE "categorias"
SET "prefijo" = CASE
  WHEN "nombre" = 'Herramientas eléctricas' THEN 'HERR'
  WHEN "nombre" = 'Maquinaria ligera' THEN 'MAQ'
  WHEN "nombre" = 'Andamios y acceso' THEN 'AND'
  WHEN "nombre" = 'Equipos de medición' THEN 'MED'
  WHEN "nombre" = 'Seguridad industrial' THEN 'SEG'
  ELSE 'CAT' || "id"::text
END;

-- Backfill del consecutivo desde los seriales existentes que ya cumplen el
-- formato PREFIJO-###. Los seriales legados con otro formato se ignoran.
UPDATE "categorias" AS c
SET "ultimo_consecutivo" = COALESCE(
  (
    SELECT MAX(
      CASE
        WHEN i."codigo_serie" ~ ('^' || c."prefijo" || '-[0-9]+$')
          THEN SPLIT_PART(i."codigo_serie", '-', 2)::INTEGER
        ELSE 0
      END
    )
    FROM "implementos" AS i
    WHERE i."categoria_id" = c."id"
  ),
  0
);

-- Add constraints
ALTER TABLE "categorias" ALTER COLUMN "prefijo" SET NOT NULL;
CREATE UNIQUE INDEX "categorias_prefijo_key" ON "categorias"("prefijo");
ALTER TABLE "categorias"
ADD CONSTRAINT "categorias_prefijo_formato_check"
CHECK ("prefijo" ~ '^[A-Z][A-Z0-9]{1,9}$');
