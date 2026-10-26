-- AlterTable
ALTER TABLE `users` ADD COLUMN `systemRole` VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN `isSuspended` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `idx_users_system_role` ON `users`(`systemRole`);
CREATE INDEX `idx_users_suspended` ON `users`(`isSuspended`);
CREATE INDEX `idx_users_created` ON `users`(`createdAt` DESC);

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(50) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `ipAddress` VARCHAR(45) NOT NULL,
    `userAgent` TEXT NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_action_created`(`action`, `createdAt` DESC),
    INDEX `idx_audit_user_created`(`userId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
