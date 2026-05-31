-- Migration: produccion changes
-- 1) Add `nombre` to `produccion`
-- 2) Drop `ml_producidos` from `produccion` (if exists)
-- 3) Drop `ml_totales_generados` from `produccion_resultado`
-- 4) Add `produccion_resultado_id` to `productos_finales` and FK

ALTER TABLE produccion
  ADD COLUMN nombre varchar(191) NOT NULL DEFAULT '';

-- If column exists, drop ml_producidos
ALTER TABLE produccion
  DROP COLUMN IF EXISTS ml_producidos;

-- Drop ml_totales_generados from produccion_resultado if exists
ALTER TABLE produccion_resultado
  DROP COLUMN IF EXISTS ml_totales_generados;

-- Add reference from productos_finales to produccion_resultado
ALTER TABLE productos_finales
  ADD COLUMN IF NOT EXISTS produccion_resultado_id varchar(191) NULL;

ALTER TABLE productos_finales
  ADD CONSTRAINT IF NOT EXISTS fk_productos_produccion_resultado FOREIGN KEY (produccion_resultado_id) REFERENCES produccion_resultado(id) ON DELETE RESTRICT;

-- Notes:
-- After applying this migration, run `npx prisma generate` and `npx prisma migrate dev` (or equivalent) to sync Prisma client.
