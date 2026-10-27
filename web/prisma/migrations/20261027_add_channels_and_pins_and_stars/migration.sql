-- AlterTable
ALTER TABLE `chats` ADD COLUMN `isChannel` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `channel_metadata` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `isBroadcastOnly` BOOLEAN NOT NULL DEFAULT true,
    `subscriberCount` INTEGER NOT NULL DEFAULT 0,
    `publicSlug` VARCHAR(50) NULL,
    `description` VARCHAR(500) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `idx_channel_chat_id`(`chatId`),
    UNIQUE INDEX `idx_channel_slug`(`publicSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pinned_messages` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `pinnedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `pinnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idx_chat_pinned_unique`(`chatId`, `messageId`),
    INDEX `idx_pinned_chat_time`(`chatId`, `pinnedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `starred_messages` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `starredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idx_user_starred_unique`(`userId`, `messageId`),
    INDEX `idx_starred_user_time`(`userId`, `starredAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `channel_metadata` ADD CONSTRAINT `channel_metadata_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pinned_messages` ADD CONSTRAINT `pinned_messages_pinnedById_fkey` FOREIGN KEY (`pinnedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `starred_messages` ADD CONSTRAINT `starred_messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `starred_messages` ADD CONSTRAINT `starred_messages_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
