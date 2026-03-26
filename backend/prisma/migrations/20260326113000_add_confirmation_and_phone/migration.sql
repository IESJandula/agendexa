-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Appointment`
  ADD COLUMN `confirmation_token` VARCHAR(191) NULL,
  ADD COLUMN `confirmation_expires_at` DATETIME(3) NULL,
  ADD COLUMN `confirmed_at` DATETIME(3) NULL,
  ADD COLUMN `reminder_sent_at` DATETIME(3) NULL,
  MODIFY `status` ENUM('PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CONFIRMATION';

-- CreateIndex
CREATE UNIQUE INDEX `Appointment_confirmation_token_key` ON `Appointment`(`confirmation_token`);
