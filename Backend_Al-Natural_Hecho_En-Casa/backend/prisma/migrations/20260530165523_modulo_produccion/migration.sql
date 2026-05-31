/*
  Warnings:

  - You are about to drop the column `ml_producidos` on the `produccion` table. All the data in the column will be lost.
  - You are about to drop the column `ml_totales_generados` on the `produccion_resultado` table. All the data in the column will be lost.
  - Added the required column `nombre` to the `produccion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `produccion` DROP COLUMN `ml_producidos`,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `produccion_resultado` DROP COLUMN `ml_totales_generados`;

-- AlterTable
ALTER TABLE `productos_finales` ADD COLUMN `produccion_resultado_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `productos_finales` ADD CONSTRAINT `productos_finales_produccion_resultado_id_fkey` FOREIGN KEY (`produccion_resultado_id`) REFERENCES `produccion_resultado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
