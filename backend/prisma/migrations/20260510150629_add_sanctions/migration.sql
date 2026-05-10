-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `cancelled_late` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `completed_at` DATETIME(3) NULL,
    ADD COLUMN `no_show_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CONFIRMATION';

-- AlterTable
ALTER TABLE `ClientProfile` ADD COLUMN `is_banned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_no_show_at` DATETIME(3) NULL,
    ADD COLUMN `last_sanction_action` VARCHAR(191) NULL,
    ADD COLUMN `last_sanction_at` DATETIME(3) NULL,
    ADD COLUMN `no_show_count` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ClientNotification` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    INDEX `ClientNotification_user_id_fkey`(`user_id`),
    INDEX `ClientNotification_business_id_fkey`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientNotification` ADD CONSTRAINT `ClientNotification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientNotification` ADD CONSTRAINT `ClientNotification_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
