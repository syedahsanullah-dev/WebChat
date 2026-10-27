-- CreateTable webhooks
CREATE TABLE `webhooks` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `secret` VARCHAR(64) NOT NULL,
    `direction` VARCHAR(20) NOT NULL DEFAULT 'INBOUND',
    `targetUrl` VARCHAR(500) NULL,
    `events` VARCHAR(255) NOT NULL DEFAULT 'message:created',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastFiredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `idx_webhook_token`(`token`),
    INDEX `idx_webhooks_chat`(`chatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable scheduled_reminders
CREATE TABLE `scheduled_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reminderText` VARCHAR(500) NOT NULL,
    `remindAt` DATETIME(3) NOT NULL,
    `isTriggered` BOOLEAN NOT NULL DEFAULT false,
    `triggeredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_reminders_trigger`(`remindAt`, `isTriggered`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable polls
CREATE TABLE `polls` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(500) NOT NULL,
    `allowMultiple` BOOLEAN NOT NULL DEFAULT false,
    `isClosed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_polls_chat_created`(`chatId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable poll_options
CREATE TABLE `poll_options` (
    `id` VARCHAR(191) NOT NULL,
    `pollId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(255) NOT NULL,
    `orderIdx` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable poll_votes
CREATE TABLE `poll_votes` (
    `id` VARCHAR(191) NOT NULL,
    `pollId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idx_poll_option_user_unique`(`pollId`, `optionId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_reminders` ADD CONSTRAINT `scheduled_reminders_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `scheduled_reminders` ADD CONSTRAINT `scheduled_reminders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `polls` ADD CONSTRAINT `polls_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `polls` ADD CONSTRAINT `polls_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poll_options` ADD CONSTRAINT `poll_options_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `polls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `polls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `poll_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
