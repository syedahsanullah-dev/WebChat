-- AlterTable
ALTER TABLE `messages` ADD COLUMN `isE2EE` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `e2eeIv` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `user_public_keys` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `publicKey` TEXT NOT NULL,
    `algorithm` VARCHAR(50) NOT NULL DEFAULT 'ECDH-P256',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idx_user_public_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_public_keys` ADD CONSTRAINT `user_public_keys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
