-- AlterTable
ALTER TABLE `gastos` ADD COLUMN `produccion_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ingredientes` ADD COLUMN `costo_unidad` DECIMAL(14, 2) NULL,
    ADD COLUMN `porcentaje_merma` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `productos_finales` ADD COLUMN `produccion_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `recetas_producto_ingrediente` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `configuracion_sistema` (
    `id` VARCHAR(191) NOT NULL,
    `costoEtiqueta` DECIMAL(14, 2) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produccion` (
    `id` VARCHAR(191) NOT NULL,
    `ml_producidos` DECIMAL(14, 2) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produccion_ingrediente` (
    `produccion_id` VARCHAR(191) NOT NULL,
    `ingrediente_id` VARCHAR(191) NOT NULL,
    `cantidad_usada` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`produccion_id`, `ingrediente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produccion_resultado` (
    `id` VARCHAR(191) NOT NULL,
    `produccion_id` VARCHAR(191) NOT NULL,
    `recipiente_id` VARCHAR(191) NOT NULL,
    `cantidad_envases` INTEGER NOT NULL,
    `ml_totales_generados` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `productos_finales` ADD CONSTRAINT `productos_finales_produccion_id_fkey` FOREIGN KEY (`produccion_id`) REFERENCES `produccion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos` ADD CONSTRAINT `gastos_produccion_id_fkey` FOREIGN KEY (`produccion_id`) REFERENCES `produccion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produccion_ingrediente` ADD CONSTRAINT `produccion_ingrediente_produccion_id_fkey` FOREIGN KEY (`produccion_id`) REFERENCES `produccion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produccion_ingrediente` ADD CONSTRAINT `produccion_ingrediente_ingrediente_id_fkey` FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produccion_resultado` ADD CONSTRAINT `produccion_resultado_produccion_id_fkey` FOREIGN KEY (`produccion_id`) REFERENCES `produccion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produccion_resultado` ADD CONSTRAINT `produccion_resultado_recipiente_id_fkey` FOREIGN KEY (`recipiente_id`) REFERENCES `tipos_recipientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
